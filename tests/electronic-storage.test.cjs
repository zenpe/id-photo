const assert=require('assert'),fs=require('fs'),vm=require('vm'),ts=require('typescript');
const mod={exports:{}};let stored=[],readFailure=false,writeFailure=false;
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/electronic-photo.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2019}}).outputText,
  {module:mod,exports:mod.exports,Date,Math,console:{error(){}},uni:{getStorageSync:()=>{if(readFailure)throw Error('read failed');return JSON.parse(JSON.stringify(stored));},setStorageSync:(key,value)=>{if(writeFailure)throw Error('full');stored=JSON.parse(JSON.stringify(value));}}});
const manager=mod.exports.ElectronicPhotoManager,photo={name:'fixture',size:'1x1',color:'#fff',hdBase64:'AA==',sdBase64:''};
assert.strictEqual(manager.save(photo),true);assert.strictEqual(manager.save(photo),true);
const snapshot=JSON.stringify(stored);
assert.strictEqual(manager.save(photo),false);assert.strictEqual(JSON.stringify(stored),snapshot,'full library never replaces old photos');
stored=[stored[0]];const remaining=JSON.stringify(stored);readFailure=true;
assert.strictEqual(manager.save(photo),false);assert.strictEqual(JSON.stringify(stored),remaining,'read errors never overwrite existing library');
readFailure=false;writeFailure=true;assert.strictEqual(manager.save(photo),false);assert.strictEqual(JSON.stringify(stored),remaining);
console.log('electronic storage capacity and read/write failure preservation passed');
