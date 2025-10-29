document.addEventListener("DOMContentLoaded", function () {
    const fileListElement = document.getElementById('file-list');
    const searchInputElement = document.getElementById('search-input');
    const searchResultsElement = document.getElementById('search-results');
    const markdownEditorElement = document.getElementById('markdown-editor');
    const markdownPreviewElement = document.getElementById('markdown-preview');
    const contentFilesElement = document.getElementById('content-files');
    const contentSearchElement = document.getElementById('content-search');
    const tabFilesElement = document.getElementById('tab-files');
    const tabSearchElement = document.getElementById('tab-search');
    const togglePreviewCheckbox = document.querySelector('#menu-toggle-preview input[type="checkbox"]');
    const currentFilenameElement = document.getElementById('current-filename');
    const currentFileNameDisplay = document.getElementById('current-file-name');

    let isPreviewMode = false;
    let debounceTimer;
    const DEBOUNCE_DELAY = 300; // ms
    let filesCache = [];

    function updateFileNameDisplay(filename) {
        currentFileNameDisplay.textContent = filename ? filename : "No file selected";
    }

    tabFilesElement.addEventListener('click', () => {
        contentFilesElement.classList.add('active');
        contentSearchElement.classList.remove('active');
        tabFilesElement.classList.add('active');
        tabSearchElement.classList.remove('active');
    });

    tabSearchElement.addEventListener('click', () => {
        contentFilesElement.classList.remove('active');
        contentSearchElement.classList.add('active');
        tabFilesElement.classList.remove('active');
        tabSearchElement.classList.add('active');
    });

    // Listen for folder selection changes from fileoperation.js
    document.addEventListener('folderSelected', (event) => {
        fetchFileList(event.detail.folder);
    });

    function fetchFileList(folder) {
        const url = folder
            ? `/editor/files?folder=${encodeURIComponent(folder)}`
            : '/editor/files';
        fetch(url)
            .then(response => response.json())
            .then(files => {
                if (!Array.isArray(files)) {
                    throw new Error('Unexpected response format from /editor/files');
                }
                filesCache = files;
                console.log('Updated filesCache:', filesCache); // Debug: Verify files
                // Note: fileoperation.js handles DOM updates for file-list
            })
            .catch(error => console.error('Error fetching file list:', error));
    }

    function addFileClickHandlers() {
        document.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', () => {
                const filename = item.getAttribute('data-filename');
                selectFile(filename);
                fetchFileContent(filename);
            });
        });
    }

    function selectFile(filename, folder = '') {
        document.querySelectorAll('.file-item').forEach(el => el.classList.remove('selected'));
        const fileItem = document.querySelector(`.file-item[data-filename="${filename}"]`);
        if (fileItem) {
            fileItem.classList.add('selected');
        }
        currentFilenameElement.value = filename;
        updateFileNameDisplay(filename);
    
        // Include folder in the fileSelected event
        const event = new CustomEvent('fileSelected', { detail: { filename: filename, folder: folder } });
        document.dispatchEvent(event);
    }

    function fetchFileContent(filename, folder = null, callback) {
        // Use provided folder, fall back to window.selectedFolder, then empty string
        const folderParam = folder !== null ? folder : (window.selectedFolder || '');
        const url = folderParam
            ? `/editor/open?filename=${encodeURIComponent(filename)}&folder=${encodeURIComponent(folderParam)}`
            : `/editor/open?filename=${encodeURIComponent(filename)}`;
        console.log('Fetching file:', { filename, folder: folderParam, url }); // Debug
        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(content => {
                markdownEditorElement.value = content;
                updatePreviewIfNeeded();
                if (callback) callback();
                console.log('File opened successfully:', filename); // Debug
                if (typeof showToast === 'function') {
                    showToast(`File "${filename}" opened`, 'success');
                }
            })
            .catch(error => {
                console.error('Error fetching file content:', error);
                if (typeof showToast === 'function') {
                    showToast(`Failed to open "${filename}": ${error.message}`, 'error');
                }
            });
    }

    function updatePreviewIfNeeded() {
        if (isPreviewMode) {
            markdownPreviewElement.innerHTML = marked.parse(markdownEditorElement.value);
            markdownEditorElement.style.display = 'none';
            markdownPreviewElement.style.display = 'block';
        } else {
            markdownEditorElement.style.display = 'block';
            markdownPreviewElement.style.display = 'none';
        }
    }

    togglePreviewCheckbox.addEventListener('change', () => {
        isPreviewMode = togglePreviewCheckbox.checked;
        updatePreviewIfNeeded();
    });

    searchInputElement.addEventListener('input', () => {
        const query = searchInputElement.value.trim();
        debounce(() => performSearch(query));
    });

    function debounce(func) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(func, DEBOUNCE_DELAY);
    }

    function performSearch(query) {
        if (query === '') {
            searchResultsElement.innerHTML = '';
            return;
        }
        searchResultsElement.innerHTML = '<p>Searching...</p>';

        // Step 1: Collect filename matches
        const filenameResults = filesCache
            .filter(filename => filename.toLowerCase().includes(query.toLowerCase()))
            .map(filename => ({ filename, type: 'filename', folder: window.selectedFolder || '', path: '' }));
        
        console.log('Filename matches for query', query, ':', filenameResults); // Debug

        // Step 2: Fetch content matches
        fetch(`/editor/search?q=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(contentResults => {
                if (!Array.isArray(contentResults)) {
                    throw new Error('Unexpected response format from /editor/search');
                }

                console.log('Content matches:', contentResults); // Debug

                // Step 3: Filter out content matches that are already matched by filename
                const contentResultsFiltered = contentResults.filter(
                    cr => !filenameResults.some(fr => fr.filename === cr.filename && (cr.folder || '') === (window.selectedFolder || ''))
                );

                // Step 4: Combine results, with filename matches first
                const combinedResults = [
                    ...filenameResults,
                    ...contentResultsFiltered.map(result => ({
                        filename: result.filename,
                        type: 'content',
                        folder: result.folder || '',
                        path: result.path || '',
                        line: result.line,
                        snippet: result.snippet
                    }))
                ];

                // Step 5: Display combined results
                displaySearchResults(combinedResults, query);

                // Step 6: Apply highlighting
                if (isPreviewMode) {
                    highlightInPreview(query);
                } else {
                    highlightAllOccurrences(query);
                }
            })
            .catch(error => {
                console.error('Error searching files:', error);
                searchResultsElement.innerHTML = '<p>Error occurred while searching.</p>';
            });
    }

    function displaySearchResults(results, query) {
        if (results.length === 0) {
            searchResultsElement.innerHTML = '<p>No results found.</p>';
            return;
        }
    
        searchResultsElement.innerHTML = results.map(result => {
            const pathDisplay = result.path ? `(in ${result.path})` : '';
            const folder = result.folder || ''; // Ensure folder is always defined
            if (result.type === 'filename') {
                return `<div class="search-result" data-filename="${result.filename}" data-folder="${folder}" data-path="${result.path}">
                            <strong>${result.filename}</strong> ${pathDisplay} (Filename Match)
                        </div>`;
            } else {
                return `<div class="search-result" data-filename="${result.filename}" data-folder="${folder}" data-line="${result.line}" data-path="${result.path}">
                            <strong>${result.filename}</strong> ${pathDisplay} (Line ${result.line}): ${highlightSnippet(result.snippet, query)}
                        </div>`;
            }
        }).join('');
        addSearchResultClickHandlers();
    }

    function highlightSnippet(snippet, query) {
        if (!snippet) return 'No snippet available';
        const regex = new RegExp(escapeRegExp(query), 'gi');
        return snippet.replace(regex, match => `<mark>${match}</mark>`);
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function addSearchResultClickHandlers() {
        document.querySelectorAll('.search-result').forEach(result => {
            result.addEventListener('click', (event) => {
                event.stopPropagation();
                const filename = result.getAttribute('data-filename');
                const folder = result.getAttribute('data-folder') || ''; // Use empty string as fallback
                const lineNumber = result.getAttribute('data-line');
                const searchText = searchInputElement.value.trim();
                console.log('Search result clicked:', { filename, folder, lineNumber });
                selectFile(filename, folder); // Pass folder to selectFile
                fetchFileContent(filename, folder, () => {
                    if (lineNumber) {
                        scrollToLineAndHighlight(parseInt(lineNumber), searchText);
                    }
                });
            });
        });
    }

    function scrollToLineAndHighlight(lineNumber, searchText) {
        if (!markdownEditorElement) {
            console.error('Editor element not found');
            return;
        }
        const content = markdownEditorElement.value;
        if (!content) {
            console.error('Editor content is empty');
            return;
        }
        const lines = content.split('\n');
        if (!lines || lineNumber < 1 || lineNumber > lines.length) {
            console.error(`Invalid line number: ${lineNumber}, total lines: ${lines ? lines.length : 0}`);
            return;
        }

        let position = 0;
        for (let i = 0; i < lineNumber - 1; i++) {
            position += lines[i].length + 1; // +1 for newline
        }

        if (isPreviewMode) {
            highlightInPreview(searchText);
        } else {
            const lineHeight = markdownEditorElement.scrollHeight / lines.length;
            markdownEditorElement.scrollTop = (lineNumber - 1) * lineHeight;
            highlightAllOccurrences(searchText);
        }
    }

    function highlightInPreview(searchText) {
        const content = markdownPreviewElement.innerHTML;
        const regex = new RegExp(escapeRegExp(searchText), 'gi');
        const highlightedContent = content.replace(regex, '<mark>$&</mark>');
        markdownPreviewElement.innerHTML = highlightedContent;

        const firstMark = markdownPreviewElement.querySelector('mark');
        if (firstMark) {
            firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        setTimeout(() => {
            markdownPreviewElement.innerHTML = content;
        }, 2000);
    }

    function highlightAllOccurrences(searchText) {
        const content = markdownEditorElement.value;
        const regex = new RegExp(escapeRegExp(searchText), 'gi');
        let match;
        const ranges = [];

        while ((match = regex.exec(content)) !== null) {
            ranges.push([match.index, match.index + match[0].length]);
        }

        if (ranges.length > 0) {
            markdownEditorElement.setSelectionRange(ranges[0][0], ranges[0][1]);
            const tempElement = document.createElement('div');
            tempElement.innerHTML = content.replace(regex, '<mark>$&</mark>');
            markdownEditorElement.value = tempElement.textContent;

            setTimeout(() => {
                markdownEditorElement.value = content;
            }, 2000);
        }
    }
});