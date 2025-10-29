document.addEventListener("DOMContentLoaded", function () {
  const markdownEditor = document.getElementById('markdown-editor');
  const markdownPreview = document.getElementById('markdown-preview');

  function renderMarkdown() {
    if (typeof twemoji !== 'undefined') { // Check if twemoji is defined
      const markdownText = markdownEditor.value;
      const htmlContent = marked.parse(markdownText); // Use marked.parse instead of marked
      const emojiContent = twemoji.parse(htmlContent);
      markdownPreview.innerHTML = emojiContent;
    } else {
      console.warn('twemoji not yet loaded, skipping render.');
    }
  }

  markdownEditor.addEventListener('input', renderMarkdown);
  renderMarkdown(); // Initial render
});
