document.addEventListener('DOMContentLoaded', function () {
    var checkpoints = Array.prototype.slice.call(document.querySelectorAll('.scroll-trigger'));
    var progressEl = document.getElementById('scroll-progress');
    var statusEl = document.getElementById('tracking-status');
    var logEl = document.getElementById('tracking-log');
    var fired = {};
    var pendingHits = [];
    var logItems = {};
    var flushAttempts = 0;
    var flushTimer = null;

    function adobeAnalyticsReady() {
        return Boolean(window.s && typeof window.s.tl === 'function');
    }

    function setStatus(text) {
        if (statusEl) {
            statusEl.textContent = text;
        }
    }

    function renderLog(hit, state) {
        if (!logEl) {
            return;
        }

        var item = logItems[hit.id];
        if (!item) {
            item = document.createElement('li');
            logItems[hit.id] = item;
            logEl.prepend(item);
        }

        item.className = state === 'sent' ? 'sent' : 'queued';
        item.innerHTML = '<strong>' + hit.linkName + '</strong>' +
            '<span>' + hit.label + ' / ' + hit.depth + '% / ' + state + '</span>';
    }

    function buildHit(element) {
        var section = element.dataset.section;
        var label = element.dataset.label || section;
        var depth = element.dataset.depth || '';

        return {
            id: section,
            section: section,
            label: label,
            depth: depth,
            linkName: element.dataset.linkName || 'custom_scroll_' + section,
            timestamp: new Date().toISOString()
        };
    }

    function withAdobeVars(hit, callback) {
        var analytics = window.s;
        var values = {
            linkTrackVars: 'events,eVar120,prop120,eVar121,prop121,eVar122,prop122',
            linkTrackEvents: 'event120',
            events: 'event120',
            eVar120: hit.label,
            prop120: hit.section,
            eVar121: String(hit.depth),
            prop121: hit.linkName,
            eVar122: 'customlink/custom_scroll.html',
            prop122: 'scroll-validation'
        };
        var previous = {};

        Object.keys(values).forEach(function (key) {
            previous[key] = analytics[key];
            analytics[key] = values[key];
        });

        try {
            callback(analytics);
        } finally {
            Object.keys(values).forEach(function (key) {
                if (typeof previous[key] === 'undefined') {
                    analytics[key] = '';
                } else {
                    analytics[key] = previous[key];
                }
            });
        }
    }

    function sendAdobeCustomLink(hit) {
        if (!adobeAnalyticsReady()) {
            return false;
        }

        withAdobeVars(hit, function (analytics) {
            analytics.tl(true, 'o', hit.linkName);
        });
        return true;
    }

    function scheduleFlush() {
        if (flushTimer || pendingHits.length === 0) {
            return;
        }

        flushTimer = window.setTimeout(function () {
            flushTimer = null;
            flushAttempts++;

            if (adobeAnalyticsReady()) {
                while (pendingHits.length) {
                    var hit = pendingHits.shift();
                    sendAdobeCustomLink(hit);
                    renderLog(hit, 'sent');
                }
                setStatus('Queued scroll hits sent to Adobe Analytics.');
            } else if (flushAttempts < 60) {
                setStatus('Waiting for Adobe Analytics object. Queued hits: ' + pendingHits.length);
                scheduleFlush();
            } else {
                setStatus('Adobe Analytics object was not available. Queued hits remain in the page log.');
            }
        }, 500);
    }

    function trackCheckpoint(element) {
        var hit = buildHit(element);

        if (fired[hit.id]) {
            return;
        }

        fired[hit.id] = true;

        if (sendAdobeCustomLink(hit)) {
            renderLog(hit, 'sent');
            setStatus('Sent: ' + hit.linkName);
        } else {
            pendingHits.push(hit);
            renderLog(hit, 'queued');
            setStatus('Queued until Adobe Analytics loads: ' + hit.linkName);
            scheduleFlush();
        }
    }

    function updateScrollProgress() {
        if (!progressEl) {
            return;
        }

        var scrollable = document.documentElement.scrollHeight - window.innerHeight;
        var progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
        progressEl.style.width = Math.max(0, Math.min(100, progress)) + '%';
    }

    if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    trackCheckpoint(entry.target);
                }
            });
        }, {
            root: null,
            rootMargin: '0px 0px -18% 0px',
            threshold: 0.42
        });

        checkpoints.forEach(function (element) {
            observer.observe(element);
        });
    } else {
        checkpoints.forEach(trackCheckpoint);
    }

    updateScrollProgress();
    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    window.addEventListener('resize', updateScrollProgress);
    scheduleFlush();
});
