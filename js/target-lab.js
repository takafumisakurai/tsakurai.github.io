(function (w, d) {
'use strict';
var KEY='tsakurai.measurement-consent.v1', STREAM='1863354f-3cdb-4ee6-a5e7-0a3dc2832245';
var scenario=d.querySelector('main[data-scenario]').dataset.scenario;
var TYPES=['ab-manual','auto-allocate','auto-target','xt','mvt','ap','recommendations'];
if(TYPES.indexOf(scenario)<0)return;
var state='pending',expires=0,started=false,configured=false,ready=false,busy=false,revision=0,logs=[],conversions=0,displayed=[];
var scope='tsakurai-lab-'+scenario;
var primary=d.getElementById('target-primary'),secondary=d.getElementById('target-secondary');
var original=primary.innerHTML,originalSecondary=secondary?secondary.innerHTML:'';
function el(id){return d.getElementById(id);}
function log(type,details){logs.push({time:new Date().toISOString(),type:type,details:details||{}});el('results').textContent=JSON.stringify(logs.slice(-20),null,2);}
function controls(){el('request').disabled=!ready||state!=='granted'||busy;el('convert').disabled=!ready||state!=='granted'||busy||!displayed.length;}
function status(text){el('status').textContent=text;controls();}
function read(){try{var c=JSON.parse(localStorage.getItem(KEY)||'null');return c&&c.expires>Date.now()&&/^(granted|denied)$/.test(c.value)?c:{value:'pending',expires:0};}catch(_){return null;}}
function sync(){var c=read();if(!c&&expires&&expires<=Date.now())c={value:'pending',expires:0};if(c&&(c.value!==state||c.expires!==expires))applyConsent(c.value,c.expires);}
function allowed(){sync();return state==='granted';}
function consent(value){return w.alloy('setConsent',{consent:[{standard:'Adobe',version:'1.0',value:{general:value}}]});}
function reset(){displayed=[];primary.innerHTML=original;if(secondary)secondary.innerHTML=originalSecondary;el('proposal-count').textContent='0';el('render-count').textContent='0';controls();}
function applyConsent(value,until){state=value;expires=until;revision++;reset();status(value==='granted'?'計測を許可しました':'計測を停止しました');if(configured){consent(value==='granted'?'in':'out').then(function(){if(allowed())request();}).catch(function(){status('同意設定を確認できません。再読み込みしてください。');});}else if(value==='granted')start();}
function save(value){var until=Date.now()+180*86400000;try{localStorage.setItem(KEY,JSON.stringify({value:value,expires:until}));}catch(_){}applyConsent(value,until);}
function clean(value){try{var url=new URL(value,location.href);return /^https?:$/.test(url.protocol)?url.origin+url.pathname:'';}catch(_){return '';}}
function sanitize(content){if(!allowed())return false;var web=content.xdm&&content.xdm.web;if(web&&web.webPageDetails)web.webPageDetails.URL=clean(web.webPageDetails.URL);if(web&&web.webReferrer)web.webReferrer.URL='';return true;}
function xdm(){return {web:{webPageDetails:{URL:clean(location.href),name:'tsakurai:lab:target:'+scenario,siteSection:scenario==='xt'?el('segment').value:'target-lab'},webReferrer:{URL:''}}};}
function targetData(){var params={};if(scenario==='recommendations'){var id=el('product').value,names={notebook:'Lab Notebook',mug:'Lab Mug',bag:'Lab Bag',pen:'Lab Pen'};if(!names[id])id='notebook';params={'entity.id':'ts-lab-'+id,'entity.name':names[id],'entity.categoryId':'tsakurai-target-lab','entity.pageUrl':location.origin+'/lab/target/recommendations.html','entity.value':'100','entity.inventory':'100','entity.brand':'SignalScope Lab','entity.message':'Validation item'};}return {__adobe:{target:params}};}
function summary(p){return {scope:p.scope,renderAttempted:!!p.renderAttempted,items:(p.items||[]).map(function(i){var m=i.meta||{};return {schema:i.schema,activity:m['activity.id']||'',experience:m['experience.id']||'',offer:m['offer.name']||''};})};}
function displayXdm(propositions){var payload=xdm();payload.eventType='decisioning.propositionDisplay';payload._experience={decisioning:{propositions:propositions.map(function(p){return {id:p.id,scope:p.scope,scopeDetails:p.scopeDetails};}),propositionEventType:{display:1}}};return payload;}
function request(){
 if(!ready||busy||!allowed())return Promise.resolve();busy=true;reset();status('Targetへ配信をリクエストしています');var rev=revision;
 var scopes=scenario==='mvt'?['__view__']:scenario==='ap'?[scope,scope+'-secondary']:[scope];
 return w.alloy('sendEvent',{xdm:xdm(),data:targetData(),decisionScopes:scopes,renderDecisions:scenario==='mvt'}).then(function(result){
  if(!allowed()||revision!==rev){reset();return;}
  var props=(result.propositions||[]).filter(function(p){return scopes.indexOf(p.scope)>=0;});
  el('proposal-count').textContent=String(props.length);log('decision-response',props.map(summary));
  if(scenario==='mvt'){displayed=props.filter(function(p){return p.renderAttempted;});return;}
  var metadata={};metadata[scope]={selector:'#target-primary',actionType:'setHtml'};if(secondary)metadata[scope+'-secondary']={selector:'#target-secondary',actionType:'setHtml'};
  var htmlProps=props.filter(function(p){return (p.items||[]).some(function(i){return i.schema==='https://ns.adobe.com/personalization/html-content';});});
  if(!htmlProps.length)return;
  return w.alloy('applyPropositions',{propositions:htmlProps,metadata:metadata}).then(function(rendered){
   if(!allowed()||revision!==rev){reset();return;}
   displayed=rendered.propositions||[];
   // applyPropositions returns only the propositions it rendered. Notify display after rendering completes.
   if(displayed.length)return w.alloy('sendEvent',{xdm:displayXdm(displayed)}).then(function(){log('display-notification-success',{count:displayed.length});});
  });
 }).then(function(){if(!allowed()||revision!==rev)return;el('render-count').textContent=String(displayed.length);status(displayed.length?'Targetの体験を表示しました':'該当する配信はありません。アクティビティの状態・条件・QA指定を確認してください。');}).catch(function(){log('request-error');status('配信または表示通知に失敗しました。再確認してください。');}).finally(function(){busy=false;controls();});
}
function convert(){
 if(!allowed()||!ready||busy||!displayed.length)return;busy=true;controls();
 var payload=xdm();payload.eventType='decisioning.propositionDisplay';payload._experience={decisioning:{propositions:[{scope:scope+'-conversion'}],propositionEventType:{display:1}}};
 w.alloy('sendEvent',{xdm:payload}).then(function(){conversions++;el('conversion-count').textContent=String(conversions);log('conversion-response-success',{scope:scope+'-conversion'});status('成果イベントへのEdge応答を確認しました');}).catch(function(){log('conversion-response-error');status('成果送信に失敗しました');}).finally(function(){busy=false;controls();});
}
function start(){
 if(started||!allowed())return;started=true;status('Adobe Web SDKを読み込んでいます');
 w.__alloyNS=w.__alloyNS||[];w.__alloyNS.push('alloy');w.alloy=function(){var args=arguments;return new Promise(function(resolve,reject){w.alloy.q.push([resolve,reject,args]);});};w.alloy.q=[];
 var script=d.createElement('script');script.src='https://cdn1.adoberesources.net/alloy/2.35.1/alloy.min.js';
 script.onload=function(){w.alloy('configure',{orgId:'709F1DFC5B75373A0A495C41@AdobeOrg',datastreamId:STREAM,defaultConsent:'pending',clickCollectionEnabled:false,context:[],onBeforeEventSend:sanitize}).then(function(){configured=true;return consent(allowed()?'in':'out');}).then(function(){ready=true;controls();if(allowed())request();}).catch(function(){status('SDKの初期設定に失敗しました。再読み込みしてください。');log('sdk-error');});};
 script.onerror=function(){started=false;status('SDKを読み込めません。再度許可ボタンを押してください。');log('sdk-load-error');};d.head.appendChild(script);
}
w.addEventListener('storage',function(e){if(e.key===KEY||e.key===null)sync();});w.addEventListener('pageshow',sync);w.addEventListener('focus',sync);d.addEventListener('visibilitychange',sync);
el('allow').addEventListener('click',function(){save('granted');});el('deny').addEventListener('click',function(){save('denied');});el('request').addEventListener('click',request);el('convert').addEventListener('click',convert);
var params=new URLSearchParams(location.search);el('qa-state').textContent=params.get('at_qa_mode')?'Target Activity QAの指定を検出しました。QAレポートで確認してください。':'通常配信モード。以前のQA状態が続く場合は「Target QAを終了」を使ってください。';
var c=read();if(c){state=c.value;expires=c.expires;}status(state==='granted'?'計測を許可済み':state==='denied'?'計測を拒否しています':'同意前のため、Adobe SDKを読み込んでいません');if(state==='granted')start();
})(window,document);
