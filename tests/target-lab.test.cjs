const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const tick=()=>new Promise(r=>setImmediate(r));
function setup(scenario='ab-manual',value='pending',late=false){
 const calls=[],scripts=[],els={},listeners={};
 for(const id of ['status','results','allow','deny','request','convert','target-primary','proposal-count','render-count','conversion-count','qa-state','segment','product'])els[id]={innerHTML:'default',value:id==='segment'?'alpha':'notebook',addEventListener(n,f){this[n]=f}};
 const proposition={id:'AT:test',scope:'tsakurai-lab-'+scenario,scopeDetails:{activity:{id:'test'}},items:[{schema:'https://ns.adobe.com/personalization/html-content',data:{content:'offer'}}]};
 let release;
 const sdk=(command,options)=>{calls.push({command,options});if(command==='sendEvent'&&options.decisionScopes)return late?new Promise(r=>release=()=>r({propositions:[proposition]})):Promise.resolve({propositions:[proposition]});if(command==='applyPropositions'){els['target-primary'].innerHTML='offer';return Promise.resolve({propositions:options.propositions})}return Promise.resolve({});};
 const w={addEventListener:(n,f)=>listeners[n]=f};
 const d={querySelector:()=>({dataset:{scenario}}),getElementById:id=>els[id]||null,addEventListener:(n,f)=>listeners[n]=f,createElement:()=>({}),head:{appendChild(s){scripts.push(s.src);w.alloy=sdk;s.onload()}}};
 const localStorage={value:JSON.stringify({value,expires:Date.now()+100000}),getItem(){return this.value},setItem(k,v){this.value=v}};
 const location={href:`https://www.tsakurai.com/lab/target/${scenario}.html?private=secret`,origin:'https://www.tsakurai.com',search:'?private=secret'};
 vm.runInNewContext(fs.readFileSync('js/target-lab.js','utf8'),{window:w,document:d,localStorage,location,Date,URL,URLSearchParams,Promise});
 return {calls,scripts,els,listeners,localStorage,release:()=>release()};
}
(async()=>{
 const t=setup();await tick();assert.equal(t.scripts.length,0);t.els.allow.click();await tick();
 assert.equal(t.calls[0].options.datastreamId,'1863354f-3cdb-4ee6-a5e7-0a3dc2832245');assert.equal(t.calls[0].options.clickCollectionEnabled,false);
 assert.deepEqual(t.calls.map(c=>c.command),['configure','setConsent','sendEvent','applyPropositions','sendEvent']);
 assert.equal(t.calls.at(-1).options.xdm._experience.decisioning.propositions[0].scopeDetails.activity.id,'test');
 assert.ok(!JSON.stringify(t.calls).includes('secret'));assert.ok(!JSON.stringify(t.calls).includes('analytics'));
 t.els.convert.click();await tick();assert.equal(t.calls.at(-1).options.xdm._experience.decisioning.propositions[0].scope,'tsakurai-lab-ab-manual-conversion');
 t.localStorage.value=JSON.stringify({value:'denied',expires:Date.now()+10000});t.listeners.storage({key:'tsakurai.measurement-consent.v1'});await tick();const count=t.calls.length;t.els.convert.click();t.els.request.click();await tick();assert.equal(t.calls.length,count);assert.equal(t.els['target-primary'].innerHTML,'default');assert.equal(t.els.convert.disabled,true);
 const race=setup('ab-manual','granted',true);await tick();race.els.deny.click();race.release();await tick();assert.equal(race.calls.filter(c=>c.command==='applyPropositions').length,0);assert.equal(race.els['target-primary'].innerHTML,'default');
 const xt=setup('xt','granted');await tick();assert.equal(xt.calls.find(c=>c.command==='sendEvent').options.xdm.web.webPageDetails.siteSection,'alpha');
 const rec=setup('recommendations','granted');await tick();assert.equal(rec.calls.find(c=>c.command==='sendEvent').options.data.__adobe.target['entity.id'],'ts-lab-notebook');
 for(const file of fs.readdirSync('lab/target').filter(f=>f.endsWith('.html'))){const html=fs.readFileSync('lab/target/'+file,'utf8');assert.ok(html.includes('noindex,nofollow'));assert.ok(!/measurement\.js|launch-|AppMeasurement/.test(html));}
 console.log('PASS Target Lab: consent, isolated routing, render-before-display, conversion scope, cross-tab withdrawal, delayed-response withdrawal, XT, Recommendations and page isolation');
})().catch(e=>{console.error(e);process.exitCode=1});
