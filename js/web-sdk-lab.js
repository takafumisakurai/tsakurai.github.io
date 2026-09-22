(function(w,d){
'use strict';
var KEY='tsakurai.measurement-consent.v1', state='pending', expires=0, configured=false, started=false, ready=false, logs=[];
var stream='e7f579e5-810e-4ca5-916d-2b9010378329';
function readConsent(){var raw;try{raw=localStorage.getItem(KEY);}catch(_){return null;}try{var saved=JSON.parse(raw||'null');return saved&&saved.expires>Date.now()&&/^(granted|denied)$/.test(saved.value)?saved:{value:'pending',expires:0};}catch(_){return {value:'pending',expires:0};}}
var saved=readConsent();if(saved){state=saved.value;expires=saved.expires;}
function syncConsent(){var current=readConsent();if(!current&&expires&&expires<=Date.now())current={value:'pending',expires:0};if(current&&(current.value!==state||current.expires!==expires))applyConsent(current.value,current.expires);}
function allowed(){syncConsent();return state==='granted';}
w.addEventListener('storage',function(event){if(event.key===KEY||event.key===null)syncConsent();});
w.addEventListener('pageshow',syncConsent);w.addEventListener('focus',syncConsent);d.addEventListener('visibilitychange',syncConsent);
function status(text){d.getElementById('status').textContent=text; d.getElementById('test').disabled=!ready||state!=='granted';}
function log(row){logs.push(row); d.getElementById('results').textContent=JSON.stringify(logs.slice(-20),null,2);}
function clean(value){try{var u=new URL(value,location.href);return /^https?:$/.test(u.protocol)?u.origin+u.pathname:'';}catch(_){return '';}}
function save(value){var until=Date.now()+180*86400000;try{localStorage.setItem(KEY,JSON.stringify({value:value,expires:until}));}catch(_){}applyConsent(value,until);}
function applyConsent(value,until){
  state=value;expires=until;
  status(value==='granted'?'計測を許可しました':'計測を停止しました');
  if(configured&&w.alloy)consent(value==='granted'?'in':'out').catch(function(){status('同意設定を確認できません。再読み込みしてください。');});
  else if(value==='granted')start();
}
function consent(value){return w.alloy('setConsent',{consent:[{standard:'Adobe',version:'1.0',value:{general:value}}]});}
function sanitize(content){
  if(!allowed()) return false;
  var web=content.xdm && content.xdm.web;
  if(web && web.webPageDetails) web.webPageDetails.URL=clean(web.webPageDetails.URL);
  if(web && web.webReferrer) web.webReferrer.URL=clean(web.webReferrer.URL);
  return true;
}
function send(click){
  if(!allowed()||!ready) return Promise.resolve();
  var fields={pageName:'tsakurai:lab:web-sdk',pageURL:location.origin+'/lab/web-sdk.html',referrer:'',channel:'lab',events:click?'event160':'event151',eVar151:'lab',eVar152:click?'web_sdk_click':'web_sdk_page_view',eVar154:click?'web-sdk-lab-button':'',eVar157:'2026-09-13.1',eVar158:'true',eVar161:'qa'};
  if(click){fields.linkType='o';fields.linkName='ts:web_sdk_click:web-sdk-lab-button';}
  return w.alloy('sendEvent',{data:{__adobe:{analytics:fields}},renderDecisions:false}).then(function(){log({status:'edge-response-success',fields:fields});},function(){log({status:'edge-response-error',event:fields.eVar152});});
}
function loadScript(src){return new Promise(function(resolve,reject){var s=d.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;d.head.appendChild(s);});}
function start(){
  if(started||!allowed()) return; started=true; status('Web SDKを読み込んでいます');
  // Register the SDK queue before loading the official library; no SDK is loaded without consent.
  w.__alloyNS=w.__alloyNS||[];w.__alloyNS.push('alloy');w.alloy=function(){var args=arguments;return new Promise(function(resolve,reject){w.alloy.q.push([resolve,reject,args]);});};w.alloy.q=[];
  var debug=new URLSearchParams(location.search).get('ts_debug')==='1' ? loadScript('/js/measurement-debug.js?v=20260913-websdk3').catch(function(){}) : Promise.resolve();
  debug.then(function(){if(!allowed()){started=false;return false;}return loadScript('https://cdn1.adoberesources.net/alloy/2.35.1/alloy.min.js').then(function(){return true;});}).then(function(loaded){
    if(!loaded)return false;
    return w.alloy('configure',{orgId:'709F1DFC5B75373A0A495C41@AdobeOrg',datastreamId:stream,defaultConsent:'pending',clickCollectionEnabled:false,context:[],onBeforeEventSend:sanitize}).then(function(){configured=true;return true;});
  }).then(function(loaded){if(!loaded)return false;return consent(allowed()?'in':'out').then(function(){return true;});}).then(function(loaded){
    if(!loaded)return;
    ready=true;status(state==='granted'?'計測を許可済み・Labへの送信を開始しました':'計測を停止しました'); return send(false);
  }).catch(function(){ready=false;status('SDKの読み込みまたは設定に失敗しました。再読み込みして確認してください。');log({status:'sdk-start-error'});});
}
d.getElementById('allow').addEventListener('click',function(){save('granted');});
d.getElementById('deny').addEventListener('click',function(){save('denied');});
d.getElementById('test').addEventListener('click',function(){send(true);});
status(state==='granted'?'計測を許可済み':state==='denied'?'計測を停止しています':'同意前のため、Adobe SDKを読み込んでいません');
if(state==='granted') start();
w.tsWebSDKLabStatus={getStatus:function(){var row=logs[logs.length-1]||{};return {sdk:'Web SDK',rsid:ready?'egeo1xxtsakurailab':'',expectedRSID:'egeo1xxtsakurailab',libraryEnvironment:'standalone',trafficGroup:'Lab / QA',consent:state,event:row.event||(row.fields&&row.fields.eVar152)||'',result:row.status||'no-events',version:'2026-09-13.1',datastream:stream};}};
})(window,document);
