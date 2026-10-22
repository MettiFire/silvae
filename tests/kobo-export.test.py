import importlib.util
import sqlite3
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('kobo_export', Path(__file__).parent.parent / 'scripts/export-kobo.py')
export = importlib.util.module_from_spec(spec)
spec.loader.exec_module(export)

class KoboExport(unittest.TestCase):
    def test_purchased_and_sideloaded_books_are_exported_readonly(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'KoboReader.sqlite'
            connection = sqlite3.connect(path)
            connection.executescript('''CREATE TABLE content(ContentID TEXT,Title TEXT,Attribution TEXT,BookID TEXT,___PercentRead REAL,ReadStatus INTEGER);
                INSERT INTO content VALUES('store-book','Purchased','Writer',NULL,42,1),('file:///book.epub','Sideloaded','Author',NULL,10,1);
                CREATE TABLE Bookmark(BookmarkID TEXT,VolumeID TEXT,Text TEXT,Annotation TEXT);
                INSERT INTO Bookmark VALUES('one','store-book','Sentence','Thought'),('two','file:///book.epub','','Personal note');''')
            connection.close()
            before = path.read_bytes()
            fragments, progress = export.read_kobo(path)
            self.assertEqual(len(fragments), 2)
            self.assertEqual(fragments[0]['Source'], 'kobo')
            self.assertEqual(fragments[1]['Type'], 'note')
            self.assertEqual([p['Percent Read'] for p in progress], [42, 10])
            self.assertEqual(before, path.read_bytes())

    def test_unknown_schema_fails_instead_of_guessing(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'unknown.sqlite'
            sqlite3.connect(path).close()
            with self.assertRaises(ValueError):
                export.read_kobo(path)

if __name__ == '__main__':
    unittest.main()
