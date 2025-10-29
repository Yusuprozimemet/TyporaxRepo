document.addEventListener("DOMContentLoaded", () => {
    // Get elements
    const loginModal = document.getElementById("loginModal");
    const passwordResetModal = document.getElementById("passwordResetModal");
    const forgotPasswordLink = document.querySelector(".forgot-password a");
    const closeButtons = document.querySelectorAll(".close-modal");

    // Custom notification function
    function showCustomNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `custom-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Show with animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Handle close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.classList.remove('show');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }
        }, 5000);
    }

    // Open Password Reset Modal
    forgotPasswordLink.addEventListener("click", (e) => {
        e.preventDefault(); // Prevent default link behavior
        loginModal.style.display = "none"; // Hide login modal
        passwordResetModal.style.display = "block"; // Show password reset modal
    });

    // Close Modals
    closeButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            loginModal.style.display = "none";
            passwordResetModal.style.display = "none";
        });
    });

    // Close modal when clicking outside of it
    window.addEventListener("click", (e) => {
        if (e.target === loginModal) {
            loginModal.style.display = "none";
        }
        if (e.target === passwordResetModal) {
            passwordResetModal.style.display = "none";
        }
    });

    // Handle Password Reset Form Submission
    const passwordResetForm = document.getElementById("passwordResetForm");
    passwordResetForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const email = document.getElementById("resetEmail").value;

        // Validate email input
        if (!email || !validateEmail(email)) {
            showCustomNotification('Please enter a valid email address.', 'error');
            return;
        }

        fetch('/auth/reset_password', { // Updated endpoint to match backend route
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: email }),
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.message); });
                }
                return response.json();
            })
            .then(data => {
                showCustomNotification(data.message, 'success'); // Success message from server
                passwordResetModal.style.display = "none"; // Close modal on success
            })
            .catch((error) => {
                console.error('Error:', error);
                showCustomNotification(error.message || 'An error occurred. Please try again.', 'error');
            });
    });

    // Email validation function
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }
});