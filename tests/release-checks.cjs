const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { setup } = require('./measurement.test.cjs');
const manifest = JSON.parse(fs.readFileSync('adobe/release-manifest.json','utf8'));
let checks = 0;
function check(name, run) { run(); checks++; console.log('PASS ' + name); }
const routes = manifest.appMeasurementPages;
check('every production route sends exactly one PV with required hit dimensions', () => {
  for (const route of routes) {
    const a = setup(route); a.ready(); a.rerun(); a.start(); a.flush();
    const portfolio = ['/', '/index.html'].includes(route);
    assert.equal(a.scripts.filter(s=>String(s.src).includes('launch-')).length, 1, route);
    assert.equal(a.hits.length, 1, route);
    const hit = a.hits[0];
    assert.equal(hit.account, portfolio ? 'tsisakurai' : 'egeo1xxtsakurailab', route);
    assert.equal(hit.events, 'event151', route);
    assert.equal(hit.eVar151, portfolio ? 'portfolio' : 'lab', route);
    assert.equal(hit.eVar152, 'page_view', route);
    assert.equal(hit.eVar157, manifest.measurementVersion, route);
    assert.equal(hit.eVar158, portfolio ? 'false' : 'true', route);
    assert.equal(hit.eVar161, 'production', route);
    a.w.tsMeasurement.track('page_transition_click',{});
    assert.equal(a.hits[1].account, hit.account, route);
    assert.equal(a.hits[1].events,'event160',route);
  }
});
check('QA and all nonproduction combinations use Lab for every route', () => {
  for (const route of routes) for (const [host,stage,query] of [
    ['www.tsakurai.com','production','?ts_qa=1'],
    ['www.tsakurai.com','development',''],['www.tsakurai.com','staging',''],
    ['localhost','development',''],['localhost','staging','?ts_stage=staging'],
    ['127.0.0.1','production','?ts_stage=production']
  ]) {
    const a=setup(route,query,'granted',host,stage);a.start();a.flush();
    a.w.tsMeasurement.track('page_transition_click',{});
    for(const hit of a.hits){assert.equal(hit.account,'egeo1xxtsakurailab',route);assert.equal(hit.eVar158,'true',route);}
  }
});
check('pending, denied and repeated initialization never load Adobe SDKs or send hits', () => {
  for(const route of routes) for(const consent of ['pending','denied']) {
    const a=setup(route,'',consent);a.ready();a.rerun();a.w.tsMeasurement.track('email_click',{});
    assert.equal(a.scripts.filter(s=>/^https:\/\//.test(s.src||'')).length,0,route);
    assert.equal(a.hits.length,0,route);
    assert.equal(a.w.adobeDataLayer.length,0,route);
    assert.equal(a.d.getElementById('measurement-preferences'),undefined,route);
  }
});
check('public portfolio has Privacy navigation and no Lab status bootstrap', () => {
  assert.match(fs.readFileSync('index.html','utf8'),/<footer\b[^>]*>[\s\S]*href="\/privacy\.html"[\s\S]*<\/footer>/);
  for(const route of ['/','/index.html','/privacy.html']) {
    const a=setup(route);a.ready();
    assert.equal(a.scripts.filter(s=>String(s.src).includes('lab-status.js')).length,0,route);
  }
  for(const route of ['/1.html','/5.html','/pdf_embed/1.html']) {
    const a=setup(route,'','denied');a.ready();
    assert.equal(a.scripts.filter(s=>String(s.src).includes('lab-status.js')).length,1,route);
  }
});
check('every bootstrap reference matches its content hash and there is one adapter per page', () => {
  const hash=crypto.createHash('sha256').update(fs.readFileSync('js/measurement.js')).digest('hex').slice(0,12);
  for(const route of routes){const file=route==='/'?'index.html':route.slice(1);const html=fs.readFileSync(file,'utf8');const tags=html.match(/<script\b[^>]*src=["'][^"']*js\/measurement\.js[^"']*["'][^>]*>/g)||[];assert.equal(tags.length,1,file);assert.ok(tags[0].includes('?v='+hash),file);}
  const sdkHTML=fs.readFileSync('lab/web-sdk.html','utf8');
  assert.ok(!sdkHTML.includes('/js/measurement.js'));
  assert.ok(!/launch-|AppMeasurement\.min/.test(sdkHTML));
});
check('Web SDK datastream and source files match the reviewed release manifest', () => {
  assert.ok(fs.readFileSync('js/web-sdk-lab.js','utf8').includes(manifest.webSDK.datastreamID));
  for(const [file,hash] of Object.entries(manifest.sourceSHA256)){
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash,file);
  }
});
console.log(`${checks} release groups passed; ${routes.length} routes checked. Mock SDK and source checks do not prove HTTP collection or processed reporting.`);
