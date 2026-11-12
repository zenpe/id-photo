import { createSSRApp } from 'vue';
import { createPinia } from 'pinia';
import { mount$u, mixin } from 'uview-plus';
import App from './App.vue';
import { installSystemInfoCompat } from './utils/system-info';

export function createApp() {
  // uview-plus 的 mount$u() 会调用已废弃的 getSystemInfoSync，先装好兼容层避免告警。
  installSystemInfoCompat();
  const app = createSSRApp(App);
  app.use(createPinia());
  // easycom imports the components each page actually uses, including on H5.
  mount$u();
  app.mixin(mixin);
  return { app };
}
