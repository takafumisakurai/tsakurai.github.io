const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const manifest=JSON.parse(fs.readFileSync('adobe/release-manifest.json','utf8'));
(async()=>{
  const result={siteCommit:process.env.GITHUB_SHA||'local',checkedAt:new Date().toISOString(),measurementVersion:manifest.measurementVersion,libraries:[]};
  for(const library of manifest.launchLibraries){
    assert.ok(library.url.startsWith('https://assets.adobedtm.com/'));
    const response=await fetch(library.url,{signal:AbortSignal.timeout(30000)});
    assert.equal(response.status,200,library.environment);
    const sha=crypto.createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
    assert.equal(sha,library.sha256,`${library.environment}: published Launch changed; review it and update the manifest before release`);
    result.libraries.push({environment:library.environment,url:library.url,sha256:sha,buildDate:library.buildDate});
  }
  fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/release-pairing.json',JSON.stringify(result,null,2)+'\n');
  console.log('PASS published Development / Staging / Production libraries match reviewed checksums.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
