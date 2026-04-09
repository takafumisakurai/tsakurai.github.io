document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('current-year');
  if (yearEl) {
    const year = new Date().toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric'
    });
    yearEl.textContent = year;
  }

  const metadataPattern = /\{\s*"language"\s*:\s*"html"\s*,\s*"source"\s*:\s*"[\s\S]*?"\s*\}/;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const targets = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (metadataPattern.test(node.textContent || '')) {
      targets.push(node);
    }
  }

  targets.forEach((node) => {
    node.textContent = (node.textContent || '').replace(metadataPattern, '').trim();
    if (!node.textContent) {
      node.remove();
    }
  });
});
