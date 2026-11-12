// Run against a built H5 bundle. Platform requests are intercepted locally.
const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../dist/build/h5');
const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.ttf':'font/ttf'};
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { response.writeHead(404).end(); return; }
    response.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream'}).end(data);
  });
});

(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({headless:true, executablePath:process.env.IDPHOTO_BROWSER_EXECUTABLE || undefined});
    const page = await browser.newPage({viewport:{width:390,height:844}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/capabilities') return route.fulfill({json:{version:'test',saveMode:'free',adUnavailable:'free',purchaseEnabled:false,asyncMediaEnabled:false,diagnosticsEnabled:false,rewardedVideoAdUnitId:''}});
      if (url.pathname === '/service-status') return route.fulfill({json:{status:'ok',checked_at:'2026-11-12T00:00:00Z',note:'基础检查',checks:[]}});
      if (url.origin === origin) return route.continue();
      return route.abort();
    });
    const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/pages.json'), 'utf8'));
    const routes = [...config.pages, ...config.subPackages.flatMap(pkg => pkg.pages.map(page => ({...page,path:pkg.root+'/'+page.path})))];
    for (const route of routes) {
      await page.goto(origin + '/#/' + route.path);
      await page.locator('.uni-page-head__title').getByText(route.style.navigationBarTitleText, {exact:true}).waitFor();
      assert(await page.locator('uni-page-body').count(), 'Missing body: ' + route.path);
    }
    await page.goto(origin + '/#/pages/watermark/index');
    const input = page.locator('input');
    await input.fill('Vue 3 水印测试');
    assert.equal(await input.inputValue(), 'Vue 3 水印测试');
    await page.getByText('300 DPI', {exact:true}).click();
    await page.locator('.u-radio').filter({hasText:'300 DPI'}).locator('.u-radio__icon-wrap--checked').waitFor();
    await page.goto(origin + '/#/pages/photo/index');
    await page.getByText('高级设置', {exact:true}).click();
    await page.getByText('美白强度：0', {exact:true}).waitFor();
    assert.deepEqual(errors, []);
    console.log(`${routes.length} H5 pages, input/radio bindings, advanced settings and runtime error checks passed`);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
