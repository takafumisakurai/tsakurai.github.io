document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('current-year');
  if (yearEl) {
    const year = new Date().toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric'
    });
    yearEl.textContent = year;
  }

  // Remove accidental raw metadata text that may be injected into the page.
  const unexpectedPattern = /"language"\s*:\s*"html"[\s\S]*"source"\s*:/;
  document.body.childNodes.forEach((node) => {
    if (node.nodeType !== Node.TEXT_NODE) return;
    const text = node.textContent?.trim();
    if (!text) return;
    if (unexpectedPattern.test(text)) {
      node.remove();
    }
  });
});
