// static/js/sharing.js
document.addEventListener('DOMContentLoaded', () => {
    const manageSharingButton = document.getElementById('manage-sharing');
    if (!manageSharingButton) return;

    // Create sharing modal
    const modal = document.createElement('div');
    modal.id = 'sharing-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">×</span>
            <h2>Manage File Sharing</h2>
            <div class="select-container">
                <label for="share-file-select">Select File:</label>
                <div class="custom-select">
                    <select id="share-file-select">
                        <option value="">Select a file</option>
                    </select>
                    <div class="select-arrow"></div>
                </div>
            </div>
            <div>
                <label for="share-with-input">Share with (usernames, comma-separated):</label>
                <input type="text" id="share-with-input" placeholder="username1, username2">
            </div>
            <button id="share-button">Share</button>
            <h3>Current Sharing Permissions</h3>
            <div class="permissions-container">
                <ul id="sharing-permissions-list"></ul>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const closeModal = modal.querySelector('.close');
    const fileSelect = modal.querySelector('#share-file-select');
    const shareWithInput = modal.querySelector('#share-with-input');
    const shareButton = modal.querySelector('#share-button');
    const permissionsList = modal.querySelector('#sharing-permissions-list');

    // Open modal
    manageSharingButton.addEventListener('click', () => {
        modal.style.display = 'block';
        loadFiles();
        loadSharingPermissions();
    });

    // Close modal
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Load user's markdown files (all owned files across folders)
    async function loadFiles() {
        try {
            const response = await fetch('/editor/all_owned_files');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const files = await response.json();
            fileSelect.innerHTML = '<option value="">Select a file</option>';
            files.forEach(file => {
                const option = document.createElement('option');
                option.value = JSON.stringify({ filename: file.filename, folder: file.folder });
                option.textContent = file.folder ? `${file.folder}/${file.filename}` : file.filename;
                fileSelect.appendChild(option);
            });
            if (files.length === 0) {
                fileSelect.innerHTML += '<option value="">No markdown files found</option>';
            }
        } catch (error) {
            console.error('Error loading files:', error);
            alert('Failed to load files. Please try again.');
        }
    }

    // Load current sharing permissions
    async function loadSharingPermissions() {
        try {
            const response = await fetch('/sharing/sharing_permissions');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const permissions = await response.json();
            permissionsList.innerHTML = '';
            for (const [filename, shares] of Object.entries(permissions)) {
                shares.forEach(share => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <div class="permission-item">
                            <div class="permission-info">
                                <span class="shared-file">${filename}</span>
                                <span class="shared-with">shared with ${share.recipient} (as ${share.unique_filename})</span>
                            </div>
                            <button class="unshare-button" data-filename="${filename}" data-recipient="${share.recipient}">Unshare</button>
                        </div>
                    `;
                    permissionsList.appendChild(li);
                });
            }
            // Add event listeners for unshare buttons
            document.querySelectorAll('.unshare-button').forEach(button => {
                button.addEventListener('click', async () => {
                    const filename = button.dataset.filename;
                    const recipient = button.dataset.recipient;
                    await unshareFile(filename, [recipient]);
                });
            });
        } catch (error) {
            console.error('Error loading sharing permissions:', error);
            alert('Failed to load sharing permissions.');
        }
    }

    // Share file
    shareButton.addEventListener('click', async () => {
        const selectedValue = fileSelect.value;
        if (!selectedValue || selectedValue === '') {
            alert('Please select a file.');
            return;
        }
        const { filename, folder } = JSON.parse(selectedValue);
        const shareWith = shareWithInput.value.split(',').map(u => u.trim()).filter(u => u);
        if (!filename || !shareWith.length) {
            alert('Please select a file and enter usernames to share with.');
            return;
        }

        try {
            const response = await fetch('/sharing/share_file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename, folder, share_with: shareWith })
            });
            const result = await response.json();
            if (result.success) {
                alert('File shared successfully!');
                shareWithInput.value = '';
                loadSharingPermissions();
            } else {
                if (result.upgrade_required) {
                    alert(result.error + ' Please upgrade to premium.');
                } else {
                    alert('Error: ' + result.error);
                }
            }
        } catch (error) {
            console.error('Error sharing file:', error);
            alert('Failed to share file.');
        }
    });

    // Unshare file
    async function unshareFile(filename, recipients) {
        if (!confirm(`Remove sharing for ${filename} with ${recipients.join(', ')}?`)) return;

        try {
            const response = await fetch('/sharing/unshare_file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename, folder: '', unshare_with: recipients })
            });
            const result = await response.json();
            if (result.success) {
                alert('File unshared successfully!');
                loadSharingPermissions();
            } else {
                if (result.upgrade_required) {
                    alert(result.error + ' Please upgrade to premium.');
                } else {
                    alert('Error: ' + result.error);
                }
            }
        } catch (error) {
            console.error('Error unsharing file:', error);
            alert('Failed to unshare file.');
        }
    }
});

// CSS for the modal (updated)
const style = document.createElement('style');
style.textContent = `
    .modal {
        display: none;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
    }
    .modal-content {
        background-color: var(--modal-bg, #fff);
        color: var(--text-color, #1f2a44);
        margin: 10% auto;
        padding: 25px;
        border: 1px solid var(--modal-border, #d9e1e8);
        width: 80%;
        max-width: 600px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .close {
        color: var(--button-text, #aaa);
        float: right;
        font-size: 28px;
        font-weight: bold;
        cursor: pointer;
        transition: color 0.2s;
    }
    .close:hover,
    .close:focus {
        color: var(--text-color, #000);
        text-decoration: none;
    }
    #sharing-modal h2, #sharing-modal h3 {
        margin-bottom: 18px;
        color: var(--text-color, #1f2a44);
    }
    #sharing-modal div {
        margin-bottom: 15px;
    }
    #sharing-modal label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
    }
    
    /* Custom Select Styling */
    .select-container {
        position: relative;
    }
    .custom-select {
        position: relative;
        width: 100%;
    }
    #sharing-modal select {
        width: 100%;
        padding: 10px 14px;
        border: 1px solid var(--search-input-border, #c5d0db);
        border-radius: 6px;
        background-color: var(--search-input-bg, #f7f9fc);
        color: var(--text-color, #1f2a44);
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        cursor: pointer;
        font-size: 14px;
    }
    .select-arrow {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 6px solid var(--button-text, #5c6b80);
        pointer-events: none;
    }
    
    /* Styling for dropdown appearance */
    #share-file-select {
        max-height: 200px;
        overflow-y: auto;
    }
    #share-file-select option {
        padding: 8px;
        font-size: 14px;
    }
    
    #sharing-modal input {
        width: 100%;
        padding: 10px 14px;
        border: 1px solid var(--search-input-border, #c5d0db);
        border-radius: 6px;
        background-color: var(--search-input-bg, #f7f9fc);
        color: var(--text-color, #1f2a44);
        font-size: 14px;
    }
    #sharing-modal button {
        padding: 10px 20px;
        background-color: var(--fancy-button-bg, #007bff);
        color: var(--fancy-button-text, #fff);
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        transition: background-color 0.2s;
    }
    #sharing-modal button:hover {
        background-color: var(--fancy-button-hover-bg, #0056b3);
    }
    
    /* Permissions list styling */
    .permissions-container {
        max-height: 200px;
        overflow-y: auto;
        border: 1px solid var(--file-item-border, #d9e1e8);
        border-radius: 6px;
        padding: 5px;
        background-color: var(--search-input-bg, #f7f9fc);
    }
    #sharing-permissions-list {
        list-style: none;
        padding: 0;
        margin: 0;
    }
    #sharing-permissions-list li {
        margin-bottom: 5px;
    }
    .permission-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px;
        border-radius: 4px;
        background-color: var(--modal-bg, #fff);
        border: 1px solid var(--file-item-border, #d9e1e8);
    }
    .permission-info {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
    }
    .shared-file {
        font-weight: 500;
        margin-bottom: 3px;
    }
    .shared-with {
        font-size: 12px;
        color: var(--button-text, #5c6b80);
    }
    .unshare-button {
        padding: 6px 12px !important;
        font-size: 12px;
        background-color: var(--highlight-red, #dc3545) !important;
        margin-left: 10px;
        white-space: nowrap;
    }
    .unshare-button:hover {
        background-color: #c82333 !important;
    }
    
    /* Add scrollbar styling */
    .permissions-container::-webkit-scrollbar,
    #share-file-select::-webkit-scrollbar {
        width: 8px;
    }
    .permissions-container::-webkit-scrollbar-track,
    #share-file-select::-webkit-scrollbar-track {
        background: var(--search-input-bg, #f7f9fc);
        border-radius: 4px;
    }
    .permissions-container::-webkit-scrollbar-thumb,
    #share-file-select::-webkit-scrollbar-thumb {
        background-color: var(--search-input-border, #c5d0db);
        border-radius: 4px;
    }
    .permissions-container::-webkit-scrollbar-thumb:hover,
    #share-file-select::-webkit-scrollbar-thumb:hover {
        background-color: var(--button-text, #5c6b80);
    }
`;
document.head.appendChild(style);