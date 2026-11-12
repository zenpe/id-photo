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
  for (const key of ['VUE_APP_OPERATOR','VUE_APP_CONTACT']) {
    if (!env[key] || /^(CHANGE_ME|YOUR_)/.test(env[key])) errors.push('Configure ' + key + ' in .env.local');
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
