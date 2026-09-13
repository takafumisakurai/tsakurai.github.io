document.addEventListener('DOMContentLoaded', function () {
    var checkpoints = Array.from(document.querySelectorAll('.scroll-trigger'));
    var fired = new Set();
    function check() {
        var height = document.documentElement.scrollHeight - innerHeight;
        var depth = height > 0 ? Math.max(0, Math.min(100, Math.round(scrollY / height * 100))) : 0;
        var progress = document.getElementById('scroll-progress');
        if (progress) progress.style.width = depth + '%';
        if (!window.tsMeasurement || !window.tsMeasurement.allowed() || document.visibilityState === 'hidden') return;
        checkpoints.forEach(function (element) {
            var rect = element.getBoundingClientRect();
            var visible = Math.min(rect.bottom, innerHeight * 0.82) - Math.max(rect.top, 0);
            var id = element.dataset.section;
            if (visible < Math.min(rect.height, innerHeight) * 0.42 || fired.has(id)) return;
            fired.add(id);
            var state = window.tsMeasurement.track('lab_scroll_checkpoint', {section:id, depth:String(depth)}, {once:'checkpoint:'+id});
            var status = document.getElementById('tracking-status');
            if (status) status.textContent = id + ': ' + state + ' (actual page depth ' + depth + '%)';
            var log = document.getElementById('tracking-log');
            if (log) { var item=document.createElement('li');item.textContent=id+' / actual depth '+depth+'% / '+state;log.prepend(item); }
        });
    }
    addEventListener('scroll', check, {passive:true}); addEventListener('resize', check);
    document.addEventListener('ts:consent-changed', check); document.addEventListener('visibilitychange', check);
    check();
});
