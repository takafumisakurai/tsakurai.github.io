(function(w,d){
'use strict';
var KEY='tsakurai.measurement-consent.v1', state='pending', started=false, ready=false, logs=[];
var stream='e7f579e5-810e-4ca5-916d-2b9010378329';
try { var saved=JSON.parse(localStorage.getItem(KEY)||'null'); if(saved && saved.expires>Date.now() && /^(granted|denied)$/.test(saved.value)) state=saved.value; } catch(_) {}
function status(text){d.getElementById('status').textContent=text; d.getElementById('test').disabled=!ready||state!=='granted';}
function log(row){logs.push(row); d.getElementById('results').textContent=JSON.stringify(logs.slice(-20),null,2);}
function clean(value){try{var u=new URL(value,location.href);return /^https?:$/.test(u.protocol)?u.origin+u.pathname:'';}catch(_){return '';}}
function save(value){state=value;try{localStorage.setItem(KEY,JSON.stringify({value:value,expires:Date.now()+180*86400000}));}catch(_) {}}
function consent(value){return w.alloy('setConsent',{consent:[{standard:'Adobe',version:'1.0',value:{general:value}}]});}
function sanitize(content){
  if(state!=='granted') return false;
  var web=content.xdm && content.xdm.web;
  if(web && web.webPageDetails) web.webPageDetails.URL=clean(web.webPageDetails.URL);
  if(web && web.webReferrer) web.webReferrer.URL=clean(web.webReferrer.URL);
  return true;
}
function send(click){
  if(state!=='granted'||!ready) return Promise.resolve();
  var fields={pageName:'tsakurai:lab:web-sdk',pageURL:location.origin+'/lab/web-sdk.html',referrer:'',channel:'lab',events:click?'event160':'event151',eVar151:'lab',eVar152:click?'web_sdk_click':'web_sdk_page_view',eVar154:click?'web-sdk-lab-button':'',eVar157:'2026-09-13.1',eVar158:'true',eVar161:'qa'};
  if(click){fields.linkType='o';fields.linkName='ts:web_sdk_click:web-sdk-lab-button';}
  return w.alloy('sendEvent',{data:{__adobe:{analytics:fields}},renderDecisions:false}).then(function(){log({status:'edge-response-success',fields:fields});},function(){log({status:'edge-response-error',event:fields.eVar152});});
}
function loadScript(src){return new Promise(function(resolve,reject){var s=d.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;d.head.appendChild(s);});}
function start(){
  if(started||state!=='granted') return; started=true; status('Web SDKを読み込んでいます');
  // Register the SDK queue before loading the official library; no SDK is loaded without consent.
  w.__alloyNS=w.__alloyNS||[];w.__alloyNS.push('alloy');w.alloy=function(){var args=arguments;return new Promise(function(resolve,reject){w.alloy.q.push([resolve,reject,args]);});};w.alloy.q=[];
  var debug=new URLSearchParams(location.search).get('ts_debug')==='1' ? loadScript('/js/measurement-debug.js?v=20260913-websdk1').catch(function(){}) : Promise.resolve();
  debug.then(function(){return loadScript('https://cdn1.adoberesources.net/alloy/2.35.1/alloy.min.js');}).then(function(){
    return w.alloy('configure',{orgId:'709F1DFC5B75373A0A495C41@AdobeOrg',datastreamId:stream,defaultConsent:'pending',clickCollectionEnabled:false,context:[],onBeforeEventSend:sanitize});
  }).then(function(){return consent(state==='granted'?'in':'out');}).then(function(){
    ready=true;status(state==='granted'?'計測を許可済み・Labへの送信を開始しました':'計測を停止しました'); return send(false);
  }).catch(function(){ready=false;status('SDKの読み込みまたは設定に失敗しました。再読み込みして確認してください。');log({status:'sdk-start-error'});});
}
d.getElementById('allow').addEventListener('click',function(){save('granted');if(ready){consent('in').then(function(){status('計測を許可しました');});}else start();});
d.getElementById('deny').addEventListener('click',function(){save('denied');status('計測を停止しました');if(started && w.alloy) consent('out').catch(function(){});});
d.getElementById('test').addEventListener('click',function(){send(true);});
status(state==='granted'?'計測を許可済み':state==='denied'?'計測を停止しています':'同意前のため、Adobe SDKを読み込んでいません');
if(state==='granted') start();
})(window,document);
