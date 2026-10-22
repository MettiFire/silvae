import importlib.util
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
module=Path(__file__).resolve().parents[1]/'scripts/kindle-cloud-probe.py'
spec=importlib.util.spec_from_file_location('probe',module);probe=importlib.util.module_from_spec(spec);spec.loader.exec_module(probe)
class KindleProbeTests(unittest.TestCase):
 def fixtures(self):
  return ({'asin':'B012345678','title':'Example','authors':['Writer'],'originType':'PURCHASE'}, {'requestedAsin':'B012345678','lastPageReadData':{'position':44,'syncTime':1760000000000,'deviceName':'Kindle'}}, {'asin':'B012345678','startPosition':1,'endPosition':100})
 def test_estimate_preserves_real_sync_time_and_marks_unverified(self):
  b,d,m=self.fixtures();result=probe.normalize_progress(b,d,m);self.assertEqual(result['percentage_estimate'],45);self.assertFalse(result['verified_against_device']);self.assertEqual(result['observed_at'],'2025-10-09T08:53:20+00:00');self.assertNotIn('cookies',result)
 def test_missing_dates_nan_wrong_asin_and_impossible_position_never_become_progress(self):
  for change in ({'syncTime':0},{'syncTime':9999999999999},{'position':float('nan')},{'position':150},{'position':True}):
   b,d,m=self.fixtures();d['lastPageReadData'].update(change);self.assertRaises(probe.ProbeError,probe.normalize_progress,b,d,m)
  b,d,m=self.fixtures();m['asin']='OTHER';self.assertRaises(probe.ProbeError,probe.normalize_progress,b,d,m)
 def test_only_amazon_api_hosts_receive_credentials_and_jsonp_is_data(self):
  for url in ['http://read.amazon.com/service/x','https://read.amazon.com.evil.test/service/x','https://read.amazon.com@evil.test/service/x','https://evil.test/metadata','https://read.amazon.com/ap/signin']:
   self.assertRaises(probe.ProbeError,probe.amazon_url,url)
  self.assertEqual(probe.decode_json('callback({"endPosition":100});'),{'endPosition':100})
  self.assertRaises(probe.ProbeError,probe.decode_json,'callback({});malicious()')
  self.assertRaises(probe.ProbeError,probe.decode_json,'<html>Sign in</html>')
 def test_cookie_values_with_equals_are_preserved_and_only_required_names_retained(self):
  cookies=probe.parse_cookies('at-main=secret==; x-main=x; session-id=s; ubid-main=u; unrelated=no')
  self.assertEqual(cookies['at-main'],'secret==');self.assertNotIn('unrelated',cookies)
  self.assertRaises(probe.ProbeError,probe.parse_cookies,'at-main=a\r\nHost:evil')
 def test_private_files_no_overwrite_symlinks_or_shared_permissions(self):
  with tempfile.TemporaryDirectory() as f:
   p=Path(f)/'session.json';session={'cookies':{k:'example' for k in probe.REQUIRED_COOKIES},'serial_number':'123','device_type':'456'};probe.save_private(p,session)
   self.assertEqual(p.stat().st_mode&0o777,0o600);self.assertEqual(probe.read_session(p),session);self.assertRaises(probe.ProbeError,probe.save_private,p,session)
   link=Path(f)/'link';link.symlink_to(p);self.assertRaises(probe.ProbeError,probe.read_session,link)
   os.chmod(p,0o644);self.assertRaises(probe.ProbeError,probe.read_session,p)
 def test_real_client_flow_with_fixture_responses_and_no_network(self):
  session={'cookies':{k:'example' for k in probe.REQUIRED_COOKIES},'serial_number':'123','device_type':'456'};client=probe.AmazonClient(session);b,d,m=self.fixtures();d['metadataUrl']='https://read.amazon.com/service/metadata/lookup?asin=B012345678'
  with patch.object(client,'request',side_effect=[{'deviceSessionToken':'private-session'},d,m]) as request:
   client.register_web_reader();result=client.progress(b);self.assertEqual(result['percentage_estimate'],45);self.assertEqual(client.headers['x-adp-session-token'],'private-session');self.assertEqual(request.call_count,3)
if __name__=='__main__':unittest.main()
