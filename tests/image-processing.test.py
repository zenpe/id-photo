"""Exercise real image decode/render/encode with mocked WeChat moderation."""
import base64
import io
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import AsyncMock, patch

import cv2
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient

ROOT = Path(__file__).parents[1]
DATA = tempfile.TemporaryDirectory()
os.environ.update(IDPHOTO_DATA_DIR=DATA.name, IDPHOTO_AUTH_REQUIRED='true',
                  IDPHOTO_TOKEN_SECRET='image-processing-fixture-' + 'x' * 40,
                  WECHAT_APP_ID='wx0000000000000000', WECHAT_APP_SECRET='test-only',
                  IDPHOTO_PAYMENT_ENABLED='false', IDPHOTO_CONTENT_SECURITY_ENABLED='true')
sys.path[:0] = [str(ROOT / 'backend/hivision-overlay'), str(ROOT / 'backend/hivision-core')]
import deploy_api as api
import miniapp_security
from miniapp_telemetry import writer


def image_bytes(alpha=False):
    image = np.zeros((120, 80, 4 if alpha else 3), dtype=np.uint8)
    image[:, :, 2] = 200
    if alpha:
        image[:, :, 3] = 128
    return cv2.imencode('.png', image)[1].tobytes()


class ImageProcessingTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(api.app)
        self.headers = {'Authorization': 'Bearer ' + miniapp_security.issue_token('image-fixture')}
        self.safety = patch.object(miniapp_security, 'check_image', new=AsyncMock(return_value={'safe': True}))
        self.safety.start()

    def tearDown(self):
        self.safety.stop()
        self.client.close()

    def post(self, route, data=None, alpha=False):
        response = self.client.post(route, headers=self.headers, data=data or {},
                                    files={'input_image': ('fixture.png', image_bytes(alpha), 'image/png')})
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        encoded = body['image_base64']
        raw = base64.b64decode(encoded.split(',', 1)[1])
        image = Image.open(io.BytesIO(raw))
        image.load()
        return body, image, raw

    def test_conversion_preserves_alpha_and_reports_unreachable_target(self):
        _, png, _ = self.post('/convert_image', {'output_format': 'png'}, alpha=True)
        self.assertEqual(png.mode, 'RGBA')
        self.assertEqual(png.getpixel((0, 0))[3], 128)
        _, jpg, _ = self.post('/convert_image', {'output_format': 'jpg'}, alpha=True)
        self.assertEqual(jpg.mode, 'RGB')
        self.assertGreater(jpg.getpixel((0, 0))[1], 100)  # Transparent area composites over white.
        noise = np.random.default_rng(1).integers(0, 256, (256, 256, 3), dtype=np.uint8)
        raw = cv2.imencode('.png', noise)[1].tobytes()
        response = self.client.post('/convert_image', headers=self.headers,
                                    data={'output_format': 'jpg', 'target_kb': 1},
                                    files={'input_image': ('fixture.png', raw, 'image/png')})
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()['target_met'])
        self.assertGreater(response.json()['size_bytes'], 1024)

    def test_background_layout_and_compression_return_decodable_images(self):
        body, image, _ = self.post('/add_background', {'color': 'FFFFFF'}, alpha=True)
        self.assertTrue(body['status'])
        self.assertEqual(image.size, (80, 120))
        body, image, _ = self.post('/generate_layout_photos', {'width': 80, 'height': 120, 'paper_size': '4r'})
        self.assertTrue(body['status'])
        self.assertEqual(image.size, (1795, 1205))
        body, image, _ = self.post('/set_kb', {'kb': 20})
        self.assertTrue(body['status'])
        self.assertEqual(image.size, (80, 120))

    def test_watermark_checks_text_before_real_rendering(self):
        with patch.object(api, 'require_safe_watermark_text', new=AsyncMock()) as safety:
            body, image, _ = self.post('/watermark', {'text': 'Test', 'size': 12})
            self.assertTrue(body['status'])
            self.assertEqual(image.size, (80, 120))
            safety.assert_awaited_once()

    @unittest.skipUnless(Path(api.WEIGHTS['hivision_modnet']).is_file(), 'default model not installed')
    def test_real_idphoto_endpoint(self):
        raw = (ROOT / 'backend/hivision-core/demo/images/test0.jpg').read_bytes()
        response = self.client.post('/idphoto', headers=self.headers, data={'hd': 'true'},
                                    files={'input_image': ('public-fixture.jpg', raw, 'image/jpeg')})
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertTrue(body['status'])
        standard = Image.open(io.BytesIO(base64.b64decode(body['image_base64_standard'].split(',', 1)[1])))
        self.assertEqual(standard.size, (295, 413))
        self.assertTrue(body['image_base64_hd'].startswith('data:image/png;base64,'))


if __name__ == '__main__':
    try:
        unittest.main()
    finally:
        writer.queue.join()
        DATA.cleanup()
