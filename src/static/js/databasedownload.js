document.addEventListener('DOMContentLoaded', function () {
    const downloadDbBtn = document.getElementById('downloadDatabaseBtn');
    if (downloadDbBtn) {
        downloadDbBtn.addEventListener('click', function () {
            // Create a hidden link and trigger click to download the database
            const link = document.createElement('a');
            link.href = '/admin/download-db'; // Your Flask route
            link.download = 'users.db';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }
});
