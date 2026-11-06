// Deliberately excludes developer-tools automation and live payment fixtures.
const {spawnSync}=require('node:child_process');
const tests=['ad-manager','capabilities','task-draft','electronic-storage','loading-flow','camera-flow','service-status','ui-consistency','ui-icons'];
for(const name of tests){
  const result=spawnSync(process.execPath,['tests/'+name+'.test.cjs'],{stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status || 1);
}
