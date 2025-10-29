// sendemail.js - Enhanced version with theme-consistent CSS

document.addEventListener('DOMContentLoaded', function() {
    const sendButton = document.getElementById('send-button');
    let selectedFileContent = '';
    let selectedFilename = '';

    // Get the markdown editor element
    const markdownEditorElement = document.getElementById('markdown-editor');

    // Listen for the custom event 'fileSelected' from fileoperation.js
    document.addEventListener('fileSelected', (event) => {
        selectedFilename = event.detail.filename;
    });

    // Add CSS styles to the document
    function addStyles() {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            /* Modal Styles */
            .modal {
                display: none;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                overflow: auto;
                background-color: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(5px);
                animation: fadeIn 0.3s ease-in-out;
                -ms-overflow-style: none;
                scrollbar-width: none;
            }

            .modal::-webkit-scrollbar {
                display: none;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .modal-content {
                background: var(--menu-bg);
                margin: 10% auto;
                max-width: 500px;
                padding: 25px;
                border-radius: 12px;
                box-shadow: 0 10px 25px var(--header-shadow);
                position: relative;
                animation: slideDown 0.4s ease-out;
                border: 1px solid var(--menu-border);
                color: var(--text-color);
            }

            @keyframes slideDown {
                from { transform: translateY(-50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }

            .modal h2 {
                color: var(--text-color);
                margin-top: 0;
                margin-bottom: 20px;
                font-weight: 600;
                border-bottom: 1px solid var(--menu-border);
                padding-bottom: 10px;
                font-family: 'Poppins', sans-serif;
            }

            .close-button {
                position: absolute;
                top: 15px;
                right: 15px;
                color: var(--menu-item-color);
                font-size: 24px;
                font-weight: bold;
                cursor: pointer;
                transition: color 0.2s;
                height: 30px;
                width: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
            }

            .close-button:hover {
                color: var(--menu-item-hover-color);
                background-color: var(--menu-item-hover-bg);
            }

            .modal label {
                display: block;
                margin-bottom: 6px;
                color: var(--text-color);
                font-weight: 500;
                font-size: 14px;
                font-family: 'Poppins', sans-serif;
            }

            .modal input, .modal textarea {
                width: 100%;
                padding: 12px;
                margin-bottom: 16px;
                border: 1px solid var(--search-input-border);
                border-radius: 8px;
                box-sizing: border-box;
                font-size: 14px;
                transition: border-color 0.3s, box-shadow 0.3s;
                background-color: var(--search-input-bg);
                color: var(--text-color);
                font-family: 'Poppins', sans-serif;
                -ms-overflow-style: none;
                scrollbar-width: none;
            }

            .modal input::-webkit-scrollbar, .modal textarea::-webkit-scrollbar {
                display: none;
            }

            .modal input:focus, .modal textarea:focus {
                outline: none;
                border-color: #0366d6;
                box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.25);
            }

            .modal textarea {
                resize: vertical;
                min-height: 150px;
                background-color: var(--textarea-bg);
            }

            #sendEmailButton {
                background-color: #0366d6;
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                font-weight: 500;
                transition: background-color 0.3s, transform 0.2s;
                display: block;
                margin-left: auto;
                font-family: 'Poppins', sans-serif;
            }

            #sendEmailButton:hover {
                background-color: #0256b3;
                transform: translateY(-2px);
            }

            #sendEmailButton:active {
                transform: translateY(0);
            }

            #sendEmailButton:disabled {
                background-color: #6a737d;
                cursor: not-allowed;
                transform: none;
            }

            /* Toast notification styles */
            .toast-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 1100;
                -ms-overflow-style: none;
                scrollbar-width: none;
            }

            .toast-container::-webkit-scrollbar {
                display: none;
            }

            .toast {
                min-width: 300px;
                margin-top: 10px;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 4px 12px var(--header-shadow);
                display: flex;
                align-items: center;
                animation: slideIn 0.5s ease-out forwards;
                opacity: 0;
                transform: translateX(50px);
                font-family: 'Poppins', sans-serif;
            }

            @keyframes slideIn {
                to { opacity: 1; transform: translateX(0); }
            }

            .toast-fade-out {
                animation: fadeOut 0.3s ease-in forwards;
            }

            @keyframes fadeOut {
                from { opacity: 1; transform: translateX(0); }
                to { opacity: 0; transform: translateX(50px); }
            }

            .toast-success {
                background-color: #28a745;
                color: white;
                border-left: 5px solid #1e7e34;
            }

            .toast-error {
                background-color: #dc3545;
                color: white;
                border-left: 5px solid #bd2130;
            }

            .toast-info {
                background-color: #17a2b8;
                color: white;
                border-left: 5px solid #117a8b;
            }

            [data-theme="dark"] .toast-success {
                background-color: #2c974b;
                border-left: 5px solid #208638;
            }

            [data-theme="dark"] .toast-error {
                background-color: #e25563;
                border-left: 5px solid #d73a49;
            }

            [data-theme="dark"] .toast-info {
                background-color: #1b9eb3;
                border-left: 5px solid #148396;
            }

            .toast-content {
                display: flex;
                align-items: center;
            }

            .toast-message {
                margin-left: 10px;
                font-size: 14px;
                font-weight: 500;
            }

            .toast::before {
                font-family: "Font Awesome 5 Free";
                font-weight: 900;
                font-size: 18px;
            }

            .toast-success::before {
                content: "\\f058"; /* check-circle */
            }

            .toast-error::before {
                content: "\\f057"; /* times-circle */
            }

            .toast-info::before {
                content: "\\f05a"; /* info-circle */
            }
        `;
        document.head.appendChild(styleElement);
    }

    // Ensure toast container exists
    function ensureToastContainer() {
        if (!document.querySelector('.toast-container')) {
            const toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
    }

    // Function to show toast notification
    function showToast(message, type = 'info') {
        ensureToastContainer();
        const toastContainer = document.querySelector('.toast-container');
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-message">${message}</span>
            </div>
        `;
        toastContainer.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => {
            toast.style.opacity = 1;
            toast.style.transform = 'translateX(0)';
        }, 10);
        
        // Automatically remove toast after 3 seconds
        setTimeout(() => {
            toast.classList.add('toast-fade-out');
            setTimeout(() => {
                toastContainer.removeChild(toast);
            }, 300);
        }, 3000);
    }

    // Create modal
    function createEmailModal() {
        const modal = document.createElement('div');
        modal.id = 'emailModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <h2>Send Email</h2>
                <div>
                    <label for="recipientEmail">Recipient Email:</label>
                    <input type="email" id="recipientEmail" value="typorax@gmail.com">
                </div>
                <div>
                    <label for="emailSubject">Subject:</label>
                    <input type="text" id="emailSubject" value="File Content: ${selectedFilename}">
                </div>
                <div>
                    <label for="emailBody">Content:</label>
                    <textarea id="emailBody" rows="10"></textarea>
                </div>
                <button id="sendEmailButton"><i class="fas fa-paper-plane"></i> Send Email</button>
            </div>
        `;
        document.body.appendChild(modal);

        // Get the content from the markdown editor
        modal.querySelector('#emailBody').value = markdownEditorElement ? markdownEditorElement.value : '';

        // Event listener for close button
        modal.querySelector('.close-button').addEventListener('click', () => {
            closeModal();
        });

        // Event listener for send email button
        modal.querySelector('#sendEmailButton').addEventListener('click', () => {
            const recipientEmail = document.getElementById('recipientEmail').value;
            const emailSubject = document.getElementById('emailSubject').value;
            const emailBody = document.getElementById('emailBody').value;
            
            // Simple validation
            if (!recipientEmail || !emailSubject || !emailBody) {
                showToast('Please fill in all fields', 'error');
                return;
            }
            
            if (!validateEmail(recipientEmail)) {
                showToast('Please enter a valid email address', 'error');
                return;
            }
            
            sendEmail(recipientEmail, emailSubject, emailBody);
        });

        // Close the modal if the user clicks outside of it
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });

        // Handle Escape key to close modal
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && modal.style.display === 'block') {
                closeModal();
            }
        });
    }

    // Email validation function
    function validateEmail(email) {
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    // Function to open the modal
    function openModal() {
        const modal = document.getElementById('emailModal');
        if (!modal) {
            createEmailModal();
        } else {
            // Update the subject with the current filename
            document.getElementById('emailSubject').value = `File Content: ${selectedFilename}`;
            
            // Update the body with current editor content
            if (markdownEditorElement) {
                document.getElementById('emailBody').value = markdownEditorElement.value;
            }
        }
        document.getElementById('emailModal').style.display = 'block';
        
        // Focus on the recipient field
        setTimeout(() => {
            document.getElementById('recipientEmail').focus();
        }, 100);
    }

    // Function to close the modal
    function closeModal() {
        const modal = document.getElementById('emailModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Function to send the email
    function sendEmail(recipientEmail, subject, body) {
        // Show loading feedback
        const sendButton = document.getElementById('sendEmailButton');
        const originalHTML = sendButton.innerHTML;
        sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        sendButton.disabled = true;
        
        fetch('/email/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                recipientEmail: recipientEmail,
                subject: subject,
                body: body,
                filename: selectedFilename
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                showToast('Email sent successfully!', 'success');
                closeModal();
            } else {
                showToast('Failed to send email: ' + data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error sending email:', error);
            showToast('Failed to send email: ' + error.message, 'error');
        })
        .finally(() => {
            // Reset button state
            sendButton.innerHTML = originalHTML;
            sendButton.disabled = false;
        });
    }

    // Check if dark mode is active and update theme
    function checkTheme() {
        const theme = document.body.getAttribute('data-theme');
        // We don't need to do anything here as our CSS uses the data-theme attribute
        // from the body element via CSS variables
    }

    // Initialize - add styles and set up event listeners
    addStyles();
    ensureToastContainer();
    
    // Check theme initially
    checkTheme();
    
    // Listen for theme changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'data-theme') {
                checkTheme();
            }
        });
    });
    
    observer.observe(document.body, { attributes: true });

    // Add event listener to the send button
    if (sendButton) {
        sendButton.addEventListener('click', () => {
            openModal();
        });
    } else {
        console.error('Send button not found. Ensure the element with id "send-button" exists.');
    }
});