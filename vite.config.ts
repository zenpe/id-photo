import { defineConfig, loadEnv } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
import validateConfig from './scripts/validate-config.cjs';

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VUE_APP_'), ...process.env };
  if (mode === 'production') validateConfig(env);
  // Keep existing public environment names without exposing server credentials.
  const define = Object.fromEntries(Object.entries(env)
    .filter(([key]) => key.startsWith('VUE_APP_'))
    .map(([key, value]) => ['process.env.' + key, JSON.stringify(value)]));
  for (const key of ['API_DEVELOPMENT','API_TRIAL','API_RELEASE','API_BASE_URL','OPERATOR','CONTACT','BACKEND_AUTH_REQUIRED','PAYMENT_SANDBOX']) {
    define['process.env.VUE_APP_' + key] ??= 'undefined';
  }
  return { plugins: [uni()], define, server: { port: 3000 } };
});
