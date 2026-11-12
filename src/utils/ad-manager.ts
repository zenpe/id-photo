import { adConfig } from '@/config';
import { getMembershipStatus } from '@/api/membership';
import { watchRewardedVideo } from './rewarded-video';

export type SaveAccess = 'free' | 'member' | 'ad' | null;
class AdManager {
  private active = false;
  private grants = new Map<string, number>();
  get requiresAd() { return adConfig.saveMode === 'rewarded' && !!adConfig.rewardedVideoAdUnitId; }
  hint(member = false) { return !this.requiresAd ? '免费保存到相册' : member ? '会员免广告保存' : adConfig.adUnavailable === 'free' ? '看完视频后免费保存；广告加载失败时可直接保存' : '看完视频后免费保存'; }
  label(member = false) { return this.requiresAd && !member ? '看视频免费保存' : '保存照片'; }
  async authorize(taskKey = ''): Promise<SaveAccess> {
    if (this.active) return null;
    if (!this.requiresAd) return 'free';
    const now = Date.now();
    this.grants.forEach((expires, key) => { if (expires <= now) this.grants.delete(key); });
    if (taskKey && this.grants.has(taskKey)) return 'ad';
    const policy = { ...adConfig };
    this.active = true;
    try {
      try { if ((await getMembershipStatus()).active === true) return 'member'; }
      catch (_) {
        if (policy.adUnavailable === 'free') return 'free';
        uni.showToast({ title: '会员状态暂无法确认，请重试', icon: 'none' });
        return null;
      }
      const result = await watchRewardedVideo(policy.rewardedVideoAdUnitId);
      if (result === 'completed') {
        if (taskKey) {
          if (this.grants.size >= 50) this.grants.delete(this.grants.keys().next().value!);
          this.grants.set(taskKey, Date.now() + 30 * 60 * 1000);
        }
        return 'ad';
      }
      if (result === 'unavailable' && policy.adUnavailable === 'free') return 'free';
      uni.showToast({ title: result === 'cancelled' ? '请看完广告后再继续' : '广告暂不可用，请稍后重试', icon: 'none' });
      return null;
    } finally { this.active = false; }
  }
  async show(taskKey = '') { return !!(await this.authorize(taskKey)); }
}
export const adManager = new AdManager();
export default adManager;
