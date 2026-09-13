const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function setup(value='pending'){
 const calls=[],scripts=[],els={};for(const id of ['status','results','allow','deny','test'])els[id]={addEventListener(n,fn){this[n]=fn;}};
 const sdk=(command,options)=>{calls.push({command,options});return Promise.resolve({});};
 const w={};const d={getElementById:id=>els[id],createElement:()=>({}),head:{appendChild(s){scripts.push(s.src);if(s.src.includes('alloy.min.js'))w.alloy=sdk;s.onload();}}};
 const location={href:'https://www.tsakurai.com/lab/web-sdk.html?private_test=secret#private',origin:'https://www.tsakurai.com',search:'?private_test=secret'};
 const localStorage={getItem:()=>JSON.stringify({value,expires:Date.now()+100000}),setItem:()=>{}};
 vm.runInNewContext(fs.readFileSync('js/web-sdk-lab.js','utf8'),{window:w,document:d,location,localStorage,URL,URLSearchParams,Date,Promise});
 return {calls,scripts,els};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 const pending=setup();await tick();assert.equal(pending.scripts.length,0);assert.equal(pending.calls.length,0);console.log('PASS pending consent loads no Adobe SDK');
 pending.els.allow.click();await tick();const cfg=pending.calls.find(c=>c.command==='configure').options;
 assert.equal(cfg.datastreamId,'e7f579e5-810e-4ca5-916d-2b9010378329');assert.equal(cfg.clickCollectionEnabled,false);assert.equal(cfg.context.length,0);assert.equal(pending.calls.filter(c=>c.command==='sendEvent').length,1);assert.ok(!JSON.stringify(pending.calls).includes('private_test'));console.log('PASS one page view uses isolated datastream and strips query');
 const content={xdm:{web:{webPageDetails:{URL:'https://www.tsakurai.com/a?email=secret#x'},webReferrer:{URL:'https://example.org/b?secret=x'}}}};cfg.onBeforeEventSend(content);assert.equal(content.xdm.web.webPageDetails.URL,'https://www.tsakurai.com/a');assert.equal(content.xdm.web.webReferrer.URL,'https://example.org/b');console.log('PASS automatic URL and referrer sanitization');
 pending.els.test.click();await tick();const events=pending.calls.filter(c=>c.command==='sendEvent');assert.equal(events.length,2);assert.equal(events[1].options.data.__adobe.analytics.linkType,'o');assert.equal(events[1].options.data.__adobe.analytics.events,'event160');console.log('PASS one click generates one custom link');
 pending.els.deny.click();await tick();pending.els.test.click();await tick();assert.equal(pending.calls.filter(c=>c.command==='sendEvent').length,2);assert.equal(cfg.onBeforeEventSend({}),false);pending.els.allow.click();await tick();pending.els.test.click();await tick();assert.equal(pending.calls.filter(c=>c.command==='sendEvent').length,3);assert.equal(pending.scripts.length,1);console.log('PASS withdrawal blocks events and reconsent avoids duplicate SDK/pageview');
 console.log('5 Web SDK behavior tests passed; browser HTTP verification is separate.');
})().catch(e=>{console.error(e);process.exitCode=1;});
