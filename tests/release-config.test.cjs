const assert = require('assert');
const validateConfig = require('../scripts/validate-config.cjs');

const valid = {
  VUE_APP_API_BASE_URL: 'https://api.idphoto-release.cn',
  VUE_APP_OPERATOR: '一寸不差工作室',
  VUE_APP_CONTACT: 'support@idphoto-release.cn',
};

// A complete, real-looking release configuration must pass.
assert.doesNotThrow(() => validateConfig({ ...valid }));

// Placeholder operator / contact values must never reach a release package.
for (const [key, value] of [
  ['VUE_APP_OPERATOR', '测试预览（未配置运营主体）'],
  ['VUE_APP_OPERATOR', 'CHANGE_ME'],
  ['VUE_APP_OPERATOR', 'YOUR_OPERATOR'],
  ['VUE_APP_CONTACT', 'preview@invalid'],
  ['VUE_APP_CONTACT', 'someone@example.com'],
]) {
  assert.throws(
    () => validateConfig({ ...valid, [key]: value }),
    err => /placeholder|Configure VUE_APP_/i.test(err.message),
    key + ' = ' + value + ' should be rejected',
  );
}

// Explicit preview builds may keep placeholders, but every other check still applies.
assert.doesNotThrow(() => validateConfig({
  ...valid,
  VUE_APP_OPERATOR: '测试预览（未配置运营主体）',
  VUE_APP_CONTACT: 'preview@invalid',
  IDPHOTO_PREVIEW_BUILD: '1',
}));
assert.throws(
  () => validateConfig({ ...valid, VUE_APP_API_BASE_URL: 'https://api.example.com', IDPHOTO_PREVIEW_BUILD: '1' }),
  /HTTPS API URL/,
);

// Missing/invalid values keep the original behaviour.
assert.throws(() => validateConfig({ ...valid, VUE_APP_OPERATOR: '' }), /Configure VUE_APP_OPERATOR/);
assert.throws(() => validateConfig({ ...valid, VUE_APP_CONTACT: '' }), /Configure VUE_APP_CONTACT/);
assert.throws(() => validateConfig({ ...valid, VUE_APP_API_BASE_URL: 'http://api.idphoto-release.cn' }), /HTTPS API URL/);

console.log('release config placeholder guard and preview override passed');
