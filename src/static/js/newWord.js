function newWord() {
    const selection = window.getSelection();
    if (selection.toString().trim() === '') {
        showToast('Please select a word first.', 'warning');
        return;
    }

    const word = selection.toString().trim();

    fetch('/wordbank/add_word', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ word: word }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast(`"${word}" added to wordbank`, 'success');
        } else {
            showToast(`Failed to add word: ${data.error}`, 'error');
        }
    })
    .catch((error) => {
        console.error('Error:', error);
        showToast('Word addition failed', 'error');
    });
}

// Make sure the showToast function is available in this context
// If this function is in a separate file, you might need to define the showToast function here
// or make it globally accessible

// If showToast isn't defined elsewhere, here's the function:
if (typeof showToast !== 'function') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
        
        // Add toast styles if they don't exist
        if (!document.getElementById('toast-styles')) {
            const toastStyles = document.createElement('style');
            toastStyles.id = 'toast-styles';
            toastStyles.textContent = `
                #toast-container {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    z-index: 1000;
                }
                
                .toast {
                    padding: 12px 20px;
                    margin-bottom: 10px;
                    border-radius: 4px;
                    color: white;
                    font-size: 14px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    display: flex;
                    align-items: center;
                    min-width: 250px;
                    max-width: 350px;
                    opacity: 0;
                    transform: translateX(50px);
                    transition: opacity 0.3s, transform 0.3s;
                }
                
                .toast.show {
                    opacity: 1;
                    transform: translateX(0);
                }
                
                .toast-success {
                    background-color: #4caf50;
                }
                
                .toast-error {
                    background-color: #f44336;
                }
                
                .toast-info {
                    background-color: #2196f3;
                }
                
                .toast-warning {
                    background-color: #ff9800;
                }
                
                .toast-content {
                    flex: 1;
                }
                
                .toast-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 16px;
                    cursor: pointer;
                    margin-left: 10px;
                    opacity: 0.7;
                }
                
                .toast-close:hover {
                    opacity: 1;
                }
            `;
            document.head.appendChild(toastStyles);
        }
    }

    function showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        toast.innerHTML = `
            <div class="toast-content">${message}</div>
            <button class="toast-close">&times;</button>
        `;
        
        toastContainer.appendChild(toast);
        
        // Force a reflow to enable the transition to work
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Set up the close button
        const closeButton = toast.querySelector('.toast-close');
        closeButton.addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        });
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.classList.remove('show');
                    setTimeout(() => {
                        if (toast.parentElement) {
                            toast.remove();
                        }
                    }, 300);
                }
            }, duration);
        }
        
        return toast;
    }
}