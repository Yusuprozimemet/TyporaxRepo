// Wait for the DOM to fully load
document.addEventListener("DOMContentLoaded", function () {
    // Add CSS for the login modal
    const style = document.createElement('style');
    style.textContent = `
        /* Login Modal */
        #loginModal {
            display: none;
            position: fixed;
            z-index: 1000;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
            background-color: rgba(0, 0, 0, 0.5);
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(5px);
        }

        #loginModal .modal-content {
            background-color: var(--white);
            margin: 10% auto;
            padding: 2rem;
            border-radius: var(--border-radius);
            width: 80%;
            max-width: 400px;
            box-shadow: var(--shadow-lg);
            position: relative;
            animation: modalFade 0.3s ease;
        }

        #loginModal .modal-content h2 {
            text-align: center;
            margin-bottom: 1.5rem;
            color: var(--text-color);
        }

        #loginModal .input-group {
            position: relative;
            margin-bottom: 1.2rem;
        }

        #loginModal .input-group input {
            width: 100%;
            padding: 0.8rem 1rem 0.8rem 2.5rem;
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius);
            font-size: 1rem;
            transition: var(--transition);
        }

        #loginModal .input-group input:focus {
            border-color: var(--primary-color);
            outline: none;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
        }

        #loginModal .close-modal {
            position: absolute;
            top: 15px;
            right: 15px;
            font-size: 1.5rem;
            cursor: pointer;
            color: var(--text-light);
            transition: var(--transition);
        }

        #loginModal .close-modal:hover {
            color: var(--secondary-color);
        }

        @keyframes modalFade {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);

    // Select the "Makkelijke taal" button
    const easyLanguageBtn = document.getElementById("easyLanguageBtn");

    // Add a click event listener to the button
    easyLanguageBtn.addEventListener("click", function () {
        // Open the login modal
        const loginModal = document.getElementById("loginModal");
        loginModal.style.display = "flex";

        // Automatically fill in the username field for demo purposes
        // Note: For production, consider implementing a proper demo account system
        const usernameField = document.getElementById("username");
        const passwordField = document.getElementById("password");

        usernameField.value = "makkelijke taal";
        // Password should be entered by user for security
        passwordField.placeholder = "Enter password for demo account";
    });

    // Close modal functionality
    const closeModalButtons = document.querySelectorAll(".close-modal");
    closeModalButtons.forEach((button) => {
        button.addEventListener("click", function () {
            const modal = button.closest(".modal");
            modal.style.display = "none";
        });
    });
});
