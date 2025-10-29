document.addEventListener("DOMContentLoaded", function () {
    const editor = document.getElementById('markdown-editor');
    const preview = document.getElementById('markdown-preview');
    const togglePreviewCheckbox = document.querySelector('#menu-toggle-preview input[type="checkbox"]');
    const togglePreviewContainer = document.getElementById('menu-toggle-preview');

    let isPreviewMode = false;

    marked.setOptions({
        gfm: true,
        tables: true,
        breaks: true,
        pedantic: false,
        sanitize: false,
        smartLists: true,
        smartypants: false
    });

    function updatePreview() {
        if (isPreviewMode) {
            const html = marked.parse(editor.value);
            preview.innerHTML = html;
            preview.querySelectorAll('table').forEach(table => {
                table.classList.add('responsive-table');
            });
            hljs.highlightAll();
        }
    }

    function insertText(text) {
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        editor.value = editor.value.substring(0, start) + text + editor.value.substring(end);
        editor.selectionStart = editor.selectionEnd = start + text.length;
        editor.focus();
        updatePreview();
    }

    function wrapText(before, after = before) {
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const selectedText = editor.value.substring(start, end);
        editor.value = editor.value.substring(0, start) + before + selectedText + after + editor.value.substring(end);
        editor.selectionStart = start + before.length;
        editor.selectionEnd = end + before.length;
        editor.focus();
        updatePreview();
    }

    function applyHighlight(color) {
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const selectedText = editor.value.substring(start, end);
        const highlightedText = `<span style="background-color: ${color};">${selectedText}</span>`;
        editor.value = editor.value.substring(0, start) + highlightedText + editor.value.substring(end);
        updatePreview();
    }
    

    function removeHighlight() {
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const selectedText = editor.value.substring(start, end);
        const cleanText = selectedText.replace(/<span[^>]*>(.*?)<\/span>/g, '$1');
        editor.value = editor.value.substring(0, start) + cleanText + editor.value.substring(end);
        updatePreview();
    }
    

    function togglePreview() {
        isPreviewMode = togglePreviewCheckbox.checked;
        if (isPreviewMode) {
            updatePreview();
            editor.style.display = 'none';
            preview.style.display = 'block';
            togglePreviewContainer.classList.add('active');
        } else {
            editor.style.display = 'block';
            preview.style.display = 'none';
            togglePreviewContainer.classList.remove('active');
        }
    }

    togglePreviewCheckbox.addEventListener('change', togglePreview);
    updatePreview();

    window.applyHighlight = applyHighlight;
    window.removeHighlight = removeHighlight;
    window.insertText = insertText;
    window.wrapText = wrapText;

});
