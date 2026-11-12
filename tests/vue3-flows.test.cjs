const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const vue = require('vue');
const pinia = require('pinia');
const { loadComponent } = require('./helpers/component.cjs');

function loadTs(file, modules) {
  const mod = {exports:{}};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  vm.runInNewContext(code, {module:mod,exports:mod.exports,require:name=>{
    if (name in modules) return modules[name];
    throw Error(name);
  }});
  return mod.exports;
}
const noop = () => {};
const tick = () => new Promise(resolve => setImmediate(resolve));
const drafts = {rememberDraft:async()=>{},loadDraft:()=>null};

async function testPinia() {
  const { usePhotoStore } = loadTs('src/store/modules/photo.ts', {
    vue, pinia, '@/model/PhotoSize': { photoSizes: [{name:'默认',pxWidth:295,pxHeight:413}] }
  });
  const first = usePhotoStore(pinia.createPinia());
  const width = vue.computed(() => first.photoConfig.pxWidth);
  assert.equal(width.value,295);
  first.setPhotoSize({name:'自定义',pxWidth:600,pxHeight:800});
  assert.equal(width.value,600);
  first.setPhotoPath({base64Path:'/tmp/result.png'});
  assert.equal(first.photoPath.base64Path,'/tmp/result.png');
  const second = usePhotoStore(pinia.createPinia());
  assert.equal(second.photoConfig.pxWidth,295,'app instances must not share photo state');
  assert.equal(second.photoPath.base64Path,'');
}

async function testImageHandoffs() {
  for (const kind of ['photo','matting','watermark']) {
    let called = 0, navigation = '', params, submittedPath;
    const process = async (data, name, file) => {
      called++; params=data; submittedPath=file;
      return {image_base64:'result',image_base64_standard:'standard',image_base64_hd:'hd'};
    };
    const Page = loadComponent(`src/pages/${kind}/index.vue`, {
      '@/utils/task-draft':drafts,
      '@/api/photo':{GeneratePhoto:process},
      '@/api/matting':{humanMatting:process},
      '@/api/watermark':{addWatermark:process},
      '@/model/Colors':{Colors:[]},
      '@/utils/image-file':{writeTemporaryImage:async value=>'/tmp/'+value+'.png',removeTemporaryImage:noop}
    }, {showToast:noop,showModal:()=>assert.fail('unexpected processing failure'),navigateTo:options=>{navigation=options.url;options.success?.();}});
    const page = new Page();
    if(kind==='watermark')page.watermarkText='测试水印';
    page.showCamera=true;
    page.onCameraSelect('/tmp/source.jpg');
    await tick();
    assert.equal(called,1,kind+' must invoke processing once');
    assert.equal(submittedPath,'/tmp/source.jpg');
    assert.equal(page.loading,false);
    assert.equal(page.showCamera,false);
    if(kind==='photo'){
      assert.equal(params.width,295);
      assert.equal(params.height,413);
      assert.equal(page.photoStore.photoPath.base64HDPath,'/tmp/hd.png');
      assert.equal(navigation,'/pages/photo/edit');
    } else {
      assert(navigation.startsWith(`/pages/${kind}/result?image=`));
      if(kind==='watermark')assert.equal(params.text,'测试水印');
    }
    page.dispose();
  }
}

async function testMembership() {
  const order = {order_no:'Mfixture',status:'paid',plan_name:'测试会员',price_fen:1200,months:1};
  let fail=false, refunds=0, reason='', modals=0;
  const api = {
    getMembershipOrder:async()=>{if(fail)throw Object.assign(Error('offline'),{statusCode:503});return order;},
    refreshMembershipOrder:async()=>order,
    requestMembershipRefund:async(no,text)=>{assert.equal(no,order.order_no);refunds++;reason=text;return {status:'submitted'};},
    formatFen:String,formatMemberDate:String
  };
  const Page=loadComponent('src/pages/membership/order.vue',{'@/api/membership':api},
    {showToast:noop,showModal:()=>{modals++;},setClipboardData:noop,redirectTo:noop});
  const page=new Page();
  page.hooks.onLoad({order_no:order.order_no});await tick();
  assert.equal(page.order.order_no,order.order_no);
  page.reason='  使用需求变化  ';await page.submitRefund();
  assert.equal(refunds,1);assert.equal(reason,'使用需求变化');
  assert.equal(page.order.refund_request.status,'submitted');
  assert.equal(page.reason,'');assert.equal(page.submitting,false);assert.equal(modals,1);
  fail=true;await page.load();
  assert.equal(page.order,null);assert.equal(page.error,'offline');assert.equal(page.loading,false);
  const invalid=new Page();invalid.hooks.onLoad({});await tick();
  assert(invalid.error.includes('订单编号缺失'));assert.equal(invalid.loading,false);
  page.dispose();invalid.dispose();

  const Orders=loadComponent('src/pages/membership/orders.vue',{'@/api/membership':{
    getMembershipOrders:async()=>{throw Error('network error');},formatFen:String,formatMemberDate:String
  }},{});
  const list=new Orders();await list.load();
  assert.equal(list.error,'network error','request error must update template state');
  assert.equal(list.loading,false);list.dispose();
}

(async()=>{
  await testPinia();await testImageHandoffs();await testMembership();
  console.log('Vue 3 Pinia isolation, three image processing handoffs, order failure and refund flows passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
