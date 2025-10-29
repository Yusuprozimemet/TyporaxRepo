// static/js/github.js
document.addEventListener('DOMContentLoaded', () => {
    const githubSignInBtn = document.getElementById('github-signin');

    if (!githubSignInBtn) {
        console.error('GitHub Sign-In button not found');
        return;
    }

    githubSignInBtn.style.cursor = 'pointer';

    githubSignInBtn.addEventListener('click', (e) => {
        e.preventDefault();

        githubSignInBtn.disabled = true;
        githubSignInBtn.style.opacity = '0.7';
        const originalContent = githubSignInBtn.innerHTML;
        githubSignInBtn.innerHTML = '<i class="fab fa-github"></i> Connecting to GitHub...';

        setTimeout(() => {
            try {
                window.location.href = '/auth/github-login';
            } catch (error) {
                console.error('GitHub Sign-In redirect failed:', error);
                githubSignInBtn.disabled = false;
                githubSignInBtn.style.opacity = '1';
                githubSignInBtn.innerHTML = originalContent;
                alert('Failed to initiate GitHub Sign-In. Please try again.');
            }
        }, 500);
    });
});