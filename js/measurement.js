(function (w, d) {
  'use strict';
  if (w.tsMeasurement) return;
  var VERSION = '2026-09-13.1';
  var CONSENT_KEY = 'tsakurai.measurement-consent.v1';
  var tracker = null, started = false, initialized = false, queue = [], seen = Object.create(null);
  var portfolio = /^(\/|\/index\.html)$/.test(location.pathname);
  var knownPaths = ['1.html','2.html','3.html','4.html','5.html','customlink/custom_scroll.html','Cookie/index.html','login/index.html','login/home.html','pdf_embed/index.html','pdf_embed/1.html','misc/1.html','misc/2.html','misc/3.html','docs/index.html','sitemap_with_titles.html','privacy.html'];
  var pathId = location.pathname.replace(/^\//, '');
  var pageId = portfolio ? 'portfolio' : knownPaths.indexOf(pathId) >= 0 ? pathId : 'not-found';
  var consent = 'pending';
  try {
    var saved = JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null');
    if (saved && saved.expires > Date.now() && /^(granted|denied)$/.test(saved.value)) consent = saved.value;
  } catch (_) { /* Unavailable storage keeps the visitor in control on this page. */ }
  function allowed() { return consent === 'granted'; }
  function token(value) { return typeof value === 'string' && /^[a-zA-Z0-9_./:-]{1,100}$/.test(value) ? value : ''; }
  function cleanURL(value) {
    try { var url = new URL(value, location.href); return /^https?:$/.test(url.protocol) ? url.origin + url.pathname : ''; }
    catch (_) { return ''; }
  }
  function base() {
    return { 'ts.page_id': pageId, 'ts.page_group': portfolio ? 'portfolio' : 'lab',
      'ts.synthetic': portfolio && location.hostname === 'www.tsakurai.com' && new URLSearchParams(location.search).get('ts_qa') !== '1' && w._satellite && w._satellite.environment.stage === 'production' ? 'false' : 'true', 'ts.measurement_version': VERSION,
      'ts.environment': new URLSearchParams(location.search).get('ts_qa') === '1' ? 'qa' : w._satellite && w._satellite.environment ? w._satellite.environment.stage : 'development',
      'ts.consent': 'granted' };
  }
  var dimensionMap = {151:'page_group',152:'event_name',153:'section',154:'placement',155:'destination',156:'depth',157:'measurement_version',158:'synthetic',159:'document_id',160:'route',161:'environment',162:'pdf_event'};
  var eventMap = {page_view:151,navigation_click:152,email_click:153,linkedin_click:154,section_view:155,scroll_depth:156,outbound_click:157,pdf_download_click:158,pdf_interaction:159,engaged_visit:161,measurement_error:162};
  function mapVariables(name) {
    Object.keys(dimensionMap).forEach(function(n){tracker['eVar'+n]=tracker.contextData['ts.'+dimensionMap[n]] || '';});
    tracker.events = 'event' + (eventMap[name] || 160);
    tracker.linkTrackVars = 'contextData,pageName,pageURL,channel,events,' + Object.keys(dimensionMap).map(function(n){return 'eVar'+n;}).join(',');
    tracker.linkTrackEvents = tracker.events;
  }
  // Only named, bounded attributes enter the data layer. Never copy form values, cookies or SDK event objects.
  function attributes(input) {
    var out = {};
    ['section','placement','action','destination','depth','document_id','pdf_event','pdf_page','route','scenario'].forEach(function (key) {
      var value = token(String((input || {})[key] || ''));
      if (value) out['ts.' + key] = value;
    });
    return out;
  }
  w.adobeDataLayer = w.adobeDataLayer || [];
  function record(name, attrs) {
    var data = { event: name, page: { id: pageId, group: portfolio ? 'portfolio' : 'lab' }, data: attrs, version: VERSION };
    w.adobeDataLayer.push(data);
    if (w.adobeDataLayer.length > 100) w.adobeDataLayer.splice(0, w.adobeDataLayer.length - 100);
    return data;
  }
  function send(name, input, options) {
    options = options || {};
    if (!allowed()) return 'consent-blocked';
    name = token(name);
    if (!name) return 'invalid-event';
    if (options.once && seen[options.once]) return 'duplicate-blocked';
    if (options.once) seen[options.once] = true;
    var attrs = attributes(input);
    record(name, attrs);
    var hit = { name: name, attrs: attrs, type: options.type === 'd' ? 'd' : options.type === 'e' ? 'e' : 'o',
      pageView: options.pageView === true };
    if (!portfolio && options.fixture) {
      var commerce = {commerce_product_view:'prodView',commerce_cart_add:'scAdd',commerce_checkout_start:'scCheckout',commerce_purchase_complete:'purchase'};
      if (commerce[name]) {
        hit.commerce = commerce[name]; hit.products = ';LAB-SKU-001;1;19800';
        if (name==='commerce_purchase_complete') {
          var purchaseId=options.fixture.vars && options.fixture.vars.purchaseID;
          if (!/^LAB-[a-zA-Z0-9-]{1,50}$/.test(purchaseId || '')) return 'invalid-purchase';
          if (seen[purchaseId]) return 'duplicate-blocked';
          seen[purchaseId]=true; hit.purchaseID=purchaseId;
        }
      }
    }
    if (!tracker || !initialized) {
      if (queue.length >= 30) queue.shift();
      queue.push(hit);
      return 'queued';
    }
    return transmit(hit);
  }
  function transmit(hit) {
    if (!allowed() || !tracker) return 'consent-blocked';
    tracker.clearVars();
    tracker.contextData = Object.assign(base(), hit.attrs, {'ts.event_name':hit.name});
    tracker.pageURL = location.origin + (portfolio ? '/' : '/' + pageId);
    tracker.pageName = 'tsakurai:' + pageId;
    tracker.channel = portfolio ? 'portfolio' : 'lab';
    mapVariables(hit.name);
    if (hit.commerce) {
      tracker.events += ',' + hit.commerce; tracker.products=hit.products;
      tracker.currencyCode='JPY'; tracker.purchaseID=hit.purchaseID || '';
      tracker.linkTrackVars += ',products,purchaseID,currencyCode'; tracker.linkTrackEvents=tracker.events;
    }
    try {
      if (hit.pageView) {
        tracker.contextData['ts.virtual_route'] = hit.attrs['ts.route'] || '';
        tracker.t();
      } else tracker.tl(true, hit.type, 'ts:' + hit.name + (hit.attrs['ts.placement'] ? ':' + hit.attrs['ts.placement'] : ''));
      return 'sdk-called';
    } catch (_) { return 'sdk-error'; }
    finally { tracker.clearVars(); tracker.linkTrackVars = 'None'; tracker.linkTrackEvents = 'None'; }
  }
  function connect(s) {
    if (tracker) return;
    tracker = s;
    tracker.contextData = Object.assign(base(), {'ts.event_name':'page_view'});
    mapVariables('page_view');
    // Referrer query strings can contain entered search terms or identifiers.
    tracker.referrer = cleanURL(d.referrer);
    var campaign = new URLSearchParams(location.search).get('cid');
    if (portfolio && token(campaign)) tracker.campaign = campaign;
    record('page_view', base());
  }
  function pageReady() {
    if (initialized) return;
    // doPlugins invokes this when the initial page hit is being built, not when variables are merely set.
    w.setTimeout(function () { if(initialized)return;initialized=true;var pending=queue.splice(0);pending.forEach(transmit);d.dispatchEvent(new CustomEvent('ts:measurement-ready')); }, 0);
  }
  function loadLaunch() {
    if (started || !allowed()) return;
    started = true;
    w.targetGlobalSettings = Object.assign({}, w.targetGlobalSettings, {bodyHidingEnabled:false, timeout:1500});
    function startLibrary() {
      var script = d.createElement('script');
      var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
      var stage = new URLSearchParams(location.search).get('ts_stage');
      script.src = local && stage === 'staging'
        ? 'https://assets.adobedtm.com/ff8e968de530/5e835208803b/launch-ENf5cd3a80d2b44148839cafa7cbe4bf51-staging.min.js'
        : local && stage !== 'production'
          ? 'https://assets.adobedtm.com/ff8e968de530/5e835208803b/launch-ENda93a2d5c4c846e49f53c387a329297a-development.min.js'
          : 'https://assets.adobedtm.com/launch-EN74cf41899d0d4c7b99abec483ec49ebc.min.js';
      script.async = true;
      script.onerror = function () { queue = []; d.documentElement.dataset.measurementStatus = 'unavailable'; };
      d.head.appendChild(script);
    }
    // Explicit diagnostics only; no IDs or cookies are shown. Failure must not block measurement.
    if (new URLSearchParams(location.search).get('ts_debug') === '1' && !w.tsTransportDebug) {
      var debug = d.createElement('script');
      debug.src = '/js/measurement-debug.js'; debug.onload = startLibrary; debug.onerror = startLibrary;
      d.head.appendChild(debug);
    } else startLibrary();
  }
  function setConsent(value) {
    if (!/^(granted|denied)$/.test(value)) return;
    var withdrawing = consent === 'granted' && value === 'denied';
    consent = value;
    queue = [];
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify({value:value,expires:Date.now()+180*86400000})); } catch (_) {}
    d.documentElement.dataset.measurementConsent = consent;
    var banner = d.getElementById('measurement-consent');
    if (banner) banner.hidden = true;
    d.dispatchEvent(new CustomEvent('ts:consent-changed', {detail:{value:value}}));
    if (withdrawing) {
      // A reload also stops already loaded Target/ECID code; the denied preference survives it.
      location.reload();
    } else loadLaunch();
  }
  function consentUI() {
    var style = d.createElement('style');
    style.textContent = '#measurement-consent{position:fixed;z-index:10000;bottom:1rem;left:1rem;right:1rem;max-width:42rem;padding:1.2rem;border:1px solid #64748b;border-radius:12px;background:#111827;color:#fff;font:15px/1.5 system-ui;box-shadow:0 5px 25px #0005}#measurement-consent[hidden]{display:none}#measurement-consent p{margin:0 0 .8rem}#measurement-consent button,#measurement-preferences{font:inherit;padding:.5rem .8rem;border:1px solid #64748b;border-radius:6px;margin-right:.5rem;background:#fff;color:#111827;cursor:pointer}#measurement-preferences{display:block;margin:1rem}';
    d.head.appendChild(style);
    var panel = d.createElement('aside');
    panel.id = 'measurement-consent'; panel.setAttribute('aria-label','Analytics preferences'); panel.hidden = consent !== 'pending';
    var p = d.createElement('p'); p.textContent = 'With your permission, Adobe Analytics measures page views and interactions, and Adobe Target tests page variations. Your choice is saved for 180 days. The site works with measurement turned off.';
    panel.appendChild(p);
    [['Allow measurement','granted'],['Decline','denied']].forEach(function (pair) {
      var button = d.createElement('button'); button.type = 'button'; button.textContent = pair[0]; button.addEventListener('click',function(){setConsent(pair[1]);}); panel.appendChild(button);
    });
    var link = d.createElement('a'); link.href='/privacy.html'; link.textContent='Privacy details'; link.style.color='#bfdbfe'; panel.appendChild(link);
    var prefs = d.createElement('button'); prefs.id='measurement-preferences'; prefs.type='button'; prefs.textContent='Analytics preferences';
    prefs.addEventListener('click',function(){panel.hidden=false;panel.querySelector('button').focus();});
    d.body.appendChild(panel); d.body.appendChild(prefs);
    d.documentElement.dataset.measurementConsent = consent;
  }
  function interactions() {
    d.addEventListener('click', function (event) {
      var link = event.target.closest && event.target.closest('a[href]');
      if (!link || event.defaultPrevented || link.closest('#measurement-consent')) return;
      var href = link.getAttribute('href') || '';
      var placement = link.dataset.measurementId || (link.closest('header') ? 'header' : link.closest('.hero') ? 'hero' : link.closest('#contact') ? 'contact' : 'content');
      if (portfolio && /^mailto:/i.test(href)) send('email_click',{placement:placement, destination:'email'});
      else if (portfolio && /^https:\/\/(www\.)?linkedin\.com\//i.test(href)) send('linkedin_click',{placement:placement,destination:'linkedin'},{type:'e'});
      else if (portfolio && href.charAt(0)==='#') send('navigation_click',{placement:placement,destination:href.slice(1)||'top'});
      else {
        var url; try { url=new URL(href,location.href); } catch(_){return;}
        if (!/^https?:$/.test(url.protocol)) return;
        if (/\.pdf$/i.test(url.pathname)) send('pdf_download_click',{placement:placement,document_id:'linked-pdf'},{type:'d'});
        else if (url.hostname!==location.hostname) send('outbound_click',{placement:placement,destination:token(url.hostname)},{type:'e'});
      }
    });
    if (!portfolio) return;
    var sections = Array.prototype.slice.call(d.querySelectorAll('main section[data-section-id]'));
    var activeSeconds=0, lastTick=Date.now();
    var engagementTimer=w.setInterval(function(){
      var now=Date.now();
      if(allowed()&&d.visibilityState!=='hidden')activeSeconds+=Math.min(2,(now-lastTick)/1000);
      lastTick=now;
      if(activeSeconds>=30&&Object.keys(seen).filter(function(k){return k.indexOf('section:')===0;}).length>=2){
        send('engaged_visit',{action:'active30s_two_sections'},{once:'engaged'});w.clearInterval(engagementTimer);
      }
    },1000);
    var timers = new Map();
    function visible(el) { var r=el.getBoundingClientRect();return Math.min(r.bottom,w.innerHeight)-Math.max(r.top,0)>=Math.min(r.height,w.innerHeight)*0.5; }
    function inspect() {
      sections.forEach(function (el) {
        var id=el.dataset.sectionId;
        if (d.visibilityState==='hidden'||!allowed()||!visible(el)) {clearTimeout(timers.get(id));timers.delete(id);return;}
        if (!seen['section:'+id]&&!timers.has(id)) timers.set(id,setTimeout(function(){timers.delete(id);if(allowed()&&d.visibilityState!=='hidden'&&visible(el))send('section_view',{section:id},{once:'section:'+id});},1000));
      });
      if (allowed() && d.visibilityState!=='hidden') {
        var height=d.documentElement.scrollHeight-w.innerHeight;
        var depth=height>0?Math.floor(w.scrollY/height*100):0;
        [25,50,75,100].forEach(function(n){if(depth>=n)send('scroll_depth',{depth:String(n)},{once:'depth:'+n});});
      }
    }
    w.addEventListener('scroll',inspect,{passive:true});w.addEventListener('resize',inspect);d.addEventListener('visibilitychange',inspect);d.addEventListener('ts:consent-changed',inspect);inspect();
  }
  w.tsMeasurement = {version:VERSION,allowed:allowed,setConsent:setConsent,connect:connect,pageReady:pageReady,track:send,cleanURL:cleanURL};
  function ready(){consentUI();interactions();loadLaunch();}
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})(window,document);
