document.getElementById("current-year").textContent = new Date().getFullYear();

function removeLaunchArtifactText() {
  Array.from(document.body.childNodes).forEach(function (node) {
    if (node.nodeType !== Node.TEXT_NODE) {
      return;
    }

    var text = node.nodeValue || "";
    var compactText = text.replace(/\s|\u3000/g, "");
    var isArtifactStart = text.indexOf('"language"') !== -1 && text.indexOf('"source"') !== -1;
    var isArtifactEnd = /^["\s\u3000]*\}[\s\u3000]*$/.test(text);

    if (isArtifactStart || isArtifactEnd || compactText === '{"language":"html","source":""}') {
      node.remove();
    }
  });
}

removeLaunchArtifactText();
new MutationObserver(removeLaunchArtifactText).observe(document.body, {
  childList: true
});
