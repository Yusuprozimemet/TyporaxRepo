// static/js/index.js
document.addEventListener('DOMContentLoaded', () => {
    // Element references
    const loginBtn = document.getElementById('loginBtn');
    const loginModal = document.getElementById('loginModal');
    const passwordResetModal = document.getElementById('passwordResetModal');
    const closeModalButtons = document.querySelectorAll('.close-modal');
    const forgotPasswordLink = document.querySelector('.forgot-password a');

    // Auto-dismiss flash messages after 3 seconds
    const flashMessages = document.querySelector('.flash-messages');
    if (flashMessages) {
        setTimeout(() => {
            flashMessages.style.transition = 'opacity 0.5s ease';
            flashMessages.style.opacity = '0';
            setTimeout(() => {
                flashMessages.remove();
            }, 500); // Wait for fade-out transition to complete
        }, 3000); // Show for 3 seconds
    }

    // Load Google Sign-In script
    const loadGoogleScript = () => {
        return new Promise((resolve, reject) => {
            if (window.google && google.accounts && google.accounts.id) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => {
                window.googleApiLoaded = true;
                resolve();
            };
            script.onerror = () => reject(new Error('Failed to load Google Sign-In script'));
            document.head.appendChild(script);
        });
    };

    // Define the callback function before initializing Google Sign-In
    window.handleCredentialResponse = async function(response) {
        if (!response.credential) {
            console.error('No credential in Google response');
            alert('Google Sign-In failed: No credential received.');
            return;
        }
        
        const googleButton = document.querySelector('.g_id_signin');
        if (googleButton) {
            googleButton.style.opacity = '0.7';
            googleButton.style.pointerEvents = 'none';
        }
        
        const loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'google-loading';
        loadingIndicator.style.cssText = 'text-align: center; margin-top: 10px; color: #4f46e5; font-size: 14px;';
        loadingIndicator.textContent = 'Signing in...';
        const googleContainer = document.getElementById('g_id_signin');
        if (googleContainer) {
            googleContainer.appendChild(loadingIndicator);
        }

        try {
            // Submit the credential to the backend using fetch
            const formData = new FormData();
            formData.append('id_token', response.credential);
            
            const loginResponse = await fetch('/auth/google-login', {
                method: 'POST',
                body: formData
            });

            if (loginResponse.ok) {
                const result = await loginResponse.json();
                console.log('Google login response:', result);
                
                // Handle redirect
                if (result.redirect) {
                    console.log('Redirecting to:', result.redirect);
                    window.location.href = result.redirect;
                } else {
                    // Fallback redirect
                    window.location.href = '/auth/selection';
                }
            } else {
                console.error('Google login failed:', loginResponse.status);
                alert('Google Sign-In failed. Please try again.');
                
                // Reset button state
                if (googleButton) {
                    googleButton.style.opacity = '1';
                    googleButton.style.pointerEvents = 'auto';
                }
                if (loadingIndicator) {
                    loadingIndicator.remove();
                }
            }
        } catch (error) {
            console.error('Error during Google login:', error);
            alert('Google Sign-In failed. Please check your connection and try again.');
            
            // Reset button state
            if (googleButton) {
                googleButton.style.opacity = '1';
                googleButton.style.pointerEvents = 'auto';
            }
            if (loadingIndicator) {
                loadingIndicator.remove();
            }
        }
    };

    // Initialize Google Sign-In
    const initializeGoogleSignIn = async () => {
        try {
            await loadGoogleScript();
            
            let clientId = null;
            
            try {
                // Try to fetch Google Client ID from backend
                const response = await fetch('/auth/google-client-id');
                
                if (response.ok) {
                    const data = await response.json();
                    clientId = data.client_id;
                    console.log('Using Google Client ID from backend');
                } else {
                    console.warn('Backend endpoint failed, status:', response.status);
                }
            } catch (fetchError) {
                console.warn('Failed to fetch Google Client ID from backend:', fetchError);
            }
            
            // Fallback removed for security - Client ID must come from backend
            if (!clientId) {
                throw new Error('Google Client ID not available from backend');
            }
            
            if (!clientId) {
                throw new Error('Google Client ID not available');
            }
            
            google.accounts.id.initialize({
                client_id: clientId,
                callback: window.handleCredentialResponse
            });
            console.log('Google Sign-In initialized');
            renderGoogleSignInButton();
        } catch (error) {
            console.error('Google Sign-In initialization failed:', error);
            
            // Check if it's an origin error
            if (error.message && error.message.includes('origin')) {
                console.warn('Google OAuth origin not configured. Add http://127.0.0.1:5000 and http://localhost:5000 to your Google OAuth client authorized origins.');
            }
            
            const container = document.getElementById('g_id_signin');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; color: #b91c1c; font-size: 14px; padding: 10px; border: 1px solid #fecaca; background: #fef2f2; border-radius: 6px;">
                        Google Sign-In configuration issue.<br>
                        <small>Add http://127.0.0.1:5000 to Google OAuth origins</small><br>
                        <a href="#" onclick="window.location.reload()" style="color: #4f46e5; text-decoration: underline;">
                            Retry
                        </a>
                    </div>
                `;
            }
        }
    };
    initializeGoogleSignIn();

    // Render Google Sign-In button
    const renderGoogleSignInButton = () => {
        const container = document.getElementById('g_id_signin');
        if (!container) {
            console.error('Google Sign-In container not found');
            return;
        }
        try {
            google.accounts.id.renderButton(
                container,
                {
                    type: 'standard',
                    size: 'large',
                    text: 'signin_with',
                    shape: 'rectangular',
                    logo_alignment: 'center',
                    width: 250
                }
            );
            console.log('Google Sign-In button rendered');
        } catch (error) {
            console.error('Error rendering Google button:', error);
            container.innerHTML = `
                <div style="text-align: center; color: #b91c1c; font-size: 14px;">
                    Failed to render Google Sign-In. 
                    <a href="#" onclick="window.location.reload()" style="color: #4f46e5; text-decoration: underline;">
                        Retry
                    </a>
                </div>
            `;
        }
    };

    // Style Google Sign-In container
    const styleGoogleContainer = () => {
        const container = document.getElementById('g_id_signin');
        if (container) {
            container.style.textAlign = 'center';
            container.style.marginTop = '15px';
            container.style.minHeight = '40px';
            container.innerHTML = '<div>Loading Google Sign-In...</div>';
        }
    };
    styleGoogleContainer();

    // GitHub Sign-In click handler
    const githubSigninBtn = document.getElementById('github-signin');
    if (githubSigninBtn) {
        githubSigninBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('GitHub Sign-In clicked');
            
            // Show loading state
            githubSigninBtn.style.opacity = '0.7';
            githubSigninBtn.style.pointerEvents = 'none';
            githubSigninBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
            
            // Redirect to GitHub OAuth
            window.location.href = '/auth/github-login';
        });
    }


    // Modal styles
    const modalStyles = document.createElement('style');
    modalStyles.textContent = `
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
            align-items: center;
            justify-content: center;
        }
        .modal.show {
            opacity: 1;
        }
        .modal-content {
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
            padding: 30px;
            max-width: 400px;
            width: 90%;
            position: relative;
            transform: translateY(-20px);
            transition: transform 0.3s ease;
        }
        .modal.show .modal-content {
            transform: translateY(0);
        }
        .close-modal {
            position: absolute;
            top: 15px;
            right: 20px;
            font-size: 24px;
            cursor: pointer;
            color: #4b5563;
            transition: all 0.3s ease;
        }
        .close-modal:hover {
            color: #4f46e5;
        }
        .modal .logo {
            text-align: center;
            margin-bottom: 20px;
        }
        .modal .logo img {
            width: 70px;
            height: auto;
        }
        .modal h2 {
            text-align: center;
            color: #111827;
            margin-bottom: 25px;
            font-weight: 600;
        }
        .input-group {
            position: relative;
            margin-bottom: 20px;
        }
        .input-group i {
            position: absolute;
            left: 15px;
            top: 50%;
            transform: translateY(-50%);
            color: #4b5563;
        }
        .input-group input {
            width: 100%;
            padding: 12px 15px 12px 45px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            font-size: 16px;
            transition: all 0.3s ease;
        }
        .input-group input:focus {
            border-color: #4f46e5;
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
            outline: none;
        }
        .remember-me {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
        }
        .remember-me input {
            margin-right: 10px;
        }
        .login-btn {
            width: 100%;
            padding: 12px;
            background-color: #4f46e5;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .login-btn:hover {
            background-color: #4338ca;
        }
        .forgot-password {
            text-align: center;
            margin: 15px 0;
        }
        .forgot-password a {
            color: #4f46e5;
            text-decoration: none;
            font-size: 14px;
            transition: all 0.3s ease;
        }
        .forgot-password a:hover {
            text-decoration: underline;
        }
        .divider {
            display: flex;
            align-items: center;
            margin: 20px 0;
            color: #4b5563;
        }
        .divider::before,
        .divider::after {
            content: "";
            flex-grow: 1;
            height: 1px;
            background-color: #e5e7eb;
            margin: 0 10px;
        }
        .divider span {
            font-size: 14px;
            white-space: nowrap;
        }
        #g_id_signin {
            text-align: center;
            margin-top: 15px;
            min-height: 40px;
            width: 100%;
            display: block;
        }
        #g_id_signin > div {
            margin: 0 auto;
            max-width: 250px; /* Match Google button width */
        }
        #g_id_signin.loading::after {
            content: 'Loading...';
            display: block;
            text-align: center;
            color: #4f46e5;
            font-size: 14px;
            margin-top: 10px;
        }
        .github-signin-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            padding: 12px;
            background-color: #24292e;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 10px;
            text-decoration: none;
        }
        .github-signin-btn:hover {
            background-color: #2f363d;
        }
        .github-signin-btn i {
            margin-right: 10px;
            font-size: 20px;
        }
        .github-signin-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }
    `;
    document.head.appendChild(modalStyles);



    if (!loginBtn || !loginModal || !passwordResetModal) {
        console.error('Modal elements missing:', { loginBtn, loginModal, passwordResetModal });
        return;
    }

    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        document.body.style.overflow = 'hidden';
        loginModal.style.display = 'flex';
        setTimeout(() => {
            loginModal.classList.add('show');
        }, 10);
    });

    const closeModal = (modal) => {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    };

    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            const parentModal = button.closest('.modal');
            if (parentModal) {
                closeModal(parentModal);
            }
        });
    });

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal(loginModal);
            setTimeout(() => {
                passwordResetModal.style.display = 'flex';
                setTimeout(() => {
                    passwordResetModal.classList.add('show');
                }, 10);
            }, 300);
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === loginModal) {
            closeModal(loginModal);
        }
        if (event.target === passwordResetModal) {
            closeModal(passwordResetModal);
        }
    });

    document.querySelectorAll('.modal-content').forEach(content => {
        content.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (loginModal.classList.contains('show')) {
                closeModal(loginModal);
            }
            if (passwordResetModal.classList.contains('show')) {
                closeModal(passwordResetModal);
            }
        }
    });
});

// Initialize particles.js if available
if (typeof particlesJS !== 'undefined') {
    particlesJS('particles-js', {
        particles: {
            number: { value: 100, density: { enable: true, value_area: 1000 } },
            color: { value: ["#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe"] },
            shape: { type: ["circle", "triangle", "polygon"], stroke: { width: 0 }, polygon: { nb_sides: 6 } },
            opacity: { value: 0.6, random: true, anim: { enable: true, speed: 1, opacity_min: 0.1 } },
            size: { value: 5, random: true, anim: { enable: true, speed: 4, size_min: 0.5 } },
            line_linked: {
                enable: true,
                distance: 150,
                color: "#4f46e5",
                opacity: 0.4,
                width: 1.5,
                shadow: { enable: true, color: "#6366f1", blur: 5 }
            },
            move: {
                enable: true,
                speed: 3,
                direction: "none",
                random: true,
                straight: false,
                out_mode: "bounce",
                attract: { enable: true, rotateX: 1200, rotateY: 1200 }
            }
        },
        interactivity: {
            detect_on: "canvas",
            events: { onhover: { enable: true, mode: "bubble" }, onclick: { enable: true, mode: "repulse" }, resize: true },
            modes: {
                grab: { distance: 180, line_linked: { opacity: 0.8 } },
                bubble: { distance: 200, size: 12, duration: 2, opacity: 0.8 },
                repulse: { distance: 200, duration: 0.4 },
                push: { particles_nb: 4 },
                remove: { particles_nb: 2 }
            }
        },
        retina_detect: true,
        fps_limit: 60,
        background: { color: "transparent" }
    });

    let pulseDirection = 1;
    let pulseSpeed = 0.02;
    let minOpacity = 0.3;
    let maxOpacity = 0.7;
    let currentOpacity = 0.5;

    setInterval(() => {
        if (window.pJSDom && window.pJSDom[0] && window.pJSDom[0].pJS) {
            currentOpacity += pulseSpeed * pulseDirection;
            if (currentOpacity >= maxOpacity) {
                pulseDirection = -1;
            } else if (currentOpacity <= minOpacity) {
                pulseDirection = 1;
            }
            window.pJSDom[0].pJS.particles.line_linked.opacity = currentOpacity;
        }
    }, 100);
}