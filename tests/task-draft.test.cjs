const assert=require('assert'),fs=require('fs'),vm=require('vm'),ts=require('typescript');
const files=new Set(['/camera/source.jpg']),storage=new Map();let full=false;
const disk={accessSync:path=>{if(!files.has(path))throw Error('missing');},
  copyFile:options=>{if(!files.has(options.srcPath))return options.fail();files.add(options.destPath);options.success();},
  unlink:options=>{files.delete(options.filePath);if(options.success)options.success();},
  readdir:options=>options.success({files:[...files].filter(p=>p.startsWith('/user/')).map(p=>p.slice(6))})};
const mod={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/task-draft.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2019}}).outputText,
  {module:mod,exports:mod.exports,wx:{env:{USER_DATA_PATH:'/user'}},Date,Math,Promise,Set,Error,
    uni:{getFileSystemManager:()=>disk,getStorageSync:key=>storage.get(key),setStorageSync:(key,value)=>{if(full)throw Error('full');storage.set(key,value);},removeStorageSync:key=>storage.delete(key)}});
(async()=>{
  const drafts=mod.exports;
  await drafts.saveDraft('photo',{source:'/camera/source.jpg'},{model:'standard'});
  const original=drafts.loadDraft('photo');assert(original.files.source.startsWith('/user/idphoto-draft-'));
  assert(!JSON.stringify(original).includes('base64'));
  full=true; await assert.rejects(drafts.saveDraft('photo',{source:'/camera/source.jpg'},{model:'other'}));full=false;
  assert.strictEqual(drafts.loadDraft('photo').state.model,'standard','storage failure preserves previous draft');
  assert.strictEqual(files.size,2,'failed replacement cleans new files');
  original.expiresAt=1;assert.strictEqual(drafts.loadDraft('photo'),null);assert(files.has('/camera/source.jpg'),'never remove source owned by camera');
  await drafts.saveDraft('convert',{source:'/camera/source.jpg'},{format:'png'});
  files.delete(drafts.loadDraft('convert').files.source);assert.strictEqual(drafts.loadDraft('convert'),null);
  await drafts.saveDraft('matting',{source:'/camera/source.jpg'},{model:'standard'});
  await drafts.clearDrafts();assert.strictEqual(storage.size,0);assert.strictEqual(files.size,1);
  console.log('draft persistence, transactional failure, expiry, missing files and bounded cleanup passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
