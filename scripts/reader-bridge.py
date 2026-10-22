#!/usr/bin/env python3
"""Silvae USB bridge: Kindle highlights; Kobo highlights and reading progress.
Python 3.10+, standard library only. Never writes to the reader or reads ebook files.
Run: python3 reader-bridge.py --config paginae-device.json --path /Volumes/Kindle
Keep this program running to sync on USB connection. Stop with Ctrl+C.
"""
import argparse
import hashlib
import json
import re
import sqlite3
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


def digest(value):
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


def parse_kindle(text):
    documents = {}
    for block in re.split(r'={8,}', text.replace('\r\n', '\n')):
        lines = block.strip().split('\n')
        if len(lines) < 3 or not re.search(r'highlight|evidenziazione|sottolineatura|markierung|surlignement|subrayado|destaque', lines[1], re.I):
            continue
        title = lines[0].lstrip('\ufeff').strip()
        match = re.match(r'^(.*?)\s+\(([^()]+)\)\s*$', title)
        authors = [match[2]] if match else []
        title = match[1] if match else title
        quote = '\n'.join(lines[2:]).strip()
        if not quote or len(quote) > 20000:
            continue
        position = re.split(r'\s*\|\s*', lines[1])[0].strip()[:300]
        external = 'clippings:' + digest(title + '\n' + '\n'.join(authors))
        document = documents.setdefault(external, {'external_id': external, 'title': title[:500], 'authors': authors, 'fragments': []})
        document['fragments'].append({'id': digest(position + '\n' + quote), 'quote': quote, 'position': position})
    return list(documents.values())


def timestamp(value):
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        # Do not assume a time zone and overwrite newer manual progress.
        if parsed.tzinfo is None:
            return None
        if parsed.year < 2000 or parsed.timestamp() > time.time() + 300:
            return None
        return parsed.astimezone(timezone.utc).isoformat()
    except (ValueError, OverflowError):
        return None


def read_kobo(path):
    source = sqlite3.connect(path.resolve().as_uri() + '?mode=ro', uri=True)
    source.execute('PRAGMA query_only=ON')
    # SQLite's backup API makes a coherent local snapshot, including committed WAL.
    with tempfile.TemporaryDirectory(prefix='paginae-kobo-') as folder:
        target = sqlite3.connect(str(Path(folder) / 'snapshot.sqlite'))
        try:
            source.backup(target)
        finally:
            source.close()
        target.row_factory = sqlite3.Row
        try:
            columns = {row['name'] for row in target.execute('PRAGMA table_info(content)')}
            if not {'ContentID', 'Title', 'BookID'}.issubset(columns):
                raise ValueError('Schema Kobo non riconosciuto.')
            selected = [c for c in ['ContentID', 'Title', 'Attribution', '___PercentRead', 'ReadStatus', 'DateLastRead'] if c in columns]
            books = {}
            for row in target.execute('SELECT ' + ','.join('"'+c+'"' for c in selected) + ' FROM content WHERE BookID IS NULL'):
                book = dict(row)
                d = {'external_id': str(book['ContentID']), 'title': str(book.get('Title') or '')[:500], 'authors': [book['Attribution']] if book.get('Attribution') else [], 'fragments': []}
                observed = timestamp(book.get('DateLastRead'))
                percent = book.get('___PercentRead')
                finished = book.get('ReadStatus') == 2
                if observed and (isinstance(percent, (float, int)) or finished):
                    value = 100 if finished else round(float(percent), 2)
                    if 0 <= value <= 100:
                        d.update(percentage=value, observed_at=observed, finished=finished, event_id=digest(d['external_id']+observed+str(value)+str(finished)))
                books[d['external_id']] = d
            annotations = {row['name'] for row in target.execute('PRAGMA table_info(Bookmark)')}
            if not {'BookmarkID', 'VolumeID', 'Text'}.issubset(annotations):
                raise ValueError('Schema annotazioni Kobo non riconosciuto.')
            fields = [c for c in ['BookmarkID', 'VolumeID', 'Text', 'Annotation', 'StartContainerPath', 'StartOffset'] if c in annotations]
            for row in target.execute('SELECT '+','.join('"'+c+'"' for c in fields)+' FROM Bookmark'):
                a = dict(row)
                d = books.get(str(a['VolumeID']))
                if not d:
                    continue
                text, note = (a.get('Text') or '').strip(), (a.get('Annotation') or '').strip()
                if not text and not note:
                    continue
                position = str(a.get('StartContainerPath') or '') + (':'+str(a['StartOffset']) if a.get('StartOffset') is not None else '')
                d['fragments'].append({'id': str(a['BookmarkID']), 'quote': text or note, 'note': note if text else '', 'kind': 'quote' if text else 'note', 'position': position[:300]})
            return list(books.values())
        finally:
            target.close()


def payloads(documents):
    # Bound server requests; a document may span batches without duplicating quotes.
    batch = []
    for document in documents:
        fragments = document.get('fragments', [])
        for index in range(0, max(1, len(fragments)), 20):
            item = {**document, 'fragments': fragments[index:index+20]}
            if len(json.dumps(item).encode()) > 1400000:
                raise ValueError('Un gruppo di annotazioni supera il limite di trasferimento.')
            if batch and (len(batch) >= 32 or len(json.dumps(batch+[item]).encode()) > 1400000):
                yield batch
                batch = []
            batch.append(item)
    if batch:
        yield batch


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError('Reindirizzamento inatteso: trasferimento fermato.')


def load_config(path):
    config = json.loads(path.read_text())
    url = urllib.parse.urlsplit(config.get('url', ''))
    if url.scheme != 'https' or not url.hostname or not url.hostname.endswith('.supabase.co') or url.username or url.password or url.query or url.fragment or url.path not in ('', '/') or url.port not in (None, 443):
        raise ValueError('Endpoint di sincronizzazione non valido.')
    if config.get('kind') not in ('kindle', 'kobo') or not re.fullmatch(r'[a-f0-9]{64}', config.get('token', '')) or not re.fullmatch(r'[a-f0-9-]{36}', config.get('connection', '')) or not config.get('key'):
        raise ValueError('Configurazione dispositivo non valida.')
    return config


def send(config, documents):
    body = json.dumps({'p_connection': config['connection'], 'p_credential': config['token'], 'p_documents': documents}).encode()
    request = urllib.request.Request(config['url'].rstrip('/')+'/rest/v1/rpc/ingest_reader_batch', data=body, headers={'Content-Type': 'application/json', 'apikey': config['key']}, method='POST')
    try:
        with urllib.request.build_opener(NoRedirect).open(request, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        # Never print HTTP bodies containing submitted private reading metadata.
        if error.code in (401, 403):
            raise ValueError('Collegamento non autorizzato. Controlla Dispositivi nell’app.') from None
        raise ValueError(f'Sincronizzazione non riuscita (HTTP {error.code}). Controlla attivazione del database e collegamento dispositivo.') from None


def locate(root, kind):
    if kind == 'kindle':
        candidates = [root / 'documents' / 'My Clippings.txt', root / 'My Clippings.txt']
    else:
        candidates = [root / '.kobo' / 'KoboReader.sqlite', root / 'KoboReader.sqlite']
    return next((p for p in candidates if p.is_file()), None)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, required=True)
    parser.add_argument('--path', type=Path, required=True, help='Volume USB del lettore, oppure cartella locale con il file esportato')
    parser.add_argument('--once', action='store_true')
    parser.add_argument('--interval', type=int, default=60)
    args = parser.parse_args()
    if args.interval < 30:
        parser.error('Intervallo minimo: 30 secondi.')
    try:
        config = load_config(args.config)
    except (ValueError, OSError):
        parser.exit(2, 'Configurazione non valida o non leggibile. Scaricala da Dispositivi.\n')
    previous = None
    print('Ponte USB attivo. I dati verranno inviati al tuo account Silvae. Ctrl+C per fermare.')
    while True:
        try:
            path = locate(args.path, config['kind'])
            if path is None:
                if args.once:
                    parser.exit(1, 'Lettore o file non trovato. Controlla il percorso e la connessione USB.\n')
                previous = None
            else:
                documents = parse_kindle(path.read_text(encoding='utf-8-sig', errors='replace')) if config['kind'] == 'kindle' else read_kobo(path)
                current = digest(json.dumps(documents, sort_keys=True))
                if current != previous:
                    count = 0
                    for batch in payloads(documents):
                        send(config, batch)
                        count += len(batch)
                    previous = current
                    print(f'Dati ricevuti dal lettore: {len(documents)} documenti, {sum(len(d.get("fragments", [])) for d in documents)} annotazioni. Associa i libri in Dispositivi.')
            if args.once:
                break
            time.sleep(args.interval)
        except KeyboardInterrupt:
            break
        except (OSError, ValueError, sqlite3.Error):
            if args.once:
                parser.exit(1, 'Sincronizzazione non riuscita. Verifica rete, dispositivo e attivazione del database. Nessun file del lettore è stato modificato.\n')
            print('Dispositivo o rete non disponibili: riproverò. Se persiste, controlla Dispositivi e la configurazione.')
            time.sleep(args.interval)


if __name__ == '__main__':
    main()
