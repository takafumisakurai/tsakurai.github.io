(function (w, d) {
  'use strict';
  // Public portfolio and privacy pages never receive lab diagnostics.
  if (/^(\/|\/index\.html|\/privacy\.html|\/404\.html)$/.test(location.pathname) || d.getElementById('lab-measurement-status')) return;
  var provider = w.tsWebSDKLabStatus || w.tsMeasurement;
  if (!provider || !provider.getStatus) return;
  var panel = d.createElement('aside');
  panel.id = 'lab-measurement-status'; panel.setAttribute('aria-label', 'Lab measurement status');
  var summary = d.createElement('p'), details = d.createElement('details'), title = d.createElement('summary');
  title.textContent = '計測の詳細'; details.appendChild(title);
  var values = d.createElement('dl'), cells = {};
  [['sdk','計測方式'],['rsid','計測先 RSID'],['environment','ライブラリ環境'],['group','データ区分'],['consent','計測の選択'],['event','直前のイベント'],['result','送信状況'],['version','計測仕様の版']].forEach(function (field) {
    var dt = d.createElement('dt'), dd = d.createElement('dd'); dt.textContent = field[1]; values.appendChild(dt); values.appendChild(dd); cells[field[0]] = dd;
  });
  details.appendChild(values);
  var note = d.createElement('p'); note.textContent = '公開ライブラリを使用するページでも、実装サンプルはLabへ集計します。Lab / QAは検証用の区分で、自動操作の判定ではありません。SDKの呼び出し成功と、レポートへの反映は別に確認します。'; details.appendChild(note);
  var debug = d.createElement('a'), debugURL = new URL(location.origin + location.pathname);
  var query = new URLSearchParams(location.search);
  debugURL.searchParams.set('ts_debug','1');
  if(query.get('ts_qa')==='1') debugURL.searchParams.set('ts_qa','1');
  if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /^(production|staging)$/.test(query.get('ts_stage')||'')) debugURL.searchParams.set('ts_stage',query.get('ts_stage'));
  debug.href = debugURL.href; debug.textContent = '通信の詳細を記録する（再読み込み）'; details.appendChild(debug);
  panel.appendChild(summary); panel.appendChild(details);
  var main = d.querySelector('main') || d.body; main.insertBefore(panel, main.firstChild);
  var style = d.createElement('style');
  style.textContent = '#lab-measurement-status{box-sizing:border-box;margin:1rem auto;padding:.75rem 1rem;max-width:1120px;border:1px solid #718096;border-radius:8px;background:#f1f5f9;color:#172033;font:14px/1.6 system-ui}#lab-measurement-status p{margin:0 0 .4rem}#lab-measurement-status summary{cursor:pointer;font-weight:600}#lab-measurement-status dl{display:grid;grid-template-columns:minmax(7rem,auto) minmax(0,1fr);gap:.3rem 1rem}#lab-measurement-status dt{font-weight:600}#lab-measurement-status dd{margin:0;overflow-wrap:anywhere}#lab-measurement-status a{color:#174b93;text-decoration:underline}@media(max-width:480px){#lab-measurement-status{margin:.5rem}#lab-measurement-status dl{grid-template-columns:1fr;gap:0}#lab-measurement-status dd{margin-bottom:.5rem}}'; d.head.appendChild(style);
  function render() {
    var s = provider.getStatus();
    var actual = s.rsid === 'egeo1xxtsakurailab';
    summary.textContent = '実装サンプル · 計測先：' + (s.rsid && !actual ? '要確認' : 'Lab') + ' · ' + s.sdk;
    cells.sdk.textContent = s.sdk;
    cells.rsid.textContent = s.rsid || s.expectedRSID + '（設定値・SDK起動前）';
    cells.environment.textContent = {production:'Production（公開）',staging:'Staging',development:'Development','not-loaded':'未読込',standalone:'独立した検証ページ'}[s.libraryEnvironment] || '未確認';
    cells.group.textContent = s.trafficGroup;
    cells.consent.textContent = {pending:'未選択',granted:'許可',denied:'拒否'}[s.consent] || '未確認';
    cells.event.textContent = s.event || 'まだありません';
    cells.result.textContent = {'no-events':'未送信',queued:'SDK待ち','sdk-called':'SDK呼び出し済み（HTTP応答は未確認）','sdk-error':'SDK呼び出しエラー','consent-blocked':'選択により計測停止','edge-response-success':'Edge応答受信（レポート反映は未確認）','edge-response-error':'Edge応答エラー','sdk-start-error':'SDK起動エラー'}[s.result] || '未確認';
    cells.version.textContent = s.version;
  }
  render();
  details.addEventListener('toggle',render);
  d.addEventListener('ts:measurement-status',render);
  d.addEventListener('ts:measurement-ready',render);
  d.addEventListener('ts:consent-changed',render);
  // Web SDK results update asynchronously; only refresh when someone opens details.
  if (w.tsWebSDKLabStatus) w.setInterval(function(){if(details.open)render();},1000);
})(window, document);
