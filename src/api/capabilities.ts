import { adConfig, baseUrl, capabilities } from '@/config';

let inFlight: Promise<void> | null = null;
let checkedAt = 0;
const reset = () => {
  Object.assign(adConfig, {saveMode:'free', rewardedVideoAdUnitId:'', adUnavailable:'free'});
  Object.assign(capabilities, {purchaseEnabled:false, asyncMediaEnabled:false, diagnosticsEnabled:false, version:''});
};
export function refreshCapabilities(): Promise<void> {
  if (inFlight) return inFlight;
  if (Date.now() - checkedAt < 60000) return Promise.resolve();
  inFlight = new Promise<void>(resolve => {
    uni.request({url:baseUrl + '/capabilities', timeout:8000,
      success: (response: any) => {
        const data = response.data;
        reset();
        if (response.statusCode !== 200 || !data || typeof data.version !== 'string') return;
        Object.assign(capabilities, {version:data.version, purchaseEnabled:data.purchaseEnabled === true,
          asyncMediaEnabled:data.asyncMediaEnabled === true, diagnosticsEnabled:data.diagnosticsEnabled === true});
        if (data.saveMode === 'rewarded' && /^adunit-[a-zA-Z0-9]+$/.test(data.rewardedVideoAdUnitId || '')) {
          Object.assign(adConfig, {saveMode:'rewarded', rewardedVideoAdUnitId:data.rewardedVideoAdUnitId,
            adUnavailable:data.adUnavailable === 'retry' ? 'retry' : 'free'});
        }
      },
      fail: reset,
      complete: () => { checkedAt = Date.now(); resolve(); }
    });
  }).finally(() => { inFlight = null; });
  return inFlight;
}
