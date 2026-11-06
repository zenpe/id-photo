"""Public operational policy. Never expose credentials or arbitrary env values."""
import hashlib
import json
import os
from fastapi import APIRouter
from starlette.responses import JSONResponse

router = APIRouter()

def flag(name):
    return os.environ.get(name, 'false').lower() == 'true'

def async_media_enabled():
    return flag('IDPHOTO_ASYNC_MEDIA_ENABLED')

def capabilities():
    mode = os.environ.get('IDPHOTO_SAVE_MODE', 'free')
    unit = os.environ.get('IDPHOTO_REWARDED_AD_UNIT_ID', '').strip()
    if mode not in ('free', 'rewarded'):
        raise RuntimeError('IDPHOTO_SAVE_MODE must be free or rewarded')
    if mode == 'rewarded' and not unit.startswith('adunit-'):
        raise RuntimeError('rewarded saving requires IDPHOTO_REWARDED_AD_UNIT_ID')
    fallback = os.environ.get('IDPHOTO_AD_UNAVAILABLE', 'free')
    if fallback not in ('free', 'retry'):
        raise RuntimeError('IDPHOTO_AD_UNAVAILABLE must be free or retry')
    result = dict(saveMode=mode, rewardedVideoAdUnitId=unit if mode == 'rewarded' else '',
                  adUnavailable=fallback, purchaseEnabled=flag('IDPHOTO_PAYMENT_ENABLED'),
                  asyncMediaEnabled=async_media_enabled(), diagnosticsEnabled=flag('IDPHOTO_DIAGNOSTICS_ENABLED'))
    result['version'] = hashlib.sha256(json.dumps(result, sort_keys=True).encode()).hexdigest()[:12]
    return result

@router.get('/capabilities')
def public_capabilities():
    return JSONResponse(capabilities(), headers={'Cache-Control': 'no-store'})
