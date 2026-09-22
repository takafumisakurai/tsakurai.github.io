const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
function setup(path='/', search='', consent='granted',host='www.tsakurai.com',stage='production', options={}){
 const callbacks={},timers=[],scripts=[],hits=[];
 const d={readyState:'loading',referrer:'https://example.org/path?secret=test#private',documentElement:{dataset:{}},addEventListener:(n,cb)=>callbacks[n]=cb,dispatchEvent:()=>{},getElementById:()=>null,createElement:()=>({}),head:{appendChild:e=>scripts.push(e)}};
 function element(tag){return {tag,children:[],style:{},dataset:{},hidden:false,setAttribute(k,v){this[k]=v;},appendChild(child){this.children.push(child);if(tag==='head'&&child.src)scripts.push(child);return child;},insertBefore(child){this.children.unshift(child);},addEventListener(n,cb){this[n]=cb;},querySelector(){return this.children.find(e=>e.tag==='button');}};}
 const main=element('main');d.head=element('head');d.body=element('body');d.body.appendChild(main);d.createElement=element;d.querySelector=selector=>selector==='main'?main:null;d.querySelectorAll=()=>[];d.visibilityState='visible';d.documentElement.scrollHeight=1200;
 const find=(node,id)=>node.id===id?node:node.children.map(e=>find(e,id)).find(Boolean);d.getElementById=id=>find(d.body,id);
 const location={pathname:path,search,hostname:host,origin:'https://'+host,href:'https://'+host+path+search,reload:()=>{location.reloaded=true;}};
 const w={setTimeout:cb=>timers.push(cb),_satellite:{environment:{stage}}};
 w.addEventListener=(n,cb)=>callbacks[n]=cb;w.setInterval=()=>1;w.clearInterval=()=>{};w.innerHeight=800;w.scrollY=0;
 const storage=options.storage || {value:JSON.stringify({value:consent,expires:Date.now()+100000}),getItem(){return this.value},setItem(k,v){this.value=v;}};
 const session=options.session || {};w.sessionStorage={getItem:k=>session[k]||null,setItem:(k,v)=>{session[k]=v},removeItem:k=>{delete session[k]}};
 w.history={state:null,replaceState(st,title,url){if(options.historyFails)throw Error('blocked');const u=new URL(url);location.search=u.search;location.href=u.href;}};
 const scope={window:w,document:d,location,localStorage:storage,URL,URLSearchParams,CustomEvent:function(){},Date,Map,setTimeout:w.setTimeout,clearTimeout:()=>{},_satellite:w._satellite};
 vm.createContext(scope);vm.runInContext(readFileSync('js/measurement.js','utf8'),scope);
 const s={contextData:{},sa(id){this.account=id;},clearVars(){for(const key of Object.keys(this))if(/^(eVar|prop)\d+$|^(contextData|events|products|purchaseID|campaign|pageName|pageURL|channel)$/.test(key))delete this[key];this.contextData={};},t(){this.doPlugins(this);if(!this.abort)hits.push(JSON.parse(JSON.stringify({type:'page',...this})));},tl(o,type,name){this.doPlugins(this);if(!this.abort)hits.push(JSON.parse(JSON.stringify({type,name,...this})));}};
 scope.s=s;vm.runInContext(readFileSync('adobe/analytics-tracker.js','utf8'),scope);
 return {w,d,s,location,hits,scripts,storage,session,callbacks,ready:()=>callbacks.DOMContentLoaded(),rerun:()=>vm.runInContext(readFileSync('js/measurement.js','utf8'),scope),flush:()=>{while(timers.length)timers.shift()();},start:()=>{w.tsMeasurement.connect(s);s.t();s.clearVars();}};
}
let cases=0;
function test(name,fn){fn();cases++;console.log('PASS '+name);}
test('pending consent blocks event storage and SDK load',()=>{const a=setup('/','','pending');assert.equal(a.w.tsMeasurement.track('email_click',{}),'consent-blocked');assert.equal(a.w.adobeDataLayer.length,0);assert.equal(a.scripts.length,0);});
test('initial page view precedes queued clicks, clearVars isolates each hit',()=>{const a=setup();a.w.tsMeasurement.track('email_click',{placement:'contact',destination:'email'});a.start();assert.equal(a.hits.length,1);assert.equal(a.hits[0].events,'event151');a.flush();assert.equal(a.hits.length,2);assert.equal(a.hits[1].events,'event153');assert.equal(a.hits[1].eVar154,'contact');a.w.tsMeasurement.track('section_view',{section:'impact'});assert.equal(a.hits[2].eVar154,'');assert.equal(a.hits[2].events,'event155');});
test('initial page view restores dimensions after delayed SDK work clears scalar variables',()=>{const a=setup('/','?ts_qa=1');a.w.tsMeasurement.connect(a.s);delete a.s.events;for(let i=151;i<=162;i++)delete a.s['eVar'+i];a.s.t();assert.equal(a.hits[0].events,'event151');assert.equal(a.hits[0].eVar152,'page_view');assert.equal(a.hits[0].eVar157,'2026-09-13.1');assert.equal(a.hits[0].eVar158,'true');assert.equal(a.s.trackingServerSecure,'takafumisakurai.data.adobedc.net');assert.equal(a.s.ssl,true);});
test('production, Lab, localhost and QA route to distinct physical suites',()=>{assert.equal(setup().s.account,'tsisakurai');for(const a of [setup('/5.html'),setup('/','?ts_qa=1'),setup('/','','granted','127.0.0.1','development'),setup('/','','granted','www.tsakurai.com','staging')])assert.equal(a.s.account,'egeo1xxtsakurailab');});
test('URL/query, form contents and arbitrary payload fields do not reach Analytics',()=>{const a=setup('/','?email=private%40example.com&cid=approved_campaign');a.start();a.flush();a.w.tsMeasurement.track('pdf_interaction',{document_id:'playground-document',pdf_event:'TEXT_SEARCH',searchTerm:'private@example.com',destination:'private@example.com',pdf_url:'https://private.example/a?token=secret'});const json=JSON.stringify(a.hits);assert.ok(!json.includes('private@example'));assert.ok(!json.includes('?secret'));assert.ok(!json.includes('pdf_url'));assert.equal(a.hits[0].campaign,'approved_campaign');assert.equal(a.hits[0].pageURL,'https://www.tsakurai.com/');});
test('unknown paths have fixed ID without user identifiers',()=>{const a=setup('/person/private@example.com');a.start();assert.equal(a.hits[0].pageName,'tsakurai:not-found');assert.equal(a.hits[0].pageURL,'https://www.tsakurai.com/not-found');});
test('native simulated purchases are Lab-only and repeat clicks are blocked',()=>{const a=setup('/5.html');a.start();a.flush();const fixture={vars:{purchaseID:'LAB-1234567890123'}};assert.equal(a.w.tsMeasurement.track('commerce_purchase_complete',{}, {fixture}),'sdk-called');assert.equal(a.hits[1].events,'event160,purchase');assert.equal(a.hits[1].products,';LAB-SKU-001;1;19800');assert.equal(a.w.tsMeasurement.track('commerce_purchase_complete',{}, {fixture}),'duplicate-blocked');assert.equal(a.hits.length,2);const b=setup();b.start();b.flush();b.w.tsMeasurement.track('commerce_purchase_complete',{}, {fixture});assert.equal(b.hits[1].events,'event160');assert.equal(b.hits[1].products,undefined);});
test('virtual page navigation sends one page hit with route dimension',()=>{const a=setup('/5.html');a.start();a.flush();a.w.tsMeasurement.track('spa_virtual_page_view',{route:'route-a'},{pageView:true});assert.equal(a.hits.length,2);assert.equal(a.hits[1].pageName,'tsakurai:5.html:route-a');assert.equal(a.hits[1].eVar160,'route-a');});
test('declining after consent blocks future sends and reloads SDK',()=>{const a=setup();a.start();a.flush();a.w.tsMeasurement.setConsent('denied');assert.equal(a.location.reloaded,true);assert.equal(a.w.tsMeasurement.track('email_click',{}),'consent-blocked');assert.equal(a.hits.length,1);});
test('once-only scroll events do not double count',()=>{const a=setup();a.start();a.flush();for(let n=0;n<5;n++)a.w.tsMeasurement.track('scroll_depth',{depth:'50'},{once:'depth:50'});assert.equal(a.hits.length,2);assert.equal(a.hits[1].events,'event156');});
test('other-tab withdrawal stops events, clears queued data and reloads loaded SDKs',()=>{
 const a=setup();a.ready();a.w.tsMeasurement.track('email_click',{});a.start();
 a.storage.setItem('',JSON.stringify({value:'denied',expires:Date.now()+100000}));a.callbacks.storage({key:'tsakurai.measurement-consent.v1'});a.flush();
 assert.equal(a.w.tsMeasurement.allowed(),false);assert.equal(a.location.reloaded,true);assert.equal(a.w.adobeDataLayer.length,0);assert.equal(a.hits.length,1);assert.equal(a.w.tsMeasurement.track('email_click',{}),'consent-blocked');
});
test('send-time checks and page restore fail closed for cleared or expired consent',()=>{
 for(const value of [null,'invalid-json',JSON.stringify({value:'granted',expires:1})]){const a=setup();a.start();a.flush();a.storage.value=value;assert.equal(a.w.tsMeasurement.track('email_click',{}),'consent-blocked');assert.equal(a.hits.length,1);assert.equal(a.location.reloaded,true);}
 const a=setup();a.ready();a.storage.value=null;a.callbacks.pageshow();assert.equal(a.w.tsMeasurement.getStatus().consent,'pending');assert.equal(a.d.getElementById('measurement-consent').hidden,false);
});
test('revocation during diagnostic loading prevents deferred Launch loading',()=>{
 const a=setup('/','?ts_qa=1&ts_debug=1');a.ready();const debug=a.scripts.find(s=>String(s.src).includes('measurement-debug'));a.w.tsMeasurement.setConsent('denied');debug.onload();assert.equal(a.scripts.filter(s=>String(s.src).includes('launch-')).length,0);
});
test('QA survives Privacy and home navigation, mirrors URL for published Target condition, and exits explicitly',()=>{
 const session={};for(const [path,query] of [['/','?ts_qa=1'],['/privacy.html',''],['/5.html',''],['/','']]){const a=setup(path,query,'granted','www.tsakurai.com','production',{session});a.start();a.flush();assert.equal(a.s.account,'egeo1xxtsakurailab');assert.equal(a.hits[0].eVar161,'qa');assert.equal(new URLSearchParams(a.location.search).get('ts_qa'),'1');}
 const exit=setup('/','?ts_qa=0','granted','www.tsakurai.com','production',{session});assert.equal(exit.s.account,'tsisakurai');assert.equal(setup('/','','granted','www.tsakurai.com','production',{session}).s.account,'tsisakurai');assert.equal(setup().s.account,'tsisakurai');
});
test('failed QA URL restoration prevents loading legacy Tags with a production Target condition',()=>{const a=setup('/','','granted','www.tsakurai.com','production',{session:{'tsakurai.measurement-qa.v1':'1'},historyFails:true});a.ready();assert.equal(a.scripts.filter(s=>String(s.src).includes('launch-')).length,0);});
console.log(`${cases} tests passed; mock SDK behavior only, not network/reporting proof.`);

module.exports={setup};
