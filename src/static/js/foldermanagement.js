/**
 * Folder Management System
 * Handles creation, renaming, and deletion of folders for premium users, integrated with fileoperation.js
 */

document.addEventListener('DOMContentLoaded', function () {
    // Set up folder management for premium users
    setupFolderManagement();

    // Listen for folder selection events from fileoperation.js
    document.addEventListener('folderSelected', (e) => {
        const folder = e.detail.folder;
        highlightSelectedFolder(folder);
    });
});

/**
 * Highlight the selected folder
 */
function highlightSelectedFolder(folder) {
    document.querySelectorAll('.folder-item').forEach(item => {
        item.classList.remove('selected');
    });
    const folderItem = document.querySelector(`.folder-item[data-foldername="${folder}"]`);
    if (folderItem) {
        folderItem.classList.add('selected');
    }
}

/**
 * Set up folder management modal and button
 */
function setupFolderManagement() {
    const manageFolderBtn = document.getElementById('folder-management-btn');
    if (!manageFolderBtn) return; // Not a premium user

    // Create modal HTML (styles are in external CSS)
    const modalHTML = `
        <div id="folder-modal" class="modal">
            <div class="modal-content">
                <h2>Folder Management</h2>
                
                <div class="folder-actions">
                    <div class="action-section">
                        <h3>Create New Folder</h3>
                        <div class="input-group">
                            <input type="text" id="new-folder-name" placeholder="Folder name">
                            <button id="create-folder-btn" class="btn">Create</button>
                        </div>
                    </div>
                    
                    <div class="action-section">
                        <h3>Rename Folder</h3>
                        <div class="input-group">
                            <select id="rename-folder-select">
                                <option value="">Select a folder</option>
                            </select>
                            <input type="text" id="renamed-folder-name" placeholder="New name">
                            <button id="rename-folder-btn" class="btn">Rename</button>
                        </div>
                    </div>
                    
                    <div class="action-section">
                        <h3>Delete Folder</h3>
                        <div class="input-group">
                            <select id="delete-folder-select">
                                <option value="">Select a folder</option>
                            </select>
                            <button id="delete-folder-btn" class="btn btn-danger">Delete</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Append modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Set up event listeners
    manageFolderBtn.addEventListener('click', openFolderModal);
    document.querySelector('.close-modal').addEventListener('click', closeFolderModal);
    document.getElementById('create-folder-btn').addEventListener('click', createFolder);
    document.getElementById('rename-folder-btn').addEventListener('click', renameFolder);
    document.getElementById('delete-folder-btn').addEventListener('click', deleteFolder);

    // Close modal when clicking outside
    window.addEventListener('click', function (event) {
        const modal = document.getElementById('folder-modal');
        if (event.target === modal) {
            closeFolderModal();
        }
    });
}

/**
 * Open folder management modal
 */
function openFolderModal() {
    const modal = document.getElementById('folder-modal');
    modal.style.display = 'block';
    refreshFolderDropdowns();
}

/**
 * Close folder management modal
 */
function closeFolderModal() {
    const modal = document.getElementById('folder-modal');
    modal.style.display = 'none';
}

/**
 * Refresh folder dropdown selections
 */
function refreshFolderDropdowns() {
    fetch('/editor/folders')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(folders => {
            if (!Array.isArray(folders)) {
                throw new Error('Unexpected response format from /editor/folders');
            }
            const renameSelect = document.getElementById('rename-folder-select');
            const deleteSelect = document.getElementById('delete-folder-select');

            renameSelect.innerHTML = '<option value="">Select a folder</option>';
            deleteSelect.innerHTML = '<option value="">Select a folder</option>';

            folders.forEach(folder => {
                const renameOption = document.createElement('option');
                renameOption.value = folder;
                renameOption.textContent = folder;
                renameSelect.appendChild(renameOption);

                const deleteOption = document.createElement('option');
                deleteOption.value = folder;
                deleteOption.textContent = folder;
                deleteSelect.appendChild(deleteOption);
            });
        })
        .catch(error => {
            console.error('Error refreshing folder dropdowns:', error);
            showToast('Failed to load folder list', 'error');
        });
}

/**
 * Wrapper for fetchFolderList to ensure UI update with fallback
 */
async function refreshFolderList() {
    try {
        if (typeof fetchFolderList === 'function') {
            await fetchFolderList(); // From fileoperation.js
        } else {
            console.warn('fetchFolderList not available, using fallback');
            const response = await fetch('/editor/folders');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const folders = await response.json();
            if (!Array.isArray(folders)) {
                throw new Error('Unexpected response format from /editor/folders');
            }
            const folderListElement = document.getElementById('folder-list');
            folderListElement.innerHTML = folders.length > 0
                ? folders.map(folder => `<div class="folder-item" data-foldername="${folder}">${folder}</div>`).join('')
                : '<p>No folders found.</p>';
            // Re-apply click handlers to mimic addFolderClickHandlers from fileoperation.js
            document.querySelectorAll('.folder-item').forEach(item => {
                item.addEventListener('click', () => {
                    const foldername = item.getAttribute('data-foldername');
                    window.selectedFolder = foldername;
                    highlightSelectedFolder(foldername);
                    if (typeof fetchFileList === 'function') {
                        fetchFileList();
                    }
                    if (typeof switchTab === 'function') {
                        switchTab(document.getElementById('tab-files'), document.getElementById('content-files'));
                    }
                    const event = new CustomEvent('folderSelected', { detail: { folder: foldername } });
                    document.dispatchEvent(event);
                });
            });
        }
        // Force UI refresh with slight delay to ensure DOM update
        setTimeout(() => {
            const event = new CustomEvent('folderSelected', { detail: { folder: window.selectedFolder } });
            document.dispatchEvent(event);
        }, 100);
    } catch (error) {
        console.error('Error refreshing folder list:', error);
        showToast(`Failed to refresh folder list: ${error.message}`, 'error');
    }
}

/**
 * Create a new folder
 */
async function createFolder() {
    const folderName = document.getElementById('new-folder-name').value.trim();

    if (!folderName) {
        showToast('Please enter a folder name', 'error');
        return;
    }

    try {
        const response = await fetch('/editor/create_folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder: folderName })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Create folder response:', data); // Debug log

        if (data.success) {
            showToast(`Folder "${folderName}" created`, 'success');
            document.getElementById('new-folder-name').value = '';
            await refreshFolderList();
            refreshFolderDropdowns();
            closeFolderModal();
        } else {
            showToast(`Create failed: ${data.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('Error creating folder:', error);
        showToast(`Failed to create folder: ${error.message}`, 'error');
    }
}

/**
 * Rename a folder
 */
async function renameFolder() {
    const oldFolderName = document.getElementById('rename-folder-select').value;
    const newFolderName = document.getElementById('renamed-folder-name').value.trim();

    if (!oldFolderName) {
        showToast('Please select a folder to rename', 'error');
        return;
    }

    if (!newFolderName) {
        showToast('Please enter a new folder name', 'error');
        return;
    }

    try {
        const response = await fetch('/editor/rename_folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ old_folder: oldFolderName, new_folder: newFolderName })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Rename folder response:', data); // Debug log

        if (data.success) {
            showToast(`Folder renamed to "${newFolderName}"`, 'success');
            document.getElementById('rename-folder-select').value = '';
            document.getElementById('renamed-folder-name').value = '';
            await refreshFolderList();
            refreshFolderDropdowns();

            // Update selected folder if necessary
            if (window.selectedFolder === oldFolderName) {
                window.selectedFolder = newFolderName;
                const event = new CustomEvent('folderSelected', { detail: { folder: newFolderName } });
                document.dispatchEvent(event);
            }
            closeFolderModal();
        } else {
            showToast(`Rename failed: ${data.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('Error renaming folder:', error);
        showToast(`Failed to rename folder: ${error.message}`, 'error');
    }
}

/**
 * Delete a folder
 */
async function deleteFolder() {
    const folderName = document.getElementById('delete-folder-select').value;

    if (!folderName) {
        showToast('Please select a folder to delete', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to delete the folder "${folderName}" and all its contents?`)) {
        return;
    }

    try {
        const response = await fetch('/editor/delete_folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder: folderName })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Delete folder response:', data); // Debug log

        if (data.success) {
            showToast(`Folder "${folderName}" deleted`, 'warning');
            document.getElementById('delete-folder-select').value = '';
            await refreshFolderList();
            refreshFolderDropdowns();

            // Reset to root if current folder was deleted
            if (window.selectedFolder === folderName) {
                window.selectedFolder = null;
                const event = new CustomEvent('folderSelected', { detail: { folder: null } });
                document.dispatchEvent(event);
            }
            closeFolderModal();
        } else {
            showToast(`Delete failed: ${data.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('Error deleting folder:', error);
        showToast(`Failed to delete folder: ${error.message}`, 'error');
    }
}