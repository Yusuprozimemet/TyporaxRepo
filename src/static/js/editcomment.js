// TyporaX/src/static/js/editcomment.js

// Initialize edit modal
const editModal = document.getElementById('edit-modal');
const editButton = document.getElementById('edit-button');
const editContent = document.getElementById('edit-content');
const saveEditButton = document.getElementById('save-edit-button');
const editCloseModal = editModal ? editModal.querySelector('.close-modal') : null;

// Initialize comment modal
const commentModal = document.getElementById('comment-modal');
const commentButton = document.getElementById('comment-button');
const commentText = document.getElementById('comment-text');
const submitCommentButton = document.getElementById('submit-comment-button');
const commentCloseModal = commentModal ? commentModal.querySelector('.close-modal') : null;

// Initialize permissions modal
const permissionsModal = document.getElementById('permissions-modal');
const permissionsButton = document.getElementById('permissions-button');
const addPermissionUsername = document.getElementById('add-permission-username');
const addPermissionButton = document.getElementById('add-permission-button');
const permissionsList = document.getElementById('permissions-list');
const permissionsCloseModal = permissionsModal ? permissionsModal.querySelector('.close-modal') : null;

// Initialize comments section
const commentsList = document.getElementById('comments-list');

// Get current username (assumed to be set by backend in a global variable)
const currentUsername = window.currentUsername || null; // Backend should set this, e.g., via template

// Function to open edit modal and populate with current content
function openEditModal(publicId) {
    if (!editModal || !editContent || !document.getElementById('edit-tags')) return;
    editContent.value = rawMarkdown; // rawMarkdown is defined in public_file.html
    // Fetch existing tags
    fetch(`/public/permissions/${publicId}`) // Using permissions endpoint to get metadata
        .then(response => response.json())
        .then(result => {
            if (result.success && result.permitted_users) {
                // Fetch metadata to get tags
                fetch(`/public/view/${publicId}/metadata`)
                    .then(response => response.json())
                    .then(metadata => {
                        const tags = metadata.tags || [];
                        document.getElementById('edit-tags').value = tags.join(', ');
                    })
                    .catch(error => {
                        console.error('Error fetching metadata:', error);
                        document.getElementById('edit-tags').value = '';
                    });
            } else {
                document.getElementById('edit-tags').value = '';
            }
        })
        .catch(error => {
            console.error('Error fetching permissions:', error);
            document.getElementById('edit-tags').value = '';
        });
    editModal.style.display = 'block';
    saveEditButton.setAttribute('data-public-id', publicId);
}

// Function to close edit modal
function closeEditModal() {
    if (!editModal) return;
    editModal.style.display = 'none';
    editContent.value = '';
}

// Function to save edited content
function saveEdit(publicId) {
    const content = editContent.value.trim();
    const tagsInput = document.getElementById('edit-tags').value;
    const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
    if (!content) {
        alert('Content cannot be empty');
        return;
    }

    fetch(`/public/edit/${publicId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, tags })
    })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                alert('File updated successfully');
                window.location.reload();
            } else {
                alert(`Edit failed: ${result.error}`);
            }
        })
        .catch(error => {
            console.error('Error editing file:', error);
            alert('Edit operation failed');
        });
}

// Function to open comment modal
function openCommentModal(publicId) {
    if (!commentModal || !commentText) return;
    commentText.value = '';
    commentModal.style.display = 'block';
    submitCommentButton.setAttribute('data-public-id', publicId);
}

// Function to close comment modal
function closeCommentModal() {
    if (!commentModal) return;
    commentModal.style.display = 'none';
    commentText.value = '';
}

// Function to submit a comment
function submitComment(publicId) {
    const comment = commentText.value.trim();
    if (!comment) {
        alert('Comment cannot be empty');
        return;
    }

    fetch(`/public/comment/${publicId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment })
    })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                alert('Comment submitted successfully');
                closeCommentModal();
                fetchComments(publicId);
            } else {
                alert(`Comment submission failed: ${result.error}`);
            }
        })
        .catch(error => {
            console.error('Error submitting comment:', error);
            alert('Comment submission failed');
        });
}

// Function to delete a comment
function deleteComment(publicId, commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    fetch(`/public/comment/${publicId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_id: commentId })
    })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                alert('Comment deleted successfully');
                fetchComments(publicId);
            } else {
                alert(`Delete failed: ${result.error}`);
            }
        })
        .catch(error => {
            console.error('Error deleting comment:', error);
            alert('Delete operation failed');
        });
}

// Function to fetch and display comments
function fetchComments(publicId) {
    if (!commentsList) return;

    fetch(`/public/comments/${publicId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch comments');
            }
            return response.json();
        })
        .then(result => {
            commentsList.innerHTML = '';
            if (!result.success || !result.comments || result.comments.length === 0) {
                commentsList.innerHTML = '<p class="no-comments">No comments yet.</p>';
                return;
            }
            result.comments.forEach(comment => {
                const isOwnComment = currentUsername && comment.username === currentUsername;
                const commentElement = document.createElement('div');
                commentElement.className = `comment ${isOwnComment ? 'own-comment' : ''}`;
                commentElement.innerHTML = `
                    <div class="comment-author">${comment.username}</div>
                    <div class="comment-text">${comment.text}</div>
                    <div class="comment-meta">Posted on ${new Date(comment.created_at).toLocaleString()}</div>
                    <div class="comment-actions">
                        ${isOwnComment ? `<button class="btn btn-delete-comment" data-comment-id="${comment.comment_id}" data-public-id="${publicId}">Delete</button>` : ''}
                    </div>
                `;
                commentsList.appendChild(commentElement);
            });
            // Add event listeners for delete buttons
            document.querySelectorAll('.btn-delete-comment').forEach(button => {
                button.addEventListener('click', () => {
                    const commentId = button.getAttribute('data-comment-id');
                    const publicId = button.getAttribute('data-public-id');
                    deleteComment(publicId, commentId);
                });
            });
        })
        .catch(error => {
            console.error('Error fetching comments:', error);
            commentsList.innerHTML = '<p class="no-comments">No comments yet.</p>';
        });
}

// Function to open permissions modal and fetch permitted users
function openPermissionsModal(publicId) {
    if (!permissionsModal) return;
    permissionsModal.style.display = 'block';
    addPermissionButton.setAttribute('data-public-id', publicId);
    fetchPermissions(publicId);
}

// Function to close permissions modal
function closePermissionsModal() {
    if (!permissionsModal) return;
    permissionsModal.style.display = 'none';
    addPermissionUsername.value = '';
    permissionsList.innerHTML = '';
}

// Function to fetch permitted users
function fetchPermissions(publicId) {
    if (!permissionsList) return;

    fetch(`/public/permissions/${publicId}`)
        .then(response => response.json())
        .then(result => {
            permissionsList.innerHTML = '';
            if (!result.success || !result.permitted_users || result.permitted_users.length === 0) {
                permissionsList.innerHTML = '<p>No users have edit permissions.</p>';
                return;
            }
            result.permitted_users.forEach(username => {
                const permissionItem = document.createElement('div');
                permissionItem.className = 'permission-item';
                permissionItem.innerHTML = `
                    <span>${username}</span>
                    <i class="fas fa-trash remove-permission" data-username="${username}" data-public-id="${publicId}"></i>
                `;
                permissionsList.appendChild(permissionItem);
            });
            document.querySelectorAll('.remove-permission').forEach(button => {
                button.addEventListener('click', () => {
                    const username = button.getAttribute('data-username');
                    const publicId = button.getAttribute('data-public-id');
                    removePermission(publicId, username);
                });
            });
        })
        .catch(error => {
            console.error('Error fetching permissions:', error);
            permissionsList.innerHTML = '<p>Failed to load permissions.</p>';
        });
}

// Function to add edit permission for a user
function addPermission(publicId, username) {
    if (!username) {
        alert('Username cannot be empty');
        return;
    }

    fetch(`/public/permissions/${publicId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
    })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                alert('Permission added successfully');
                addPermissionUsername.value = '';
                fetchPermissions(publicId);
            } else {
                alert(`Failed to add permission: ${result.error}`);
            }
        })
        .catch(error => {
            console.error('Error adding permission:', error);
            alert('Failed to add permission');
        });
}

// Function to remove edit permission for a user
function removePermission(publicId, username) {
    if (!confirm(`Are you sure you want to remove edit permission for ${username}?`)) {
        return;
    }

    fetch(`/public/permissions/${publicId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
    })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                alert('Permission removed successfully');
                fetchPermissions(publicId);
            } else {
                alert(`Failed to remove permission: ${result.error}`);
            }
        })
        .catch(error => {
            console.error('Error removing permission:', error);
            alert('Failed to remove permission');
        });
}

// Event listeners
if (editButton) {
    editButton.addEventListener('click', () => {
        const publicId = editButton.getAttribute('data-public-id');
        openEditModal(publicId);
    });
}

if (editCloseModal) {
    editCloseModal.addEventListener('click', closeEditModal);
}

if (saveEditButton) {
    saveEditButton.addEventListener('click', () => {
        const publicId = saveEditButton.getAttribute('data-public-id');
        saveEdit(publicId);
    });
}

if (commentButton) {
    commentButton.addEventListener('click', () => {
        const publicId = commentButton.getAttribute('data-public-id');
        openCommentModal(publicId);
    });
}

if (commentCloseModal) {
    commentCloseModal.addEventListener('click', closeCommentModal);
}

if (submitCommentButton) {
    submitCommentButton.addEventListener('click', () => {
        const publicId = submitCommentButton.getAttribute('data-public-id');
        submitComment(publicId);
    });
}

if (permissionsButton) {
    permissionsButton.addEventListener('click', () => {
        const publicId = permissionsButton.getAttribute('data-public-id');
        openPermissionsModal(publicId);
    });
}

if (permissionsCloseModal) {
    permissionsCloseModal.addEventListener('click', closePermissionsModal);
}

if (addPermissionButton) {
    addPermissionButton.addEventListener('click', () => {
        const publicId = addPermissionButton.getAttribute('data-public-id');
        const username = addPermissionUsername.value.trim();
        addPermission(publicId, username);
    });
}

// Close modals when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === editModal) {
        closeEditModal();
    }
    if (event.target === commentModal) {
        closeCommentModal();
    }
    if (event.target === permissionsModal) {
        closePermissionsModal();
    }
});

// Fetch comments on page load if viewing a specific file
const publicId = document.getElementById('edit-button')?.getAttribute('data-public-id') ||
    document.getElementById('comment-button')?.getAttribute('data-public-id');
if (publicId && commentsList) {
    fetchComments(publicId);
}