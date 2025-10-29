document.addEventListener("DOMContentLoaded", function () {
    const editor = document.getElementById('markdown-editor');
    const preview = document.getElementById('markdown-preview');
    const togglePreviewCheckbox = document.querySelector('#menu-toggle-preview input[type="checkbox"]');
    const togglePreviewContainer = document.getElementById('menu-toggle-preview');

    // Add new UI elements programmatically if they don't exist
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'preview-controls';
    controlsContainer.innerHTML = `
        <button id="print-preview" title="Print Preview"><i class="fas fa-print"></i></button>
        <button id="toggle-toc" title="Toggle Table of Contents"><i class="fas fa-list"></i></button>
        <button id="toggle-fullscreen" title="Toggle Full Screen"><i class="fas fa-expand"></i></button>
    `;

    // Insert controls before or after the preview element
    if (preview.parentNode) {
        preview.parentNode.insertBefore(controlsContainer, preview);
    }

    let isPreviewMode = false;
    let showToc = localStorage.getItem('show-toc') === 'true';
    let isFullScreen = false;

    // Set up marked.js configuration
    marked.setOptions({
        gfm: true,
        breaks: true,
        highlight: function (code, language) {
            if (language && hljs.getLanguage(language)) {
                try {
                    return hljs.highlight(code, { language }).value;
                } catch (e) {
                    console.error(e);
                }
            }
            return hljs.highlightAuto(code).value;
        }
    });

    // Custom renderer to handle various elements
    const renderer = new marked.Renderer();

    // Customize headings (removed permalink, but keeping ID for TOC)
    renderer.heading = function (text, level) {
        const escapedText = text.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-');
        return `<h${level} id="${escapedText}">${text}</h${level}>`;
    };

    // Customize images to add lightbox and responsive behavior
    renderer.image = function (href, title, text) {
        return `<img 
                    src="${href}" 
                    alt="${text}" 
                    title="${title || text}" 
                    class="responsive-img" 
                    onclick="if(this.classList.contains('expanded')) {this.classList.remove('expanded')} else {this.classList.add('expanded')}"
                >`;
    };

    // Apply custom renderer
    marked.use({ renderer });

    // Function to update Markdown preview with enhanced features
    function updatePreview() {
        if (isPreviewMode) {
            // Render markdown content
            preview.innerHTML = marked.parse(editor.value);

            // Process emojis through twemoji
            twemoji.parse(preview, {
                base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/'
              });
              

            // Apply syntax highlighting to code blocks
            document.querySelectorAll('#markdown-preview pre code').forEach((block) => {
                hljs.highlightElement(block);
            });

            // Generate and insert Table of Contents if enabled
            if (showToc) {
                generateTOC();
            }

            // Make tables responsive
            wrapTablesForResponsiveness();

            // Add classes to blockquotes for styling
            styleBlockquotes();

            // Make external links open in new tab
            setupExternalLinks();
        }
    }

    // Function to generate a Table of Contents
    function generateTOC() {
        // Remove existing TOC if any
        const existingToc = preview.querySelector('.markdown-toc');
        if (existingToc) {
            existingToc.remove();
        }

        const headings = preview.querySelectorAll('h1, h2, h3, h4, h5, h6');
        if (headings.length === 0) return;

        const toc = document.createElement('div');
        toc.className = 'markdown-toc';

        const tocTitle = document.createElement('h2');
        tocTitle.textContent = 'Table of Contents';
        tocTitle.className = 'toc-title';
        toc.appendChild(tocTitle);

        const tocList = document.createElement('ul');
        tocList.className = 'toc-list';

        headings.forEach(heading => {
            if (!heading.classList.contains('toc-title')) { // Avoid adding TOC title to TOC
                const level = parseInt(heading.tagName.charAt(1));
                const listItem = document.createElement('li');
                listItem.className = `toc-item toc-level-${level}`;
                listItem.style.marginLeft = (level - 1) * 15 + 'px';

                const link = document.createElement('a');
                link.href = '#' + heading.id;
                link.textContent = heading.textContent; // No need to remove 🔗 anymore
                link.className = 'toc-link';

                listItem.appendChild(link);
                tocList.appendChild(listItem);
            }
        });

        toc.appendChild(tocList);

        // Insert at the beginning of the preview
        preview.insertBefore(toc, preview.firstChild);
    }

    // Function to wrap tables in a responsive container
    function wrapTablesForResponsiveness() {
        document.querySelectorAll('#markdown-preview table').forEach(table => {
            if (!table.parentNode.classList.contains('table-responsive')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'table-responsive';
                table.parentNode.insertBefore(wrapper, table);
                wrapper.appendChild(table);
            }
        });
    }

    // Function to add styling classes to blockquotes
    function styleBlockquotes() {
        document.querySelectorAll('#markdown-preview blockquote').forEach(blockquote => {
            const text = blockquote.textContent.toLowerCase();
            if (text.includes('note') || text.includes('tip')) {
                blockquote.classList.add('note-blockquote');
            } else if (text.includes('warning') || text.includes('caution')) {
                blockquote.classList.add('warning-blockquote');
            } else if (text.includes('important') || text.includes('key')) {
                blockquote.classList.add('important-blockquote');
            }
        });
    }

    // Function to make external links open in new tab
    function setupExternalLinks() {
        document.querySelectorAll('#markdown-preview a').forEach(link => {
            if (link.hostname !== window.location.hostname) { // Removed header-link check
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                if (!link.title) {
                    link.title = 'Opens in a new tab';
                }
                // Add external link icon
                if (!link.querySelector('.external-link-icon')) {
                    const icon = document.createElement('span');
                    icon.className = 'external-link-icon';
                    icon.innerHTML = ' <i class="fas fa-external-link-alt fa-xs"></i>';
                    link.appendChild(icon);
                }
            }
        });
    }

    // Function to get the selected text from editor or preview
    function getSelectedText() {
        let selectedText = '';

        if (isPreviewMode) {
            // Get selected text from preview
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                if (preview.contains(range.commonAncestorContainer)) {
                    selectedText = selection.toString().trim();
                }
            }
        } else {
            // Get selected text from editor
            selectedText = editor.value.substring(editor.selectionStart, editor.selectionEnd).trim();
        }

        return selectedText;
    }

    // Function to insert text at the cursor position in the editor
    function insertText(text) {
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const before = editor.value.substring(0, start);
        const after = editor.value.substring(end);
        editor.value = before + text + after;
        editor.selectionStart = editor.selectionEnd = start + text.length;
        editor.focus();
        updatePreview();
    }

    // Function to wrap selected text with specified strings
    function wrapText(before, after = before) {
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const selectedText = editor.value.substring(start, end);
        const beforeText = editor.value.substring(0, start);
        const afterText = editor.value.substring(end);
        editor.value = beforeText + before + selectedText + after + afterText;
        editor.selectionStart = start + before.length;
        editor.selectionEnd = end + before.length;
        editor.focus();
        updatePreview();
    }

    // Function to clear formatting from selected text
    function clearFormatting() {
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const before = editor.value.substring(0, start);
        const selectedText = editor.value.substring(start, end);
        const after = editor.value.substring(end);
        editor.value = before + selectedText + after;
        editor.focus();
        updatePreview();
    }

    // Function to handle image uploads
    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('image', file);

            fetch('/upload_image', {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const imageUrl = data.url;
                        const markdownImage = `![${file.name}](${imageUrl} "${file.name}")`;
                        insertText(markdownImage);
                    } else {
                        alert('Error uploading image: ' + data.error);
                    }
                })
                .catch(error => {
                    console.error('Error uploading image:', error);
                    alert('Error uploading image. Please try again.');
                });
        }
    }

    // Function to open a file and set its content to the editor
    function openFile(filename) {
        fetch('/open?filename=' + encodeURIComponent(filename))
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to open file');
                }
                return response.text();
            })
            .then(content => {
                editor.value = content;
                updatePreview();
                updateCurrentFileInfo(filename);
            })
            .catch(error => {
                console.error('Error opening file:', error);
                alert('Error opening file: ' + error.message);
            });
    }

    // Function to toggle preview visibility with animation
    function togglePreview() {
        isPreviewMode = togglePreviewCheckbox.checked;

        if (isPreviewMode) {
            updatePreview();
            editor.style.opacity = 0;
            setTimeout(() => {
                editor.style.display = 'none';
                preview.style.display = 'block';
                controlsContainer.style.display = 'flex';
                setTimeout(() => {
                    preview.style.opacity = 1;
                    controlsContainer.style.opacity = 1;
                }, 10);
            }, 300);
            togglePreviewContainer.classList.add('active');
        } else {
            preview.style.opacity = 0;
            controlsContainer.style.opacity = 0;
            setTimeout(() => {
                editor.style.display = 'block';
                preview.style.display = 'none';
                controlsContainer.style.display = 'none';
                setTimeout(() => {
                    editor.style.opacity = 1;
                }, 10);
            }, 300);
            togglePreviewContainer.classList.remove('active');
        }
    }

    // Function to generate and open print preview
    function printPreview() {
        const printWindow = window.open('', '_blank');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Preview - TyporaX</title>
                    <meta charset="UTF-8">
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css">
                    <style>
                        body {
                            font-family: 'Segoe UI', Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                            background-color: #fff;
                            padding: 20px;
                            max-width: 800px;
                            margin: 0 auto;
                        }
                        h1, h2 {
                            border-bottom: 1px solid #eaecef;
                            padding-bottom: 0.3em;
                        }
                        blockquote {
                            padding: 0 1em;
                            color: #6a737d;
                            border-left: 0.25em solid #dfe2e5;
                            margin: 0;
                        }
                        pre {
                            background-color: #f6f8fa;
                            border-radius: 3px;
                            padding: 16px;
                            overflow: auto;
                        }
                        code {
                            font-family: Consolas, Monaco, 'Andale Mono', monospace;
                        }
                        table {
                            border-collapse: collapse;
                            width: 100%;
                            margin-bottom: 16px;
                        }
                        th, td {
                            border: 1px solid #dfe2e5;
                            padding: 6px 13px;
                        }
                        tr:nth-child(2n) {
                            background-color: #f6f8fa;
                        }
                        img {
                            max-width: 100%;
                        }
                        .external-link-icon, .markdown-toc {  /* Removed .header-link */
                            display: none;
                        }
                        @media print {
                            body {
                                color: #000;
                                background-color: #fff;
                            }
                            a {
                                color: #000;
                                text-decoration: underline;
                            }
                            tr:nth-child(2n) {
                                background-color: #f6f8fa !important;
                                -webkit-print-color-adjust: exact;
                            }
                            pre {
                                background-color: #f6f8fa !important;
                                -webkit-print-color-adjust: exact;
                                border: 1px solid #ddd;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div id="print-content">${preview.innerHTML}</div>
                    <script>
                        window.onload = function() {
                            // Remove interactive elements that don't make sense in print
                            document.querySelectorAll('.external-link-icon, .markdown-toc').forEach(el => {  /* Removed .header-link */
                                el.style.display = 'none';
                            });
                            // Automatically print after loading
                            setTimeout(() => {
                                window.print();
                            }, 500);
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    }

    // Function to toggle table of contents
    function toggleTOC() {
        showToc = !showToc;
        localStorage.setItem('show-toc', showToc);

        // Update the TOC in the preview
        if (isPreviewMode) {
            if (showToc) {
                generateTOC();
            } else {
                const existingToc = preview.querySelector('.markdown-toc');
                if (existingToc) {
                    existingToc.remove();
                }
            }
        }
    }

    // Function to toggle full screen mode
    function toggleFullScreen() {
        const container = isPreviewMode ? preview.parentElement : editor.parentElement;

        if (!isFullScreen) {
            // Enter full screen
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.mozRequestFullScreen) { // Firefox
                container.mozRequestFullScreen();
            } else if (container.webkitRequestFullscreen) { // Chrome, Safari & Opera
                container.webkitRequestFullscreen();
            } else if (container.msRequestFullscreen) { // IE/Edge
                container.msRequestFullscreen();
            }
            document.getElementById('toggle-fullscreen').querySelector('i').classList.replace('fa-expand', 'fa-compress');
        } else {
            // Exit full screen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) { // Firefox
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) { // Chrome, Safari & Opera
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { // IE/Edge
                document.msExitFullscreen();
            }
            document.getElementById('toggle-fullscreen').querySelector('i').classList.replace('fa-compress', 'fa-expand');
        }

        isFullScreen = !isFullScreen;
    }

    // Set up event listeners
    togglePreviewCheckbox.addEventListener('change', togglePreview);
    document.getElementById('print-preview').addEventListener('click', printPreview);
    document.getElementById('toggle-toc').addEventListener('click', toggleTOC);
    document.getElementById('toggle-fullscreen').addEventListener('click', toggleFullScreen);

    // Listen for fullscreen change event to update button when user exits fullscreen using ESC key
    document.addEventListener('fullscreenchange', function () {
        if (!document.fullscreenElement) {
            isFullScreen = false;
            document.getElementById('toggle-fullscreen').querySelector('i').classList.replace('fa-compress', 'fa-expand');
        }
    });

    // Initial setup
    if (isPreviewMode) {
        updatePreview();
    }

    // Hide controls initially if not in preview mode
    if (!isPreviewMode) {
        controlsContainer.style.display = 'none';
    }

    // Image upload input listener
    const imageUploadInput = document.getElementById('image-upload-input');
    if (imageUploadInput) {
        imageUploadInput.addEventListener('change', handleImageUpload);
    }

    // Auto-save functionality (optional)
    let autoSaveTimer;
    function startAutoSave() {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
            // Implement auto-save logic here
            console.log('Auto-saving content...');
            // For example: saveContent(editor.value);
        }, 3000); // Auto-save after 3 seconds of inactivity
    }

    editor.addEventListener('input', startAutoSave);

    // Expose functions for use in other parts of the application
    window.mdEditor = {
        insertText: insertText,
        wrapText: wrapText,
        clearFormatting: clearFormatting,
        openFile: openFile,
        updatePreview: updatePreview,
        togglePreview: togglePreview,
        printPreview: printPreview,
        toggleTOC: toggleTOC,
        toggleFullScreen: toggleFullScreen
    };
});