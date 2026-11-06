declare const wx: any;
export type VideoResult = 'completed' | 'cancelled' | 'unavailable';

/** SDK adapter: no membership, album or business policy here. */
export async function watchRewardedVideo(unitId: string): Promise<VideoResult> {
  // #ifdef MP-WEIXIN
  if (!unitId || typeof wx === 'undefined' || !wx.createRewardedVideoAd) return 'unavailable';
  let ad: any;
  try { ad = wx.createRewardedVideoAd({ adUnitId: unitId }); } catch (_) { return 'unavailable'; }
  return new Promise<VideoResult>((resolve) => {
    let settled = false;
    let attempting = true;
    const timer = setTimeout(() => finish('unavailable'), 180000);
    const finish = (result: VideoResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ad.offClose(onClose); } catch (_) { /* SDK cleanup */ }
      try { if (ad.offError) ad.offError(onError); } catch (_) { /* SDK cleanup */ }
      try { if (ad.destroy) ad.destroy(); } catch (_) { /* SDK cleanup */ }
      resolve(result);
    };
    const onClose = (result: any) => finish(result && result.isEnded === true ? 'completed' : 'cancelled');
    const onError = () => { if (!attempting) finish('unavailable'); };
    try {
      ad.onClose(onClose);
      if (ad.onError) ad.onError(onError);
      Promise.resolve().then(() => ad.show()).catch(() => {
        if (settled) return;
        return Promise.resolve().then(() => ad.load()).then(() => { if (!settled) return ad.show(); });
      }).then(() => { attempting = false; }).catch(() => finish('unavailable'));
    } catch (_) { finish('unavailable'); }
  });
  // #endif
  // #ifndef MP-WEIXIN
  return 'unavailable';
  // #endif
}
