document.addEventListener("DOMContentLoaded", function () {
    const publishButton = document.getElementById('publish-button');
    const markdownEditorElement = document.getElementById('markdown-editor');
    const currentFilenameElement = document.getElementById('current-filename');
    const publishModal = document.createElement('div');
    publishModal.id = 'publish-modal';
    publishModal.className = 'modal';
    publishModal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">×</span>
            <h2>Publish File</h2>
            <form id="publish-form">
                <div class="input-group">
                    <label for="display-filename">Display Filename</label>
                    <input type="text" id="display-filename" name="display-filename" required>
                </div>
                <div class="input-group">
                    <label for="display-username">Display Username</label>
                    <input type="text" id="display-username" name="display-username" required>
                </div>
                <div class="input-group">
                    <label for="tags">Tags (comma-separated)</label>
                    <input type="text" id="tags" name="tags" placeholder="e.g., guide, tutorial, tech">
                </div>
                <button type="submit" class="publish-btn">Publish</button>
            </form>
        </div>
    `;
    document.body.appendChild(publishModal);

    // Function to create and show a toast notification (reusing from fileoperation.js)
    function showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">${message}</div>
            <button class="toast-close">×</button>
        `;
        document.getElementById('toast-container').appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        const closeButton = toast.querySelector('.toast-close');
        closeButton.addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        });
        if (duration > 0) {
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.classList.remove('show');
                    setTimeout(() => {
                        if (toast.parentElement) toast.remove();
                    }, 300);
                }
            }, duration);
        }
    }

    // Handle modal visibility
    function showPublishModal() {
        publishModal.style.display = 'block';
        document.getElementById('display-filename').value = currentFilenameElement.value;
        document.getElementById('display-username').value = document.body.dataset.username || '';
    }

    function hidePublishModal() {
        publishModal.style.display = 'none';
        document.getElementById('publish-form').reset();
    }

    publishButton.addEventListener('click', () => {
        if (!currentFilenameElement.value) {
            showToast('No file selected for publishing', 'error');
            return;
        }
        showPublishModal();
    });

    publishModal.querySelector('.close-modal').addEventListener('click', hidePublishModal);

    document.getElementById('publish-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const filename = currentFilenameElement.value;
        const content = markdownEditorElement.value;
        const folder = window.selectedFolder || '';
        const displayFilename = document.getElementById('display-filename').value;
        const displayUsername = document.getElementById('display-username').value;
        const tags = document.getElementById('tags').value.split(',').map(tag => tag.trim()).filter(tag => tag);

        if (!displayFilename || !displayUsername) {
            showToast('Display filename and username are required', 'error');
            return;
        }

        const payload = { filename, content, folder, display_filename: displayFilename, display_username: displayUsername, tags };

        fetch('/editor/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    const publicUrl = result.public_url;
                    showToast(
                        `File "${displayFilename}" by ${displayUsername} published successfully! <a href="${publicUrl}" target="_blank">View</a>`,
                        'success',
                        5000
                    );
                    hidePublishModal();
                } else {
                    showToast(`Publish failed: ${result.error}`, 'error');
                }
            })
            .catch(error => {
                console.error('Error publishing file:', error);
                showToast('File publish operation failed', 'error');
            });
    });

    // Handle unpublish button (assumes button is in editor or public view)
    const unpublishButton = document.getElementById('unpublish-button');
    if (unpublishButton) {
        unpublishButton.addEventListener('click', () => {
            const publicId = unpublishButton.dataset.publicId; // Assume public_id is set in editor or public view
            if (!publicId) {
                showToast('No public ID available for unpublishing', 'error');
                return;
            }

            if (confirm('Are you sure you want to unpublish this file?')) {
                fetch(`/public/unpublish/${publicId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' }
                })
                    .then(response => response.json())
                    .then(result => {
                        if (result.success) {
                            showToast('File unpublished successfully', 'success');
                            // Optionally redirect or refresh
                            window.location.href = '/public/view';
                        } else {
                            showToast(`Unpublish failed: ${result.error}`, 'error');
                        }
                    })
                    .catch(error => {
                        console.error('Error unpublishing file:', error);
                        showToast('Unpublish operation failed', 'error');
                    });
            }
        });
    }
});