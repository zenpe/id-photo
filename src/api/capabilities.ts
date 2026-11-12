import { adConfig, baseUrl, capabilities } from '@/config';
import { currentToken, loginToBackend } from '@/utils/auth';

let inFlight: Promise<void> | null = null;
let checkedAt = 0;
const reset = () => {
  Object.assign(adConfig, {saveMode:'free', rewardedVideoAdUnitId:'', adUnavailable:'free'});
  Object.assign(capabilities, {purchaseEnabled:false, asyncMediaEnabled:false, diagnosticsEnabled:false, version:''});
};
function apply(response: any) {
  const data = response?.data;
  reset();
  if (response?.statusCode !== 200 || !data || typeof data.version !== 'string') return;
  Object.assign(capabilities, {version:data.version, purchaseEnabled:data.purchaseEnabled === true,
    asyncMediaEnabled:data.asyncMediaEnabled === true, diagnosticsEnabled:data.diagnosticsEnabled === true});
  if (data.saveMode === 'rewarded' && /^adunit-[a-zA-Z0-9]+$/.test(data.rewardedVideoAdUnitId || '')) {
    Object.assign(adConfig, {saveMode:'rewarded', rewardedVideoAdUnitId:data.rewardedVideoAdUnitId,
      adUnavailable:data.adUnavailable === 'retry' ? 'retry' : 'free'});
  }
}
function authHeader(): Record<string, string> {
  const token = currentToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
export function refreshCapabilities(): Promise<void> {
  if (inFlight) return inFlight;
  if (Date.now() - checkedAt < 60000) return Promise.resolve();
  inFlight = new Promise<void>(resolve => {
    let retried = false;
    let needsLogin = false;
    const finish = () => { checkedAt = Date.now(); resolve(); };
    const send = () => {
      uni.request({
        url: baseUrl + '/capabilities', timeout: 8000, header: authHeader(),
        success: (response: any) => {
          // Deployments predating the public /capabilities route still require a token.
          if (response.statusCode === 401 && !retried) {
            retried = true;
            needsLogin = true;
            reset();
            return;
          }
          apply(response);
        },
        fail: () => { reset(); needsLogin = false; },
        complete: () => {
          if (needsLogin) {
            needsLogin = false;
            loginToBackend().then(send, finish);
            return;
          }
          finish();
        }
      });
    };
    send();
  }).finally(() => { inFlight = null; });
  return inFlight;
}
