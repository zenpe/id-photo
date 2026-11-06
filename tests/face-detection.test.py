"""Exercise detection recovery without ONNX weights, network, or OpenCV.

Compile the actual detector/endpoint functions with injected runtime dependencies
so these regressions also run on machines without the image-processing stack.
"""
import ast
import asyncio
import types
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, Mock

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
CORE = ROOT / 'backend/hivision-core/hivision'
API = ROOT / 'backend/hivision-overlay/deploy_api.py'


def load_functions(path, names, namespace):
    tree = ast.parse(path.read_text(encoding='utf-8'))
    nodes = []
    for node in tree.body:
        if isinstance(node, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)) and node.name in names:
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                node.decorator_list = []
            nodes.append(node)
    if {node.name for node in nodes} != set(names):
        raise AssertionError('Test functions missing from source')
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(path), 'exec'), namespace)


ERRORS = {}
load_functions(CORE / 'error.py', ['FaceError'], ERRORS)
FaceError = ERRORS['FaceError']
EMPTY_ERROR = 'need at least one array to concatenate'


def one_face():
    return (
        np.array([[10., 20., 40., 60., 0.99]]),
        np.array([[15., 30., 22., 17., 28., 30., 30., 40., 50., 50.]]),
    )


class FaceDetectionTests(unittest.TestCase):
    def setUp(self):
        self.original = np.zeros((200, 160, 3), dtype=np.uint8)
        self.resized = self.original[::2, ::2]
        self.ctx = types.SimpleNamespace(origin_image=self.original, face={})
        self.detector = Mock()
        self.env = {
            'mtcnn': self.detector, 'np': np, 'Context': object, 'FaceError': FaceError,
            'cv2': types.SimpleNamespace(resize=Mock(return_value=self.resized), INTER_AREA=3),
        }
        load_functions(CORE / 'creator/face_detector.py', ['_detect_mtcnn', 'detect_face_mtcnn'], self.env)

    def detect(self):
        self.env['detect_face_mtcnn'](self.ctx)

    def test_empty_candidates_retry_original_and_recover(self):
        self.detector.detect.side_effect = [ValueError(EMPTY_ERROR), one_face()]
        self.detect()
        self.assertEqual(self.detector.detect.call_count, 2)
        self.assertIs(self.detector.detect.call_args_list[0].args[0], self.resized)
        self.assertIs(self.detector.detect.call_args_list[1].args[0], self.original)
        self.assertEqual(self.ctx.face['rectangle'], (10., 20., 31., 41.))
        self.assertEqual(self.ctx.face['roll_angle'], 0.)

    def test_empty_candidates_on_both_attempts_raise_face_error(self):
        self.detector.detect.side_effect = ValueError(EMPTY_ERROR)
        with self.assertRaises(FaceError) as caught:
            self.detect()
        self.assertEqual(caught.exception.face_num, 0)
        self.assertEqual(self.detector.detect.call_count, 2)

    def test_normal_empty_result_also_retries(self):
        self.detector.detect.side_effect = [([], []), one_face()]
        self.detect()
        self.assertEqual(self.detector.detect.call_count, 2)

    def test_valid_scaled_detection_keeps_coordinate_conversion(self):
        self.detector.detect.return_value = one_face()
        self.detect()
        self.detector.detect.assert_called_once()
        self.assertEqual(self.ctx.face['rectangle'], (20., 40., 61., 81.))

    def test_multiple_faces_are_rejected(self):
        self.detector.detect.return_value = (np.zeros((2, 5)), np.zeros((2, 10)))
        with self.assertRaises(FaceError) as caught:
            self.detect()
        self.assertEqual(caught.exception.face_num, 2)

    def test_other_detector_errors_are_not_hidden(self):
        for error in (ValueError('invalid model dimensions'), RuntimeError('model failure')):
            with self.subTest(error=error):
                self.detector.detect.side_effect = error
                with self.assertRaises(type(error)) as caught:
                    self.detect()
                self.assertIs(caught.exception, error)


class FaceFailureResponseTests(unittest.IsolatedAsyncioTestCase):
    async def test_endpoints_return_actionable_failure_without_encoding_images(self):
        for endpoint in ('idphoto_inference', 'idphoto_crop_inference', 'human_matting_inference'):
            for count in (0, 2):
                with self.subTest(endpoint=endpoint, count=count):
                    env = {
                        'FaceError': FaceError, 'UploadFile': object,
                        'Form': lambda *args, **kwargs: None, 'File': lambda *args, **kwargs: None,
                        'asyncio': asyncio, 'read_image': AsyncMock(return_value='image'),
                        'cv2': types.SimpleNamespace(IMREAD_COLOR=1, IMREAD_UNCHANGED=-1,
                                                     COLOR_BGR2RGB=2, cvtColor=lambda image, _: image),
                        'require_portrait_size': Mock(), 'validate_matting_model': Mock(),
                        'run_creator': Mock(side_effect=FaceError('face count mismatch', count)),
                        'save_image_dpi_to_bytes': Mock(),
                    }
                    load_functions(API, ['face_error_response', endpoint], env)
                    result = await env[endpoint](height=413, width=295) if endpoint != 'human_matting_inference' else await env[endpoint]()
                    self.assertFalse(result['status'])
                    self.assertEqual(result['face_count'], count)
                    self.assertIn('清晰正脸' if count == 0 else '多张人脸', result['message'])
                    env['save_image_dpi_to_bytes'].assert_not_called()


if __name__ == '__main__':
    unittest.main()
