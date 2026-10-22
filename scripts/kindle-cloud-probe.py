#!/usr/bin/env python3
"""Experimental, local-only Kindle cloud progress probe. Python 3.10+.
No Amazon credentials or results are sent to Paginae or another proxy.
Setup: python3 kindle-cloud-probe.py --setup
Probe: python3 kindle-cloud-probe.py --asin B012345678 --output kindle-progress.local.json
Uses private Amazon endpoints; compatibility with your account is not guaranteed.
"""
import argparse
import getpass
import http.cookiejar
import json
import math
import os
import re
import stat
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

AMAZON = 'https://read.amazon.com'
DEFAULT_SESSION = Path.home() / '.paginae' / 'kindle-session.json'
REQUIRED_COOKIES = ('ubid-main', 'at-main', 'x-main', 'session-id')


class ProbeError(Exception):
    pass


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ProbeError('Amazon richiede un nuovo accesso o ha cambiato endpoint. Rinnova la configurazione locale.')


def parse_cookies(value):
    if '\r' in value or '\n' in value:
        raise ProbeError('Cookie non validi: incolla il solo valore dell’intestazione Cookie.')
    cookies = {}
    for item in value.strip().split(';'):
        key, separator, content = item.strip().partition('=')
        if separator and key in REQUIRED_COOKIES:
            cookies[key] = content
    if any(not cookies.get(key) for key in REQUIRED_COOKIES):
        raise ProbeError('Mancano cookie necessari. Accedi a read.amazon.com e copia il Cookie della richiesta getDeviceToken.')
    return cookies


def validate_session(value):
    if not isinstance(value, dict) or not isinstance(value.get('cookies'), dict):
        raise ProbeError('Configurazione locale non valida.')
    cookies = parse_cookies('; '.join(f'{k}={v}' for k, v in value['cookies'].items()))
    for field in ('serial_number', 'device_type'):
        if not isinstance(value.get(field), str) or not re.fullmatch(r'[A-Za-z0-9._:-]{1,500}', value[field]):
            raise ProbeError('Parametri getDeviceToken non validi.')
    return {**value, 'cookies': cookies}


def save_private(path, value):
    """Create a new private file; never follow symlinks or overwrite prior results."""
    flags = os.O_CREAT | os.O_EXCL | os.O_WRONLY
    if hasattr(os, 'O_NOFOLLOW'):
        flags |= os.O_NOFOLLOW
    try:
        fd = os.open(path, flags, 0o600)
    except FileExistsError:
        raise ProbeError('Il file esiste già. Scegli un nome nuovo; nessun file è stato sovrascritto.') from None
    with os.fdopen(fd, 'w', encoding='utf-8') as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.write('\n')


def read_session(path):
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode):
        raise ProbeError('La configurazione deve essere un file locale normale, non un collegamento.')
    if os.name != 'nt' and info.st_mode & 0o077:
        raise ProbeError('Configurazione troppo accessibile. Esegui chmod 600 sul file locale.')
    if info.st_size > 32768:
        raise ProbeError('Configurazione troppo grande.')
    return validate_session(json.loads(path.read_text(encoding='utf-8')))


def decode_json(text):
    try:
        result = json.loads(text)
    except ValueError:
        # Parse a JSONP envelope as data, never evaluate JavaScript.
        match = re.fullmatch(r'\s*[A-Za-z_$][\w.$]*\s*\(\s*(\{.*\})\s*\)\s*;?\s*', text, re.S)
        if not match:
            raise ProbeError('Formato della risposta Amazon cambiato o sessione scaduta.') from None
        try:
            result = json.loads(match[1])
        except ValueError:
            raise ProbeError('Metadati Amazon non validi.') from None
    if not isinstance(result, dict):
        raise ProbeError('Risposta Amazon non riconosciuta.')
    return result


def amazon_url(url):
    parts = urllib.parse.urlsplit(url)
    if parts.scheme != 'https' or parts.netloc != 'read.amazon.com' or parts.fragment or parts.username or not (parts.path.startswith('/service/') or parts.path == '/kindle-library/search'):
        raise ProbeError('Endpoint inatteso. Richiesta fermata senza inviare la sessione ad altri host.')
    return url


class AmazonClient:
    def __init__(self, session):
        session = validate_session(session)
        self.session = session
        self.headers = {'Accept': 'application/json', 'User-Agent': 'Paginae-Kindle-Local-Probe/0.1', 'x-amzn-sessionid': session['cookies']['session-id']}
        jar = http.cookiejar.CookieJar()
        for key, value in session['cookies'].items():
            jar.set_cookie(http.cookiejar.Cookie(0, key, value, None, False, 'read.amazon.com', False, False, '/', True, True, None, True, None, None, {}))
        self.jar = jar
        self.opener = urllib.request.build_opener(NoRedirect, urllib.request.HTTPCookieProcessor(jar))

    def request(self, url):
        request = urllib.request.Request(amazon_url(url), headers=self.headers, method='GET')
        try:
            with self.opener.open(request, timeout=20) as response:
                data = response.read(2 * 1024 * 1024 + 1)
                if len(data) > 2 * 1024 * 1024:
                    raise ProbeError('Risposta Amazon oltre il limite previsto.')
                for cookie in self.jar:
                    if cookie.name == 'session-id' and cookie.domain.lstrip('.') in ('read.amazon.com', 'amazon.com'):
                        self.headers['x-amzn-sessionid'] = cookie.value
                return decode_json(data.decode('utf-8'))
        except urllib.error.HTTPError as error:
            if error.code in (401, 403):
                raise ProbeError('Amazon non autorizza la richiesta: sessione scaduta o client locale non accettato. Non inviare i cookie in chat.') from None
            raise ProbeError(f'Amazon risponde HTTP {error.code}. Nessun tentativo di aggirare il blocco è stato eseguito.') from None
        except (urllib.error.URLError, TimeoutError, UnicodeError):
            raise ProbeError('Connessione ad Amazon non riuscita. Verifica rete e disponibilità del servizio.') from None

    def library(self, limit=5):
        books, seen = [], set()
        pagination = None
        for _ in range(10):
            query = {'query': '', 'libraryType': 'BOOKS', 'sortType': 'recency', 'querySize': 50}
            if pagination:
                query['paginationToken'] = pagination
            result = self.request(AMAZON + '/kindle-library/search?' + urllib.parse.urlencode(query))
            rows = result.get('itemsList')
            if not isinstance(rows, list):
                raise ProbeError('Catalogo cloud non riconosciuto: nessun progresso è stato inventato.')
            for book in rows:
                if isinstance(book, dict) and isinstance(book.get('asin'), str) and book['asin'] not in seen:
                    seen.add(book['asin'])
                    books.append(book)
                    if len(books) >= limit:
                        return books
            pagination = result.get('paginationToken')
            if not isinstance(pagination, str) or not pagination:
                return books
        return books

    def register_web_reader(self):
        query = urllib.parse.urlencode({'serialNumber': self.session['serial_number'], 'deviceType': self.session['device_type']})
        result = self.request(AMAZON + '/service/web/register/getDeviceToken?' + query)
        token = result.get('deviceSessionToken')
        if not isinstance(token, str) or not token or len(token) > 10000 or '\n' in token or '\r' in token:
            raise ProbeError('Sessione del lettore web non disponibile. Rinnova l’accesso locale.')
        self.headers['x-adp-session-token'] = token

    def progress(self, book):
        asin = book.get('asin')
        if not isinstance(asin, str) or not re.fullmatch(r'[A-Za-z0-9]{10}', asin):
            raise ProbeError('Identificativo del libro non valido.')
        details = self.request(AMAZON + '/service/mobile/reader/startReading?' + urllib.parse.urlencode({'asin': asin, 'clientVersion': '2000010'}))
        if details.get('isSample'):
            raise ProbeError('Campione escluso dalla prova.')
        metadata_url = details.get('metadataUrl')
        if not isinstance(metadata_url, str):
            raise ProbeError('Metadati del libro non disponibili per questo account.')
        metadata = self.request(metadata_url)
        return normalize_progress(book, details, metadata)


def normalize_progress(book, details, metadata):
    """Same estimate as kindle-api; retain raw positions for a real-device comparison."""
    last = details.get('lastPageReadData')
    if not isinstance(last, dict):
        raise ProbeError('Nessuna posizione sincronizzata disponibile.')
    position, synced = last.get('position'), last.get('syncTime')
    start, end = metadata.get('startPosition', 0), metadata.get('endPosition')
    values = (position, synced, start, end)
    if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in values):
        raise ProbeError('Posizione, data o lunghezza del libro non riconosciute.')
    if position < 0 or start < 0 or end <= 0:
        raise ProbeError('Posizioni del libro non valide.')
    if synced < 946684800000 or synced / 1000 > time.time() + 300:
        raise ProbeError('Nessuna data di sincronizzazione valida: non userò l’ora attuale al suo posto.')
    percentage = (start + position) / end * 100
    if percentage < 0 or percentage > 100:
        raise ProbeError('Posizione incompatibile con la lunghezza del libro. Serve verificare il formato Amazon.')
    asin = book.get('asin')
    if metadata.get('asin') not in (None, asin) or details.get('requestedAsin') not in (None, asin):
        raise ProbeError('I metadati appartengono a un libro diverso.')
    return {
        'external_id': 'asin:' + asin,
        'title': book.get('title', ''),
        'authors': book.get('authors', []),
        'percentage_estimate': round(percentage, 2),
        'observed_at': datetime.fromtimestamp(synced / 1000, timezone.utc).isoformat(),
        'reported_device': last.get('deviceName', ''),
        'position': position,
        'start_position': start,
        'end_position': end,
        'origin_type': book.get('originType', ''),
        'calculation': '(startPosition + lastPageReadData.position) / endPosition * 100; kindle-api estimate',
        'verified_against_device': False,
    }


def setup(path):
    print('Accedi tu a https://read.amazon.com nel browser. Apri Strumenti sviluppatore → Rete e ricarica.')
    print('Seleziona getDeviceToken: copia il valore Cookie dalle intestazioni e i due parametri dalla URL.')
    print('I valori rimangono in un file privato su questo computer. Non incollarli in chat.')
    cookies = parse_cookies(getpass.getpass('Cookie (input nascosto): '))
    serial = getpass.getpass('serialNumber (input nascosto): ').strip()
    device = getpass.getpass('deviceType (input nascosto): ').strip()
    value = validate_session({'cookies': cookies, 'serial_number': serial, 'device_type': device})
    if path.parent == DEFAULT_SESSION.parent:
        path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    save_private(path, value)
    print('Configurazione locale creata. Non è stato inviato alcun dato online.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--session', type=Path, default=DEFAULT_SESSION)
    parser.add_argument('--setup', action='store_true')
    parser.add_argument('--asin', help='ASIN di un libro acquistato su Amazon da verificare')
    parser.add_argument('--limit', type=int, default=5)
    parser.add_argument('--output', type=Path, default=Path('kindle-progress.local.json'))
    args = parser.parse_args()
    if not 1 <= args.limit <= 20:
        parser.error('Usa --limit tra 1 e 20.')
    if args.asin and not re.fullmatch(r'[A-Za-z0-9]{10}', args.asin):
        parser.error('ASIN non valido.')
    try:
        if args.setup:
            setup(args.session)
            return
        client = AmazonClient(read_session(args.session))
        books = [{'asin': args.asin, 'title': '', 'authors': []}] if args.asin else client.library(args.limit)
        client.register_web_reader()
        results, skipped = [], []
        for index, book in enumerate(books):
            if index:
                time.sleep(5)
            try:
                results.append(client.progress(book))
            except ProbeError as error:
                skipped.append({'asin': book.get('asin'), 'reason': str(error)})
                # Do not retry an expired/blocked account for every book.
                if 'non autorizza' in str(error):
                    raise
        save_private(args.output, {'experimental': True, 'results': results, 'skipped': skipped, 'sent_to_app': False})
        print(f'Prova conclusa: {len(results)} progressi stimati, {len(skipped)} libri senza dati utilizzabili.')
        print('Risultato salvato solo sul computer. Confronta la percentuale stimata con quella sul Kindle prima di attivare la sincronizzazione.')
    except KeyboardInterrupt:
        parser.exit(1, '\nProva interrotta.\n')
    except ProbeError as error:
        parser.exit(1, str(error) + '\n')
    except (OSError, ValueError):
        # Do not log exceptions containing local secrets, request headers or response bodies.
        parser.exit(1, 'Prova non completata. Verifica configurazione privata, accesso Amazon, rete e che il file di output non esista già. Non condividere cookie o sessioni in chat.\n')


if __name__ == '__main__':
    main()
