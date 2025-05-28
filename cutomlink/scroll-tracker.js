// scroll-tracker.js
document.addEventListener('DOMContentLoaded', function () {
    var options = {
        root: null,
        rootMargin: '0px',
        threshold: 0.5
    };

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting && !entry.target.dataset.fired) {
                var linkName = entry.target.dataset.section;  // "contents_1"～"contents_5"
                if (window.s && typeof s.tl === 'function') {
                    s.tl(true, 'o', linkName);
                }
                entry.target.dataset.fired = '1';
            }
        });
    }, options);

    document.querySelectorAll('.scroll-trigger').forEach(function (el) {
        observer.observe(el);
    });
});