"""Bound CPU image work without blocking health, login, or payment requests."""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from functools import partial
import os
import threading

from fastapi import HTTPException


def _positive_int(name, default, maximum):
    value = int(os.environ.get(name, default))
    if not 1 <= value <= maximum:
        raise RuntimeError(f"{name} must be between 1 and {maximum}")
    return value


class ImageRuntime:
    def __init__(self, workers=2, capacity=4):
        if workers < 1 or capacity < workers:
            raise ValueError("capacity must be at least workers")
        self.executor = ThreadPoolExecutor(
            max_workers=workers, thread_name_prefix="image"
        )
        self.slots = threading.BoundedSemaphore(capacity)

    async def run(self, function, *args, **kwargs):
        if not self.slots.acquire(blocking=False):
            raise HTTPException(
                503, "图片处理繁忙，请稍后重试", headers={"Retry-After": "3"}
            )
        try:
            future = self.executor.submit(partial(function, *args, **kwargs))
        except BaseException:
            self.slots.release()
            raise
        # Cancellation of an HTTP request cannot stop a running native model.
        # Retain its slot until the actual worker has finished.
        future.add_done_callback(lambda _: self.slots.release())
        return await asyncio.wrap_future(future)

    def close(self):
        self.executor.shutdown(wait=True, cancel_futures=True)


_workers = _positive_int("IDPHOTO_IMAGE_WORKERS", "2", 8)
_capacity = _positive_int("IDPHOTO_IMAGE_CAPACITY", "4", 32)
runtime = ImageRuntime(_workers, _capacity)
run_image_task = runtime.run
