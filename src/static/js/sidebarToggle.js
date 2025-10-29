document.addEventListener('DOMContentLoaded', function () {
    const sidebar = document.getElementById('sidebar');
    const toggleButton = document.getElementById('sidebartoggle');
    const editor = document.getElementById('editor');

    // Check if elements exist and log specific missing elements
    let missingElements = [];
    if (!sidebar) missingElements.push('sidebar');
    if (!toggleButton) missingElements.push('sidebartoggle');
    if (!editor) missingElements.push('editor');

    if (missingElements.length > 0) {
        console.error('The following elements were not found:', missingElements.join(', '));
        return;
    }

    // Load the sidebar state from localStorage
    if (localStorage.getItem('sidebarHidden') === 'true') {
        sidebar.classList.add('hidden');
        toggleButton.classList.add('collapsed');
        editor.classList.add('full-width');
    }

    // Toggle sidebar on click
    toggleButton.addEventListener('click', function () {
        sidebar.classList.toggle('hidden');
        toggleButton.classList.toggle('collapsed');
        editor.classList.toggle('full-width');

        // Save the sidebar state to localStorage
        localStorage.setItem('sidebarHidden', sidebar.classList.contains('hidden'));
    });
});