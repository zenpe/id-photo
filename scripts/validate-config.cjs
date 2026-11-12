const fs = require('fs');
module.exports = function validateConfig(env = process.env) {
  const errors = [];
  const urls = ['DEVELOPMENT','TRIAL','RELEASE'].map(stage => env['VUE_APP_API_' + stage] || env.VUE_APP_API_BASE_URL);
  urls.forEach((url, index) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password || /your_|your-api|change_me|\.example$|(?:example\.(?:com|org)|ruize\.eu\.org)$/.test(parsed.hostname)) throw Error();
    } catch (_) { errors.push(['development','trial','release'][index] + ': configure your own HTTPS API URL'); }
  });
  const previewBuild = env.IDPHOTO_PREVIEW_BUILD === '1';
  const placeholder = /CHANGE_ME|YOUR_|测试预览|未配置|未填写|PLACEHOLDER|示例|preview@|@invalid$|example\.(?:com|org)$/i;
  for (const key of ['VUE_APP_OPERATOR','VUE_APP_CONTACT']) {
    const value = String(env[key] || '').trim();
    if (!value || /^(CHANGE_ME|YOUR_)/.test(value)) {
      errors.push('Configure ' + key + ' in .env.local');
      continue;
    }
    if (!previewBuild && placeholder.test(value)) {
      errors.push(key + ' is still a placeholder: ' + value + '. Set the real operator/contact, or set IDPHOTO_PREVIEW_BUILD=1 for a local preview build.');
    }
  }
  const brand = JSON.parse(fs.readFileSync('backend/branding.json', 'utf8'));
  for (const key of ['name','shortName','tagline','description','shareDescription']) {
    if (typeof brand[key] !== 'string' || !brand[key].trim()) errors.push('Configure branding.' + key + ' in backend/branding.json');
  }
  const manifest = JSON.parse(fs.readFileSync('src/manifest.json', 'utf8'));
  const appid = manifest['mp-weixin'].appid || '';
  if (!/^wx[0-9a-f]{16}$/.test(appid) || appid === 'wx7db67e2346adbeca') errors.push('Configure your own WeChat AppID in src/manifest.json (upstream AppID cannot be used)');
  if (errors.length) throw Error('Release configuration incomplete:\n' + errors.join('\n'));
};
