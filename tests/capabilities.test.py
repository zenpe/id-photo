"""Exercise actual public policy without importing inference dependencies."""
import importlib.util
import os
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('capabilities', Path(__file__).parents[1] / 'backend/hivision-overlay/miniapp_capabilities.py')
policy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(policy)

class PolicyTests(unittest.TestCase):
    def test_free_defaults_and_no_secrets(self):
        with patch.dict(os.environ, {'WECHAT_APP_SECRET':'secret'}, clear=True):
            result = policy.capabilities()
            self.assertEqual(result['saveMode'], 'free')
            self.assertFalse(result['purchaseEnabled'])
            self.assertFalse(result['asyncMediaEnabled'])
            self.assertNotIn('secret', str(result))
            self.assertEqual(policy.public_capabilities().headers['cache-control'], 'no-store')
    def test_rewarded_requires_explicit_slot(self):
        with patch.dict(os.environ, {'IDPHOTO_SAVE_MODE':'rewarded'}, clear=True):
            with self.assertRaises(RuntimeError): policy.capabilities()
    def test_version_changes_and_invalid_policy_rejected(self):
        with patch.dict(os.environ, {}, clear=True):
            original = policy.capabilities()['version']
            os.environ['IDPHOTO_ASYNC_MEDIA_ENABLED']='true'
            self.assertNotEqual(original, policy.capabilities()['version'])
            os.environ['IDPHOTO_AD_UNAVAILABLE']='anything'
            with self.assertRaises(RuntimeError): policy.capabilities()

if __name__ == '__main__': unittest.main()
