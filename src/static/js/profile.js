// static/js/profile.js
document.addEventListener('DOMContentLoaded', function () {
    // Function to apply theme based on preference
    function applyTheme(theme) {
        console.debug(`Applying theme: ${theme}`);
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.checked = theme === 'dark';
        }
    }

    // Fetch profile data on page load to apply theme
    fetch('/profile/get_profile', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                    console.debug('User not logged in, using default theme');
                    applyTheme(localStorage.getItem('theme') || 'light'); // Fallback to localStorage or light
                    return null;
                }
                return response.text().then(text => {
                    throw new Error(`HTTP ${response.status}: ${text}`);
                });
            }
            return response.json();
        })
        .then(data => {
            if (data && !data.error) {
                console.debug(`Profile fetched: theme_preference=${data.theme_preference}`);
                applyTheme(data.theme_preference || 'light');
            } else if (data && data.error) {
                console.error('Error fetching profile:', data.error);
                applyTheme(localStorage.getItem('theme') || 'light'); // Fallback
            }
        })
        .catch(error => {
            console.error('Error fetching profile on load:', error);
            applyTheme(localStorage.getItem('theme') || 'light'); // Fallback
        });

    const logoDiv = document.querySelector('.menu-item.typorax-title');
    if (!logoDiv) {
        console.error('Logo div not found');
        return;
    }

    logoDiv.addEventListener('click', function () {
        // Prevent multiple modals
        if (document.querySelector('.profile-modal')) {
            return;
        }

        fetch('/profile/get_profile', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error('Please log in to view your profile');
                    }
                    return response.text().then(text => {
                        throw new Error(`HTTP ${response.status}: ${text}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    console.error('Error fetching profile:', data.error);
                    showModal({ username: 'Guest', error: data.error });
                    return;
                }
                console.debug(`Opening profile modal: theme_preference=${data.theme_preference}`);
                showModal(data);
            })
            .catch(error => {
                console.error('Error fetching profile:', error);
                showModal({ username: 'Guest', error: error.message });
            });
    });

    function showModal(data) {
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'profile-modal-overlay';

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'profile-modal';

        // Create profile header with profile picture
        const profilePictureSection = `
            <div class="profile-header">
                <div class="profile-picture-container">
                    ${data.profile_picture
                ? `<img src="data:image/png;base64,${data.profile_picture}" alt="${data.username || 'User'}" class="profile-avatar">`
                : `<div class="profile-avatar-placeholder">${(data.username || 'U')[0].toUpperCase()}</div>`
            }
                    <div class="profile-picture-upload">
                        <label for="profile-picture-input" class="upload-label">
                            <span class="upload-icon">📷</span>
                        </label>
                        <input id="profile-picture-input" type="file" name="profile_picture" accept="image/png,image/jpeg" class="profile-picture-input">
                    </div>
                </div>
                <h2 class="profile-name">${data.username || 'Guest'}</h2>
                <span class="profile-type">${data.user_type || 'Standard'} User</span>
            </div>
        `;

        modalContent.innerHTML = `
            <div class="modal-content-wrapper">
                ${profilePictureSection}
                ${data.error ? `<p class="error">${data.error}</p>` : ''}
                <form id="profile-form" enctype="multipart/form-data">
                    <div class="profile-form-fields">
                        <div class="profile-field">
                            <label><strong>Username</strong></label>
                            <input type="text" name="username" value="${data.username || ''}" required>
                        </div>
                        <div class="profile-field">
                            <label><strong>Email</strong></label>
                            <input type="email" name="email" value="${data.email || ''}" required>
                        </div>
                        <div class="profile-field">
                            <label><strong>User Type</strong></label>
                            <span class="field-value">${data.user_type || 'Standard'}</span>
                        </div>
                        <div class="profile-field">
                            <label><strong>Theme Preference</strong></label>
                            <select name="theme_preference" required>
                                <option value="light" ${data.theme_preference === 'light' ? 'selected' : ''}>Light</option>
                                <option value="dark" ${data.theme_preference === 'dark' ? 'selected' : ''}>Dark</option>
                            </select>
                        </div>
                        <div class="profile-field">
                            <label><strong>Language Preference</strong></label>
                            <select name="language_preference" required>
                                <option value="dutch" ${data.language_preference === 'dutch' ? 'selected' : ''}>Dutch</option>
                                <option value="english" ${data.language_preference === 'english' ? 'selected' : ''}>English</option>
                                <option value="italian" ${data.language_preference === 'italian' ? 'selected' : ''}>Italian</option>
                                <option value="french" ${data.language_preference === 'french' ? 'selected' : ''}>French</option>
                                <option value="german" ${data.language_preference === 'german' ? 'selected' : ''}>German</option>
                                <option value="chinese" ${data.language_preference === 'chinese' ? 'selected' : ''}>Chinese</option>
                                <option value="spanish" ${data.language_preference === 'spanish' ? 'selected' : ''}>Spanish</option>
                                <option value="arabic" ${data.language_preference === 'arabic' ? 'selected' : ''}>Arabic</option>
                                <option value="turkish" ${data.language_preference === 'turkish' ? 'selected' : ''}>Turkish</option>
                                <option value="polish" ${data.language_preference === 'polish' ? 'selected' : ''}>Polish</option>
                            </select>
                        </div>
                        <div class="profile-field">
                            <label><strong>Current Password</strong></label>
                            <input type="password" name="current_password" placeholder="Required for password change">
                        </div>
                        <div class="profile-field">
                            <label><strong>New Password</strong></label>
                            <input type="password" name="new_password" placeholder="Leave blank to keep current">
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button type="submit" class="save-btn">Save Changes</button>
                        <button type="button" class="delete-btn">Delete Account</button>
                        <button type="button" class="close-btn">Close</button>
                    </div>
                </form>
                <p class="success-message" style="display: none;"></p>
                <p class="error-message" style="display: none;"></p>
            </div>
        `;

        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        // Handle file input change to show preview
        const fileInput = modalContent.querySelector('#profile-picture-input');
        fileInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    const profileAvatar = modalContent.querySelector('.profile-avatar');
                    const placeholderAvatar = modalContent.querySelector('.profile-avatar-placeholder');

                    if (profileAvatar) {
                        profileAvatar.src = e.target.result;
                    } else if (placeholderAvatar) {
                        // Replace placeholder with actual image
                        const img = document.createElement('img');
                        img.src = e.target.result;
                        img.alt = data.username || 'User';
                        img.className = 'profile-avatar';
                        placeholderAvatar.parentNode.replaceChild(img, placeholderAvatar);
                    }
                };
                reader.readAsDataURL(file);
            }
        });

        // Handle form submission
        const form = modalContent.querySelector('#profile-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);

            // Add the profile picture from the separate file input
            const fileInput = document.getElementById('profile-picture-input');
            if (fileInput.files.length > 0) {
                formData.set('profile_picture', fileInput.files[0]);
            }

            // In profile.js, inside the form submission handler
            fetch('/profile/update_profile', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            })
                .then(response => response.json())
                .then(result => {
                    const successMsg = modalContent.querySelector('.success-message');
                    const errorMsg = modalContent.querySelector('.error-message');
                    successMsg.style.display = 'none';
                    errorMsg.style.display = 'none';
                    if (result.error) {
                        errorMsg.textContent = result.error;
                        errorMsg.style.display = 'block';
                        console.error('Profile update failed:', result.error);
                    } else {
                        successMsg.textContent = result.message;
                        successMsg.style.display = 'block';
                        console.debug(`Profile updated: theme_preference=${result.profile.theme_preference}`);
                        // Clear cached language preference
                        getLanguagePreference.cached = null;
                        // Dispatch custom event for language preference change
                        const languageChangeEvent = new CustomEvent('languagePreferenceChanged', {
                            detail: { language: result.profile.language_preference }
                        });
                        window.dispatchEvent(languageChangeEvent);
                        // Apply the new theme immediately
                        const newTheme = result.profile.theme_preference;
                        applyTheme(newTheme);
                        // Update modal with new profile data
                        setTimeout(() => {
                            modalOverlay.remove();
                            showModal(result.profile);
                        }, 1500);
                    }
                })
                .catch(error => {
                    const errorMsg = modalContent.querySelector('.error-message');
                    errorMsg.textContent = 'Error updating profile';
                    errorMsg.style.display = 'block';
                    console.error('Profile update error:', error);
                });
        });

        // Handle account deletion
        modalContent.querySelector('.delete-btn').addEventListener('click', () => {
            if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
                fetch('/profile/delete_account', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include'
                })
                    .then(response => response.json())
                    .then(result => {
                        if (result.error) {
                            const errorMsg = modalContent.querySelector('.error-message');
                            errorMsg.textContent = result.error;
                            errorMsg.style.display = 'block';
                            console.error('Account deletion failed:', result.error);
                        } else {
                            modalOverlay.remove();
                            alert('Account deleted successfully');
                            window.location.href = '/';  // Redirect to homepage
                        }
                    })
                    .catch(error => {
                        const errorMsg = modalContent.querySelector('.error-message');
                        errorMsg.textContent = 'Error deleting account';
                        errorMsg.style.display = 'block';
                        console.error('Account deletion error:', error);
                    });
            }
        });

        // Close modal with animation
        const closeModal = () => {
            modalOverlay.classList.add('fade-out');
            setTimeout(() => {
                modalOverlay.remove();
            }, 300);
        };

        modalContent.querySelector('.close-btn').addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });

        // Apply entrance animation
        setTimeout(() => {
            modalOverlay.classList.add('active');
            modalContent.classList.add('active');
        }, 10);
    }
});