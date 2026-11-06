"""Real inference smoke test; run explicitly with a public or consented fixture."""
import argparse
import time
import cv2
from deploy_api import run_creator

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('image', help='A clear single-person front-facing public fixture')
    args = parser.parse_args()
    image = cv2.imread(args.image)
    if image is None:
        raise SystemExit('Cannot decode fixture')
    started = time.monotonic()
    result = run_creator(image, matting_model='hivision_modnet', face_model='mtcnn', size=(413,295))
    assert result.standard is not None and result.standard.size > 0, 'Missing generated image'
    print(f'Inference smoke passed in {time.monotonic()-started:.2f}s (no image written)')

if __name__ == '__main__': main()
