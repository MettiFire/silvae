#!/usr/bin/env python3
"""Export Kobo annotations/progress locally. No network and no device writes.
Usage: python3 scripts/export-kobo.py /path/to/KoboReader.sqlite --output /local/folder
The resulting kobo-fragments.csv can be reviewed in Frammenti; progress CSV is
for inspection only and is not an automatic device/account integration.
"""
import argparse
import csv
import sqlite3
from pathlib import Path


def read_kobo(path):
    connection = sqlite3.connect(Path(path).resolve().as_uri() + '?mode=ro', uri=True)
    connection.row_factory = sqlite3.Row
    try:
        connection.execute('PRAGMA query_only=ON')
        content_columns = {row['name'] for row in connection.execute('PRAGMA table_info(content)')}
        if not {'ContentID', 'Title', 'BookID'}.issubset(content_columns):
            raise ValueError('Schema Kobo non riconosciuto: mancano ContentID, Title o BookID.')
        columns = [c for c in ['ContentID', 'Title', 'Attribution', '___PercentRead', 'ReadStatus', 'DateLastRead'] if c in content_columns]
        books = {row['ContentID']: dict(row) for row in connection.execute('SELECT ' + ','.join('"' + c + '"' for c in columns) + ' FROM content WHERE BookID IS NULL')}
        bookmarks = {row['name'] for row in connection.execute('PRAGMA table_info(Bookmark)')}
        if not {'BookmarkID', 'VolumeID', 'Text'}.issubset(bookmarks):
            raise ValueError('Schema delle annotazioni Kobo non riconosciuto.')
        selected = [c for c in ['BookmarkID', 'VolumeID', 'Text', 'Annotation', 'StartContainerPath', 'StartOffset', 'DateCreated'] if c in bookmarks]
        fragments = []
        for row in connection.execute('SELECT ' + ','.join('"' + c + '"' for c in selected) + ' FROM Bookmark'):
            annotation = dict(row)
            book = books.get(annotation['VolumeID'])
            if not book:
                continue
            text = (annotation.get('Text') or '').strip()
            note = (annotation.get('Annotation') or '').strip()
            if not text and not note:
                continue
            position = str(annotation.get('StartContainerPath') or '')
            if annotation.get('StartOffset') is not None:
                position += ':' + str(annotation['StartOffset'])
            fragments.append({'ID': annotation['BookmarkID'], 'Book Title': book['Title'], 'Author': book.get('Attribution', ''), 'Quote': text or note, 'Note': note if text else '', 'Type': 'quote' if text else 'note', 'Position': position[:300], 'Source': 'kobo'})
        progress = [{'Content ID': b['ContentID'], 'Book Title': b['Title'], 'Author': b.get('Attribution', ''), 'Percent Read': b.get('___PercentRead', ''), 'Read Status': b.get('ReadStatus', ''), 'Last Read': b.get('DateLastRead', '')} for b in books.values()]
        return fragments, progress
    finally:
        connection.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('database')
    parser.add_argument('--output', required=True, help='Cartella locale di destinazione, diversa dal dispositivo')
    args = parser.parse_args()
    source = Path(args.database).resolve()
    destination = Path(args.output).resolve()
    # Never place export files next to or inside the device database folder.
    if destination == source.parent or source.parent in destination.parents:
        parser.error('Scegli una cartella locale esterna alla cartella del database Kobo.')
    fragments, progress = read_kobo(source)
    destination.mkdir(parents=True, exist_ok=True)
    for name, rows, fields in [('kobo-fragments.csv', fragments, ['ID', 'Book Title', 'Author', 'Quote', 'Note', 'Type', 'Position', 'Source']), ('kobo-progress.csv', progress, ['Content ID', 'Book Title', 'Author', 'Percent Read', 'Read Status', 'Last Read'])]:
        with (destination / name).open('w', newline='', encoding='utf-8-sig') as output:
            writer = csv.DictWriter(output, fieldnames=fields)
            writer.writeheader()
            writer.writerows(rows)
    print(f'Esportati {len(fragments)} frammenti e {len(progress)} avanzamenti. Nessun dato inviato online.')


if __name__ == '__main__':
    main()
