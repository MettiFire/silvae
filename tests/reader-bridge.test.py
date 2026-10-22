import importlib.util
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
module=Path(__file__).resolve().parents[1]/'scripts/reader-bridge.py'
spec=importlib.util.spec_from_file_location('bridge',module)
bridge=importlib.util.module_from_spec(spec);spec.loader.exec_module(bridge)
class BridgeTests(unittest.TestCase):
 def test_kindle_store_and_sideload_quotes_have_stable_ids_and_no_fake_progress(self):
  text='Example (Writer)\n- Your Highlight on page 2 | Added today\n\nWords\n==========\nMy document (Author)\n- La tua evidenziazione alla posizione 45 | Aggiunto\n\nOther words\n==========\nExample (Writer)\n- Your Note on page 2 | Added today\n\nNote\n=========='
  docs=bridge.parse_kindle(text);self.assertEqual(len(docs),2);self.assertNotIn('percentage',docs[0]);self.assertEqual(docs,bridge.parse_kindle(text));self.assertEqual(len(docs[0]['fragments']),1)
 def test_kobo_readonly_store_and_sideload_with_timestamp_validation(self):
  with tempfile.TemporaryDirectory() as folder:
   path=Path(folder)/'KoboReader.sqlite';db=sqlite3.connect(path)
   db.executescript('CREATE TABLE content(ContentID TEXT,Title TEXT,BookID TEXT,Attribution TEXT,___PercentRead REAL,ReadStatus INTEGER,DateLastRead TEXT);CREATE TABLE Bookmark(BookmarkID TEXT,VolumeID TEXT,Text TEXT,Annotation TEXT);')
   db.executemany('INSERT INTO content VALUES(?,?,NULL,?,?,?,?)',[('store','Book','Writer',34,1,'2026-01-01T00:00:00Z'),('file:///local.epub','Local','Writer',15,1,'invalid')]);db.execute("INSERT INTO Bookmark VALUES('id','file:///local.epub','Words','Thought')");db.commit();db.close()
   before=path.read_bytes();docs=bridge.read_kobo(path);self.assertEqual(path.read_bytes(),before);self.assertEqual(docs[0]['percentage'],34);self.assertNotIn('percentage',docs[1]);self.assertEqual(docs[1]['fragments'][0]['note'],'Thought')
 def test_batches_limits_configuration_and_download_match(self):
  d={'external_id':'a','fragments':[{'id':str(i),'quote':'text'} for i in range(45)]};b=list(bridge.payloads([d]));self.assertEqual([len(x['fragments']) for x in b[0]],[20,20,5]);self.assertIsNone(bridge.timestamp('2026-01-01T00:00:00'));self.assertIsNone(bridge.timestamp('2999-01-01T00:00:00Z'))
  self.assertEqual(module.read_bytes(),(module.parents[1]/'public/downloads/reader-bridge.py').read_bytes())
  with tempfile.TemporaryDirectory() as folder:
   p=Path(folder)/'config.json';p.write_text(json.dumps({'url':'http://example.test'}));self.assertRaises(ValueError,bridge.load_config,p)
if __name__=='__main__':unittest.main()
