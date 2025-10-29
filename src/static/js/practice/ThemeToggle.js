document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;

    // Check for saved theme preference or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Apply the theme
    if (savedTheme === 'dark' || (!savedTheme && prefersDarkScheme)) {
        body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
    } else {
        body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
    }
});