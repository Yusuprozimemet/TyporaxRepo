document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const $downloadFolderFilesModal = $('#downloadFolderFilesModal');
    const $downloadUserSelect = $('#downloadUserSelect');
    const $downloadFolderSelect = $('#downloadFolderSelect');
    const $downloadFileSelect = $('#downloadFileSelect');
    const $downloadFolderBtn = $('#downloadFolderBtn');
    const $downloadFilesBtn = $('#downloadFilesBtn');
    const $userSection = $('.main-content');
    const $fileSection = $('<div class="main-content file-section" style="display: none;"></div>');
    const $searchUsers = $('#searchUsers');
    const $userTypeFilter = $('#userTypeFilter');
    const $subscriptionFilter = $('#subscriptionFilter');
    const $createUserBtn = $('#createUserBtn');
    const $createUserModal = $('#createUserModal');
    const $editUserModal = $('#editUserModal');
    const $notificationsModal = $('#notificationsModal');

    // Add click handler for Create User button
    $createUserBtn.on('click', function () {
        $createUserModal.modal('show');
    });

    // Add click handler for Edit buttons
    $(document).on('click', '.edit-btn', function () {
        const userId = $(this).data('user-id');
        $(this).html('<i class="fas fa-spinner fa-spin"></i>');

        $.ajax({
            url: `/admin/user/${userId}`,
            type: 'GET',
            dataType: 'json',
            success: function (userData) {
                $('#editUserId').val(userData.id);
                $('#editEmail').val(userData.email);
                $('#editUsername').val(userData.username);
                $('#editUserType').val(userData.user_type);
                $('#editSubscriptionStart').val(userData.subscription_start_date || '');
                $('#editNextBilling').val(userData.next_billing_date || '');
                $('#editIsCanceled').val(userData.is_canceled ? 'true' : 'false');
                $('#editProfilePicture').val(userData.profile_picture || '');
                $('#editThemePreference').val(userData.theme_preference || 'light');
                $('#editLanguagePreference').val(userData.language_preference || 'english');
                $('#editPassword').val('');
                $editUserModal.modal('show');
            },
            error: function (xhr) {
                let errorMsg = 'Error fetching user data';
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) { }
                showToast(errorMsg, 'danger');
            },
            complete: function () {
                $('.edit-btn[data-user-id="' + userId + '"]').html('<i class="fas fa-edit"></i> Edit');
            }
        });
    });

    // Add click handler for Delete buttons
    $(document).on('click', '.delete-btn', function () {
        const userId = $(this).data('user-id');
        const username = $(this).closest('tr').find('td:eq(2)').text();

        if (confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
            $(this).html('<i class="fas fa-spinner fa-spin"></i>');

            $.ajax({
                url: `/admin/user/${userId}`,
                type: 'DELETE',
                dataType: 'json',
                success: function (response) {
                    showToast(response.message || 'User deleted successfully', 'success');
                    $(`.delete-btn[data-user-id="${userId}"]`).closest('tr').remove();
                },
                error: function (xhr) {
                    let errorMsg = 'Error deleting user';
                    try {
                        const response = JSON.parse(xhr.responseText);
                        errorMsg = response.message || errorMsg;
                    } catch (e) { }
                    showToast(errorMsg, 'danger');
                    $(`.delete-btn[data-user-id="${userId}"]`).html('<i class="fas fa-trash"></i> Delete');
                }
            });
        }
    });

    // Handle save user changes
    $('#saveUserBtn').click(function () {
        const userId = $('#editUserId').val();
        const userData = {
            email: $('#editEmail').val(),
            username: $('#editUsername').val(),
            user_type: $('#editUserType').val(),
            subscription_start_date: $('#editSubscriptionStart').val() || null,
            next_billing_date: $('#editNextBilling').val() || null,
            is_canceled: $('#editIsCanceled').val() === 'true',
            profile_picture: $('#editProfilePicture').val() || null,
            theme_preference: $('#editThemePreference').val(),
            language_preference: $('#editLanguagePreference').val()
        };

        if ($('#editPassword').val()) {
            userData.password = $('#editPassword').val();
        }

        $('#saveUserBtn').prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Saving...');

        $.ajax({
            url: `/admin/user/${userId}`,
            type: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(userData),
            dataType: 'json',
            success: function (response) {
                showToast(response.message || 'User updated successfully', 'success');
                $editUserModal.modal('hide');

                const $row = $(`.edit-btn[data-user-id="${userId}"]`).closest('tr');
                $row.find('td:eq(1)').text(userData.email);
                $row.find('td:eq(2)').text(userData.username);
                $row.find('td:eq(3)').text(userData.user_type);
                $row.find('td:eq(4)').text(userData.subscription_start_date || '-');
                $row.find('td:eq(5)').text(userData.next_billing_date || '-');
                $row.find('td:eq(6)').text(userData.is_canceled ? 'Yes' : 'No');
                if (userData.profile_picture) {
                    $row.find('td:eq(7)').html(`<img src="${userData.profile_picture}" alt="Profile" class="profile-img" width="40">`);
                } else {
                    $row.find('td:eq(7)').text('-');
                }
                $row.find('td:eq(8)').text(userData.theme_preference);
                $row.find('td:eq(9)').text(userData.language_preference);
            },
            error: function (xhr) {
                let errorMsg = 'Error updating user';
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) { }
                showToast(errorMsg, 'danger');
            },
            complete: function () {
                $('#saveUserBtn').prop('disabled', false).html('Save Changes');
            }
        });
    });

    // Handle create new user
    $('#saveNewUserBtn').click(function () {
        const userData = {
            email: $('#createEmail').val(),
            username: $('#createUsername').val(),
            password: $('#createPassword').val(),
            user_type: $('#createUserType').val(),
            subscription_start_date: $('#createSubscriptionStart').val() || null,
            next_billing_date: $('#createNextBilling').val() || null,
            is_canceled: $('#createIsCanceled').val() === 'true',
            profile_picture: $('#createProfilePicture').val() || null,
            theme_preference: $('#createThemePreference').val(),
            language_preference: $('#createLanguagePreference').val()
        };

        $('#saveNewUserBtn').prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Creating...');

        $.ajax({
            url: '/admin/user/create',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(userData),
            dataType: 'json',
            success: function (response) {
                showToast(response.message || 'User created successfully', 'success');
                $createUserModal.modal('hide');
                setTimeout(() => {
                    location.reload();
                }, 1500);
            },
            error: function (xhr) {
                let errorMsg = 'Error creating user';
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) { }
                showToast(errorMsg, 'danger');
            },
            complete: function () {
                $('#saveNewUserBtn').prop('disabled', false).html('Create User');
            }
        });
    });

    // Show notifications modal
    $(document).on('click', '#viewNotificationsBtn', function () {
        $.ajax({
            url: '/admin/notifications',
            type: 'GET',
            dataType: 'json',
            success: function (notifications) {
                const $notificationsList = $('#notificationsList');
                $notificationsList.empty();

                if (notifications.length === 0) {
                    $notificationsList.append('<li class="list-group-item">No notifications available.</li>');
                } else {
                    notifications.forEach(notification => {
                        const date = new Date(notification.timestamp).toLocaleString();
                        // IDs are strings, no need for .toString()
                        $notificationsList.append(`
                        <li class="list-group-item" data-notification-id="${notification.id}">
                            <strong>${notification.action.toUpperCase()}</strong> by ${notification.admin_username}<br>
                            <strong>User:</strong> ${notification.username} (ID: ${notification.user_id})<br>
                            <strong>Details:</strong> ${notification.details}<br>
                            <small class="text-muted">${date}</small>
                            <button class="delete-notification-btn" data-notification-id="${notification.id}" title="Delete notification">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </li>
                    `);
                    });
                }
                $notificationsModal.modal('show');
            },
            error: function (xhr) {
                let errorMsg = 'Error fetching notifications';
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) { }
                showToast(errorMsg, 'danger');
            }
        });
    });

    $(document).on('click', '.delete-notification-btn', function () {
        const notificationId = $(this).attr('data-notification-id'); // Treat as string
        console.log('Attempting to delete notification with ID:', notificationId, 'Type:', typeof notificationId);
        const $notificationItem = $(this).closest('li');

        if (confirm('Are you sure you want to delete this notification?')) {
            $.ajax({
                url: `/admin/notification/${notificationId}`,
                type: 'DELETE',
                success: function (response) {
                    showToast(response.message || 'Notification deleted', 'success');
                    $notificationItem.remove();
                },
                error: function (xhr) {
                    let errorMsg = 'Error deleting notification';
                    try {
                        const response = JSON.parse(xhr.responseText);
                        errorMsg = response.message || errorMsg;
                        console.log('Error response:', response);
                    } catch (e) {
                        console.log('Error parsing response:', e);
                    }
                    showToast(errorMsg, 'danger');
                }
            });
        }
    });




    // Initialize file section content
    $fileSection.html(`
        <header class="main-header">
            <h1>File Management</h1>
            <div class="header-actions">
                <input type="text" id="searchFiles" class="form-control search-input" placeholder="Search files...">
                <button class="btn btn-primary" id="downloadFolderFilesBtn"><i class="fas fa-download"></i> Download Folders/Files</button>
            </div>
        </header>
        <div class="table-container">
            <table class="file-table">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Folder</th>
                        <th>File</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="fileTableBody">
                    <!-- Populated dynamically -->
                </tbody>
            </table>
        </div>
    `);
    $('.app-container').append($fileSection);

    // Populate users dropdown
    function populateUsers() {
        $downloadUserSelect.prop('disabled', true).html('<option value="">Loading...</option>');
        $.get('/admin/users', function (data) {
            $downloadUserSelect.empty().append('<option value="">Select User</option>');
            data.forEach(user => {
                $downloadUserSelect.append(`<option value="${user.username}">${user.username}</option>`);
            });
            $downloadUserSelect.prop('disabled', false);
        }).fail(function (xhr) {
            let errorMsg = 'Error loading users';
            try {
                const response = JSON.parse(xhr.responseText);
                errorMsg = response.message || errorMsg;
            } catch (e) { }
            showToast(errorMsg, 'danger');
            $downloadUserSelect.html('<option value="">Error loading users</option>');
        });
    }

    // Populate folders dropdown based on selected user
    function populateFolders(username) {
        $downloadFolderSelect.empty().append('<option value="">Root</option>').prop('disabled', true);
        $downloadFileSelect.empty().append('<option value="">Select Files</option>').prop('disabled', true);

        if (username) {
            $downloadFolderSelect.html('<option value="">Loading...</option>');
            $.get(`/admin/folders/${username}`, function (data) {
                $downloadFolderSelect.empty().append('<option value="">Root</option>');
                if (data.folders && data.folders.length > 0) {
                    data.folders.forEach(folder => {
                        $downloadFolderSelect.append(`<option value="${folder}">${folder}</option>`);
                    });
                }
                $downloadFolderSelect.prop('disabled', false);
            }).fail(function (xhr) {
                let errorMsg = 'Error loading folders';
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) { }
                showToast(errorMsg, 'danger');
                $downloadFolderSelect.html('<option value="">Error loading folders</option>');
            });
        }
    }

    // Populate files dropdown based on selected user and folder
    function populateFiles(username, folder) {
        $downloadFileSelect.empty().append('<option value="">Select Files</option>').prop('disabled', true);

        if (username) {
            $downloadFileSelect.html('<option value="">Loading...</option>');
            $.get(`/admin/files/${username}?folder=${encodeURIComponent(folder)}`, function (data) {
                $downloadFileSelect.empty();
                if (!data.files || data.files.length === 0) {
                    $downloadFileSelect.append('<option value="">No files available</option>');
                } else {
                    data.files.forEach(file => {
                        $downloadFileSelect.append(`<option value="${file}">${file}</option>`);
                    });
                }
                $downloadFileSelect.prop('multiple', true).prop('disabled', false);
            }).fail(function (xhr) {
                let errorMsg = 'Error loading files';
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) { }
                showToast(errorMsg, 'danger');
                $downloadFileSelect.html('<option value="">Error loading files</option>');
            });
        }
    }

    // Populate file table for Files section
    function populateFileTable() {
        const $fileTableBody = $('#fileTableBody');
        $fileTableBody.html('<tr><td colspan="4">Loading...</td></tr>');

        $.get('/admin/users', function (users) {
            const filePromises = users.map(user => {
                return $.get(`/admin/folders/${user.username}`).then(function (folderData) {
                    const folders = folderData.folders || [];
                    const filePromises = [];

                    filePromises.push(
                        $.get(`/admin/files/${user.username}?folder=`).then(function (fileData) {
                            return (fileData.files || []).map(file => ({
                                username: user.username,
                                folder: '',
                                file: file
                            }));
                        })
                    );

                    folders.forEach(folder => {
                        filePromises.push(
                            $.get(`/admin/files/${user.username}?folder=${encodeURIComponent(folder)}`).then(function (fileData) {
                                return (fileData.files || []).map(file => ({
                                    username: user.username,
                                    folder: folder,
                                    file: file
                                }));
                            })
                        );
                    });

                    return Promise.all(filePromises).then(results => results.flat());
                });
            });

            Promise.all(filePromises).then(allFiles => {
                const files = allFiles.flat();
                $fileTableBody.empty();
                if (files.length === 0) {
                    $fileTableBody.append('<tr><td colspan="4">No files available</td></tr>');
                    return;
                }

                files.forEach(item => {
                    $fileTableBody.append(`
                        <tr>
                            <td>${item.username}</td>
                            <td>${item.folder || 'Root'}</td>
                            <td>${item.file}</td>
                            <td>
                                <button class="btn btn-sm btn-primary download-file-btn" 
                                        data-username="${item.username}" 
                                        data-folder="${item.folder}" 
                                        data-file="${item.file}">
                                    <i class="fas fa-download"></i> Download
                                </button>
                            </td>
                        </tr>
                    `);
                });
            }).catch(function (error) {
                let errorMsg = 'Error loading files';
                showToast(errorMsg, 'danger');
                $fileTableBody.html('<tr><td colspan="4">Error loading files</td></tr>');
            });
        }).fail(function (xhr) {
            let errorMsg = 'Error loading users';
            try {
                const response = JSON.parse(xhr.responseText);
                errorMsg = response.message || errorMsg;
            } catch (e) { }
            showToast(errorMsg, 'danger');
            $fileTableBody.html('<tr><td colspan="4">Error loading files</td></tr>');
        });
    }

    // Show Bootstrap toast
    function showToast(message, type = 'danger') {
        const bgClass = type === 'success' ? 'bg-success' : 'bg-danger';
        const toastHtml = `
            <div class="toast align-items-center text-white ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">${message}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;
        const $toastContainer = $('<div class="toast-container position-fixed bottom-0 end-0 p-3"></div>').appendTo('body');
        const $toast = $(toastHtml).appendTo($toastContainer);
        const toast = new bootstrap.Toast($toast[0], { delay: 5000 });
        toast.show();
        $toast.on('hidden.bs.toast', () => $toastContainer.remove());
    }

    // Initialize modal
    $(document).on('click', '#downloadFolderFilesBtn', function () {
        populateUsers();
        populateFolders('');
        $downloadUserSelect.val('');
        $downloadFolderSelect.val('').prop('disabled', true);
        $downloadFileSelect.empty().append('<option value="">Select Files</option>').prop('disabled', true);
        $downloadFolderFilesModal.modal('show');
    });

    // Handle user selection
    $downloadUserSelect.change(function () {
        const username = $(this).val();
        populateFolders(username);
        populateFiles(username, '');
    });

    // Handle folder selection
    $downloadFolderSelect.change(function () {
        const username = $downloadUserSelect.val();
        const folder = $(this).val();
        populateFiles(username, folder);
    });

    // Handle download folder button
    $downloadFolderBtn.click(function () {
        const username = $downloadUserSelect.val();
        const folder = $downloadFolderSelect.val();

        if (!username) {
            showToast('Please select a user', 'danger');
            return;
        }

        $downloadFolderBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Downloading...');
        $.ajax({
            url: '/download_folder',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ username: username, folder: folder }),
            xhrFields: { responseType: 'blob' },
            success: function (data, status, xhr) {
                const blob = new Blob([data], { type: 'application/zip' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${username}_${folder || 'root'}_files.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                $downloadFolderFilesModal.modal('hide');
                showToast(`Successfully downloaded folder '${folder || 'root'}' for user ${username}`, 'success');
            },
            error: function (xhr) {
                let errorMsg = 'Error downloading folder';
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) { }
                showToast(errorMsg, 'danger');
            },
            complete: function () {
                $downloadFolderBtn.prop('disabled', false).html('Download Folder');
            }
        });
    });

    // Handle download files button
    $downloadFilesBtn.click(function () {
        const username = $downloadUserSelect.val();
        const folder = $downloadFolderSelect.val();
        const files = $downloadFileSelect.val();

        if (!username) {
            showToast('Please select a user', 'danger');
            return;
        }
        if (!files || files.length === 0) {
            showToast('Please select at least one file', 'danger');
            return;
        }

        $downloadFilesBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Downloading...');
        $.ajax({
            url: '/download_files',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ username: username, folder: folder, files: files }),
            xhrFields: { responseType: 'blob' },
            success: function (data, status, xhr) {
                const blob = new Blob([data], { type: 'application/zip' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${username}_${folder || 'root'}_selected_files.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                $downloadFolderFilesModal.modal('hide');
                showToast(`Successfully downloaded ${files.length} file(s) from folder '${folder || 'root'}' for user ${username}`, 'success');
            },
            error: function (xhr) {
                let errorMsg = 'Error downloading files';
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) { }
                showToast(errorMsg, 'danger');
            },
            complete: function () {
                $downloadFilesBtn.prop('disabled', false).html('Download Selected Files');
            }
        });
    });

    // Handle single file download in Files section
    $(document).on('click', '.download-file-btn', function () {
        const $btn = $(this);
        const username = $btn.data('username');
        const folder = $btn.data('folder');
        const file = $btn.data('file');

        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Downloading...');
        $.ajax({
            url: '/download_files',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ username: username, folder: folder, files: [file] }),
            xhrFields: { responseType: 'blob' },
            success: function (data, status, xhr) {
                const blob = new Blob([data], { type: 'application/zip' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${username}_${folder || 'root'}_${file}.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                showToast(`Successfully downloaded file '${file}'`, 'success');
            },
            error: function (xhr) {
                let errorMsg = 'Error downloading file';
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) { }
                showToast(errorMsg, 'danger');
            },
            complete: function () {
                $btn.prop('disabled', false).html('<i class="fas fa-download"></i> Download');
            }
        });
    });

    // Handle logout
    $(document).on('click', '.nav-item[data-section="logout"]', function (e) {
        e.preventDefault();
        $.ajax({
            url: '/admin/logout',
            type: 'GET',
            dataType: 'json',
            success: function (response) {
                showToast(response.message, 'success');
                setTimeout(() => {
                    window.location.href = '/admin/login';
                }, 1500);
            },
            error: function (xhr) {
                let errorMsg = 'Error during logout';
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) { }
                showToast(errorMsg, 'danger');
            }
        });
    });

    // Sidebar navigation
    $('.nav-item').click(function (e) {
        if ($(this).data('section') === 'logout') return;
        e.preventDefault();
        $('.nav-item').removeClass('active');
        $(this).addClass('active');

        const section = $(this).data('section');
        if (section === 'users') {
            $fileSection.hide();
            $userSection.show();
        } else if (section === 'files') {
            $userSection.hide();
            $fileSection.show();
            populateFileTable();
        }
    });

    // Search users
    $searchUsers.on('input', function () {
        const searchTerm = $(this).val().toLowerCase();
        $('.user-table tbody tr').each(function () {
            const rowText = $(this).text().toLowerCase();
            $(this).toggle(rowText.includes(searchTerm));
        });
    });

    // Filter users
    $userTypeFilter.add($subscriptionFilter).change(function () {
        const userType = $userTypeFilter.val();
        const subscription = $subscriptionFilter.val();
        $('.user-table tbody tr').each(function () {
            const rowUserType = $(this).find('td:eq(3)').text();
            const rowCanceled = $(this).find('td:eq(6)').text();
            const matchesUserType = !userType || rowUserType === userType;
            const matchesSubscription = !subscription ||
                (subscription === 'active' && rowCanceled === 'No') ||
                (subscription === 'canceled' && rowCanceled === 'Yes');
            $(this).toggle(matchesUserType && matchesSubscription);
        });
    });

    // Search files
    $(document).on('input', '#searchFiles', function () {
        const searchTerm = $(this).val().toLowerCase();
        $('.file-table tbody tr').each(function () {
            const rowText = $(this).text().toLowerCase();
            $(this).toggle(rowText.includes(searchTerm));
        });
    });

    // Clear form when create user modal is opened
    $('#createUserBtn').click(function () {
        $('#createUserForm')[0].reset();
    });
});