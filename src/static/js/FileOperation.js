document.addEventListener("DOMContentLoaded", function () {
    const fileListElement = document.getElementById('file-list');
    const folderListElement = document.getElementById('folder-list');
    const markdownEditorElement = document.getElementById('markdown-editor');
    const markdownPreviewElement = document.getElementById('markdown-preview');
    const currentFilenameElement = document.getElementById('current-filename');
    const currentFileNameDisplay = document.getElementById('current-file-name');
    const tabFoldersElement = document.getElementById('tab-folders');
    const tabFilesElement = document.getElementById('tab-files');
    const tabSearchElement = document.getElementById('tab-search');
    const contentFoldersElement = document.getElementById('content-folders');
    const contentFilesElement = document.getElementById('content-files');
    const contentSearchElement = document.getElementById('content-search');
    const fileInputElement = document.getElementById('fileInput');

    let selectedFile = null;
    let selectedFolder = null;
    window.selectedFolder = selectedFolder; // Expose globally

    // Create toast container and add it to the DOM
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);

    // Add the toast CSS styles
    const toastStyles = document.createElement('style');
    toastStyles.textContent = `
        #toast-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
        }
        
        .toast {
            padding: 12px 20px;
            margin-bottom: 10px;
            border-radius: 4px;
            color: white;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            min-width: 250px;
            max-width: 350px;
            opacity: 0;
            transform: translateX(50px);
            transition: opacity 0.3s, transform 0.3s;
        }
        
        .toast.show {
            opacity: 1;
            transform: translateX(0);
        }
        
        .toast-success {
            background-color: #4caf50;
        }
        
        .toast-error {
            background-color: #f44336;
        }
        
        .toast-info {
            background-color: #2196f3;
        }
        
        .toast-warning {
            background-color: #ff9800;
        }
        
        .toast-content {
            flex: 1;
        }
        
        .toast-close {
            background: none;
            border: none;
            color: white;
            font-size: 16px;
            cursor: pointer;
            margin-left: 10px;
            opacity: 0.7;
        }
        
        .toast-close:hover {
            opacity: 1;
        }
    `;
    document.head.appendChild(toastStyles);

    // Function to create and show a toast notification
    function showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        toast.innerHTML = `
            <div class="toast-content">${message}</div>
            <button class="toast-close">×</button>
        `;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        const closeButton = toast.querySelector('.toast-close');
        closeButton.addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        });

        if (duration > 0) {
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.classList.remove('show');
                    setTimeout(() => {
                        if (toast.parentElement) {
                            toast.remove();
                        }
                    }, 300);
                }
            }, duration);
        }

        return toast;
    }

    // Tab switching logic
    function switchTab(tabElement, contentElement) {
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.content').forEach(content => content.classList.remove('active'));
        tabElement.classList.add('active');
        contentElement.classList.add('active');
    }

    // Event listeners for tab clicks
    tabFoldersElement.addEventListener('click', () => {
        switchTab(tabFoldersElement, contentFoldersElement);
        fetchFolderList();
    });

    tabFilesElement.addEventListener('click', () => {
        switchTab(tabFilesElement, contentFilesElement);
        fetchFileList();
    });

    tabSearchElement.addEventListener('click', () => {
        switchTab(tabSearchElement, contentSearchElement);
    });

    // Helper function to update the displayed filename
    function updateFileNameDisplay(filename) {
        currentFileNameDisplay.textContent = filename ? filename : "No file selected";
    }

    // Function to select a file in the file list
    function selectFileInFileList(filename) {
        document.querySelectorAll('.file-item').forEach(el => el.classList.remove('selected'));
        const fileItem = document.querySelector(`.file-item[data-filename="${filename}"]`);
        if (fileItem) {
            fileItem.classList.add('selected');
        }
        currentFilenameElement.value = filename;
        updateFileNameDisplay(filename);
    }

    // Function to select a folder in the folder list
    function selectFolderInFolderList(foldername) {
        document.querySelectorAll('.folder-item').forEach(el => el.classList.remove('selected'));
        const folderItem = document.querySelector(`.folder-item[data-foldername="${foldername}"]`);
        if (folderItem) {
            folderItem.classList.add('selected');
        }
    }

    // Fetch and display list of folders
    function fetchFolderList() {
        fetch('/editor/folders')
            .then(response => response.json())
            .then(folders => {
                if (!Array.isArray(folders)) {
                    throw new Error('Unexpected response format from /editor/folders');
                }
                folderListElement.innerHTML = folders.length > 0
                    ? folders.map(folder =>
                        `<div class="folder-item" data-foldername="${folder}">${folder}</div>`
                    ).join('')
                    : '<p>No folders found.</p>';
                addFolderClickHandlers();
            })
            .catch(error => {
                console.error('Error fetching folder list:', error);
                showToast('Failed to load folder list', 'error');
            });
    }

    // Add click handlers to folder items
    function addFolderClickHandlers() {
        document.querySelectorAll('.folder-item').forEach(item => {
            item.addEventListener('click', () => {
                const foldername = item.getAttribute('data-foldername');
                selectedFolder = foldername;
                window.selectedFolder = foldername; // Update global
                selectFolderInFolderList(foldername);
                fetchFileList();
                switchTab(tabFilesElement, contentFilesElement);
                console.log('Folder selected:', foldername); // Debug
                const event = new CustomEvent('folderSelected', { detail: { folder: foldername } });
                document.dispatchEvent(event);
            });
        });
    }

    // Fetch and display list of markdown files for the selected folder
    function fetchFileList() {
        const url = selectedFolder
            ? `/editor/files?folder=${encodeURIComponent(selectedFolder)}`
            : '/editor/files';
        fetch(url)
            .then(response => response.json())
            .then(files => {
                if (!Array.isArray(files)) {
                    throw new Error('Unexpected response format from /editor/files');
                }
                fileListElement.innerHTML = files.length > 0
                    ? files.map(file =>
                        `<div class="file-item" data-filename="${file}">${file}</div>`
                    ).join('')
                    : '<p>Select the folder.</p>';
                addFileClickHandlers();
            })
            .catch(error => {
                console.error('Error fetching file list:', error);
                showToast('Failed to load file list', 'error');
            });
    }

    // Add click handlers to file items
    function addFileClickHandlers() {
        document.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', () => {
                const filename = item.getAttribute('data-filename');
                selectFile(filename);
                fetchFileContent(filename);
            });
        });
    }

    // Select file function
    // Select file function
    function selectFile(filename) {
        selectedFile = filename;
        selectFileInFileList(filename);
        const event = new CustomEvent('fileSelected', { detail: { filename: filename, folder: selectedFolder } });
        document.dispatchEvent(event);
    }

    // Fetch file content
    function fetchFileContent(filename, folder = selectedFolder) {
        const folderParam = folder || '';
        const url = folderParam
            ? `/editor/open?filename=${encodeURIComponent(filename)}&folder=${encodeURIComponent(folderParam)}`
            : `/editor/open?filename=${encodeURIComponent(filename)}`;
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(content => {
                markdownEditorElement.value = content;
                updatePreview(content);
                currentFilenameElement.value = filename;
                updateFileNameDisplay(filename);
                console.log("File content fetched:", filename);
                showToast(`File "${filename}" opened`, 'success');
            })
            .catch(error => {
                console.error('Error fetching file content:', error);
                showToast(`Failed to open "${filename}"`, 'error');
            });
    }

    // Function to update the preview
    function updatePreview(content) {
        if (markdownPreviewElement) {
            markdownPreviewElement.innerHTML = marked.parse(content);
        }
    }

    // Handle file saving
    function handleSaveFile() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const defaultFilename = `${timestamp}.md`;
        const filename = selectedFile || currentFilenameElement.value || defaultFilename;
        console.log('Saving file:', filename);

        const payload = { filename, content: markdownEditorElement.value };
        if (selectedFolder) {
            payload.folder = selectedFolder;
        }

        fetch('/editor/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    showToast(`File "${filename}" saved successfully`, 'success');
                    fetchFileList();
                    updatePreview(markdownEditorElement.value);
                } else {
                    showToast(`Save failed: ${result.error}`, 'error');
                }
            })
            .catch(error => {
                console.error('Error saving file:', error);
                showToast('File save operation failed', 'error');
            });
    }

    // Handle creating a new file
    function handleCreateNewFile() {
        const filename = prompt('Enter new file name:', 'Untitled.md');
        if (filename) {
            const payload = { filename, content: '' };
            if (selectedFolder) {
                payload.folder = selectedFolder;
            }
            fetch('/editor/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        fetchFileList();
                        selectedFile = filename;
                        markdownEditorElement.value = '';
                        currentFilenameElement.value = filename;
                        updatePreview('');
                        updateFileNameDisplay(filename);
                        showToast(`New file "${filename}" created`, 'info');
                    } else {
                        showToast(`Create failed: ${result.error}`, 'error');
                    }
                })
                .catch(error => {
                    console.error('Error creating new file:', error);
                    showToast('File creation failed', 'error');
                });
        }
    }

    // Handle copying file
    function handleCopyFile() {
        const newFilename = prompt('Enter new name for the copy:', selectedFile);
        if (newFilename && newFilename !== selectedFile) {
            const payload = { filename: newFilename, content: markdownEditorElement.value };
            if (selectedFolder) {
                payload.folder = selectedFolder;
            }
            fetch('/editor/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        fetchFileList();
                        showToast(`File copied to "${newFilename}"`, 'success');
                    } else {
                        showToast(`Copy failed: ${result.error}`, 'error');
                    }
                })
                .catch(error => {
                    console.error('Error copying file:', error);
                    showToast('File copy operation failed', 'error');
                });
        }
    }

    // Handle file deletion
    function handleDeleteFile() {
        if (confirm('Are you sure you want to delete this file?')) {
            const payload = { filename: selectedFile };
            if (selectedFolder) {
                payload.folder = selectedFolder;
            }
            fetch('/files/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        const deletedFilename = selectedFile;
                        fetchFileList();
                        markdownEditorElement.value = '';
                        selectedFile = null;
                        currentFilenameElement.value = '';
                        updateFileNameDisplay("No file selected");
                        updatePreview('');
                        showToast(`File "${deletedFilename}" deleted`, 'warning');
                    } else {
                        showToast(`Delete failed: ${result.error}`, 'error');
                    }
                })
                .catch(error => {
                    console.error('Error deleting file:', error);
                    showToast('File deletion failed', 'error');
                });
        }
    }

    // Handle file renaming
    function handleRenameFile(currentFilename, newFilename) {
        const payload = { currentFilename, newFilename };
        if (selectedFolder) {
            payload.folder = selectedFolder;
        }
        fetch('/files/rename', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    fetchFileList();
                    showToast(`File renamed to "${newFilename}"`, 'success');
                } else {
                    showToast(`Rename failed: ${result.error}`, 'error');
                }
            })
            .catch(error => {
                console.error('Error renaming file:', error);
                showToast('File rename operation failed', 'error');
            });
    }

    // Handle file renaming via prompt
    function handleRenameFilePrompt() {
        const newFilename = prompt('Enter new filename:', selectedFile);
        if (newFilename && newFilename !== selectedFile) {
            handleRenameFile(selectedFile, newFilename);
        }
    }

    // Function to handle opening a file
    function handleOpenFile() {
        fileInputElement.click();
    }

    // Function to handle file input change event
    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                markdownEditorElement.value = e.target.result;
                updatePreview(e.target.result);
                selectedFile = file.name;
                currentFilenameElement.value = file.name;
                updateFileNameDisplay(file.name);
                showToast(`Imported "${file.name}"`, 'info');
            };
            reader.onerror = function (e) {
                console.error('There was an error reading the file:', e);
                showToast('Failed to read file', 'error');
            };
            reader.readAsText(file);
        }
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey) {
            switch (event.key) {
                case 'd': // Delete file
                    if (selectedFile) {
                        event.preventDefault();
                        handleDeleteFile();
                    }
                    break;
                case 's': // Save file
                    event.preventDefault();
                    handleSaveFile();
                    break;
                case 'x': // Copy file
                    if (selectedFile) {
                        event.preventDefault();
                        handleCopyFile();
                    }
                    break;
                case 'q': // Create new file
                    event.preventDefault();
                    handleCreateNewFile();
                    break;
                case 'r': // Rename file
                    if (selectedFile) {
                        event.preventDefault();
                        handleRenameFilePrompt();
                    }
                    break;
                case 'o': // Open file
                    event.preventDefault();
                    handleOpenFile();
                    break;
            }
        }
    });

    // Add event listener to the file input
    fileInputElement.addEventListener('change', handleFileSelect);

    // Show welcome toast on initial load
    setTimeout(() => {
        showToast('Welcome to Markdown Editor', 'info', 5000);
    }, 500);

    // Initial folder list fetch
    fetchFolderList();
});