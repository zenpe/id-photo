import { reactive } from 'vue';
import branding from '../backend/branding.json';
interface EnvironmentConfig {
  host: string;
}

const defaultHost = '';
const baseApi: { [key: string]: EnvironmentConfig } = {
  development: { host: process.env.VUE_APP_API_DEVELOPMENT || process.env.VUE_APP_API_BASE_URL || defaultHost },
  trial: { host: process.env.VUE_APP_API_TRIAL || process.env.VUE_APP_API_BASE_URL || defaultHost },
  release: { host: process.env.VUE_APP_API_RELEASE || process.env.VUE_APP_API_BASE_URL || defaultHost }
};

declare const wx: any;

function getEnvironment(): string {
  // #ifdef MP-WEIXIN
  try {
    const version = wx.getAccountInfoSync().miniProgram.envVersion;
    if (version === 'develop') return 'development';
    if (version === 'trial' || version === 'release') return version;
  } catch (_) {
    // Older developer tools may not provide account information.
  }
  // #endif
  return process.env.NODE_ENV === 'production' ? 'release' : 'development';
}

export const env = getEnvironment();
export const baseUrl = baseApi[env].host.replace(/\/$/, '');

// Operational policy is public, fetched from the explicitly configured backend.
export const adConfig = reactive({
  rewardedVideoAdUnitId: '',
  saveMode: 'free' as 'free' | 'rewarded',
  adUnavailable: 'free' as 'free' | 'retry'
});
export const capabilities = reactive({purchaseEnabled:false, asyncMediaEnabled:false, diagnosticsEnabled:false, version:''});
export const productConfig = {
  ...branding,
  shareTitle: branding.name + '｜' + branding.shareDescription,
  operator: process.env.VUE_APP_OPERATOR || '运营主体尚未配置',
  contact: process.env.VUE_APP_CONTACT || '联系方式尚未配置'
};
