"""Image admission, event-loop responsiveness, and cancellation ownership."""
import asyncio
from pathlib import Path
import sys
import threading
import unittest

sys.path.insert(0, str(Path(__file__).parents[1] / 'backend/hivision-overlay'))
from fastapi import HTTPException
from miniapp_image_runtime import ImageRuntime


class ImageRuntimeTests(unittest.IsolatedAsyncioTestCase):
    async def test_worker_does_not_block_event_loop(self):
        runtime = ImageRuntime(workers=1, capacity=1)
        entered, release = threading.Event(), threading.Event()
        def work():
            entered.set()
            release.wait(timeout=5)
            return 42
        task = asyncio.create_task(runtime.run(work))
        try:
            for _ in range(100):
                if entered.is_set():
                    break
                await asyncio.sleep(.01)
            self.assertTrue(entered.is_set())
            self.assertFalse(task.done())
            # The loop can serve lightweight work while native work is blocked.
            self.assertEqual(await asyncio.wait_for(asyncio.sleep(0, result='healthy'), .2), 'healthy')
            with self.assertRaises(HTTPException) as caught:
                await runtime.run(lambda: None)
            self.assertEqual(caught.exception.status_code, 503)
            task.cancel()
            with self.assertRaises(asyncio.CancelledError):
                await task
            with self.assertRaises(HTTPException):
                await runtime.run(lambda: None)
            release.set()
            for _ in range(100):
                try:
                    result = await runtime.run(lambda: 7)
                    break
                except HTTPException:
                    await asyncio.sleep(.01)
            else:
                self.fail('completed worker did not release its capacity')
            self.assertEqual(result, 7)
        finally:
            release.set()
            runtime.close()

    async def test_exceptions_release_capacity(self):
        runtime = ImageRuntime(workers=1, capacity=1)
        try:
            def fail():
                raise ValueError('test failure')
            with self.assertRaisesRegex(ValueError, 'test failure'):
                await runtime.run(fail)
            self.assertEqual(await runtime.run(lambda: 'recovered'), 'recovered')
        finally:
            runtime.close()


if __name__ == '__main__':
    unittest.main()
