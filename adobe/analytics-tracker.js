// Adobe Analytics extension: Execute AFTER other settings. 2026-09-13.1
var knownPaths = ['/','/index.html','/1.html','/2.html','/3.html','/4.html','/5.html','/customlink/custom_scroll.html','/Cookie/index.html','/login/index.html','/login/home.html','/pdf_embed/index.html','/pdf_embed/1.html','/misc/1.html','/misc/2.html','/misc/3.html','/docs/index.html','/sitemap_with_titles.html','/privacy.html'];
var sitePath = knownPaths.indexOf(location.pathname) >= 0 ? location.pathname : '/not-found';
var isPortfolio = /^(\/|\/index\.html)$/.test(sitePath);
var qa = new URLSearchParams(location.search).get('ts_qa') === '1';
var isProduction = location.hostname === 'www.tsakurai.com' && _satellite.environment.stage === 'production' && !qa;
s.sa(isPortfolio && isProduction ? 'tsisakurai' : 'egeo1xxtsakurailab');
s.usePlugins = true;
s.useLinkTrackSessionStorage = false;
s.trackDownloadLinks = false;
s.trackExternalLinks = false;
s.linkInternalFilters = 'javascript:,tsakurai.com';
s.doPlugins = function (tracker) {
  if (window.tsMeasurement && !window.tsMeasurement.allowed()) { tracker.abort = true; return; }
  var cleanPath = isPortfolio ? '/' : sitePath;
  tracker.contextData = tracker.contextData || {};
  var route = tracker.contextData['ts.virtual_route'];
  tracker.pageURL = location.origin + cleanPath;
  tracker.pageName = 'tsakurai:' + (isPortfolio ? 'portfolio' : cleanPath.replace(/^\//, '')) + (route && /^route-[ab]$/.test(route) ? ':' + route : '');
  tracker.channel = isPortfolio ? 'portfolio' : 'lab';
  tracker.eVar14 = '';
  if (!isPortfolio) tracker.campaign = '';
  if (tracker.referrer) { try { var ref = new URL(tracker.referrer); tracker.referrer = ref.origin + ref.pathname; } catch (_) { tracker.referrer = ''; } }
  tracker.contextData['ts.page_group'] = isPortfolio ? 'portfolio' : 'lab';
  tracker.contextData['ts.environment'] = qa ? 'qa' : _satellite.environment.stage;
  tracker.contextData['ts.synthetic'] = !isProduction || !isPortfolio ? 'true' : 'false';
  tracker.contextData['ts.measurement_version'] = '2026-09-13.1';
  if (tracker.contextData['ts.event_name'] === 'page_view' && window.tsMeasurement) window.tsMeasurement.pageReady();
  for (var n = 76; n <= 250; n++) delete tracker['prop' + n];
};
