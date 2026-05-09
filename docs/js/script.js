document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('current-year');
  if (yearEl) {
    const year = new Date().toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric'
    });
    yearEl.textContent = year;
  }

  const metadataPattern = /\{\s*"language"\s*:\s*"html"\s*,\s*"source"\s*:\s*"[^"]*"\s*\}/g;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const originalText = node.textContent || '';
    const cleanedText = originalText.replace(metadataPattern, '').trim();

    if (cleanedText !== originalText) {
      node.textContent = cleanedText;
    }
  }
});
