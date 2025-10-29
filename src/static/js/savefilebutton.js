document.addEventListener("DOMContentLoaded", function () {
    // Get necessary DOM elements
    const markdownEditorElement = document.getElementById('markdown-editor');
    const currentFilenameElement = document.getElementById('current-filename');
    
    // Get selectedFolder from global scope (exposed in fileoperation.js)
    let selectedFolder = window.selectedFolder;
    let selectedFile = null; // Track currently selected file

    // Listen for file selection events to update selectedFile
    document.addEventListener('fileSelected', (event) => {
        selectedFile = event.detail.filename;
        selectedFolder = event.detail.folder;
    });

    // Function to show toast notifications (reused from fileoperation.js)
    function showToast(message, type = 'info', duration = 3000) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            console.error('Toast container not found');
            return;
        }

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
    }

    // Save file function (based on handleSaveFile from fileoperation.js)
    window.saveFile = function () {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const defaultFilename = `${timestamp}.md`;
        const filename = selectedFile || currentFilenameElement.value || defaultFilename;

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
                    // Trigger file list refresh
                    document.dispatchEvent(new CustomEvent('fileSaved', { detail: { filename } }));
                    // Update selectedFile if it was a new file
                    if (!selectedFile) {
                        selectedFile = filename;
                    }
                } else {
                    showToast(`Save failed: ${result.error}`, 'error');
                }
            })
            .catch(error => {
                console.error('Error saving file:', error);
                showToast('File save operation failed', 'error');
            });
    };
});