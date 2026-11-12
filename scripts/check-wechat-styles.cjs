// Run the WeChat compiler as well as Vite: Vite accepts CSS that WXSS rejects.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const compiler = process.argv[2] || process.env.WECHAT_WCSC_PATH;
if (!compiler || !fs.existsSync(compiler)) {
  console.error('Set WECHAT_WCSC_PATH or pass the path to the WeChat DevTools wcsc executable.');
  process.exit(1);
}
const root = path.resolve(__dirname, '../dist/build/mp-weixin');
if (!fs.existsSync(path.join(root, 'app.json'))) {
  console.error('Run npm run build:mp-weixin first.');
  process.exit(1);
}
function collect(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? collect(file) : file.endsWith('.wxss') ? [file] : [];
  });
}
const files = collect(root);
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'idphoto-wxss-'));
let failed = 0;
try {
  for (const file of files) {
    const relative = path.relative(root, file).split(path.sep).join('/');
    const result = spawnSync(compiler, ['-o', path.join(temporary, 'compiled.js'), relative], {
      cwd: root, encoding: 'utf8', windowsHide: true, timeout: 30000,
    });
    if (result.error || result.status !== 0) {
      failed++;
      console.error(relative, result.error?.message || (result.stderr + result.stdout).trim());
    }
  }
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
console.log(`WeChat WXSS: ${files.length - failed}/${files.length} files passed`);
process.exitCode = failed ? 1 : 0;
