document.addEventListener('DOMContentLoaded', function () {
    // Define modal content for each page
    const modalContents = {
        features: {
            title: "TyporaX Features",
            content: `
                <div class="info-modal-section">
                    <h3><i class="fas fa-eye"></i> Real-time Markdown Preview</h3>
                    <p>Instantly switch between editing and preview modes, rendering Markdown content seamlessly for a fluid writing experience (Free Plan).</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-search"></i> Search Functionality</h3>
                    <p>Quickly locate content with file search capabilities, streamlining navigation across your Markdown files (Free Plan).</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-moon"></i> Custom Themes</h3>
                    <p>Toggle between light and dark modes to enhance comfort and reduce eye strain during writing or study (Free Plan).</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-music"></i> Audio Playback Support</h3>
                    <p>Integrate audio playback for enriched multimedia learning experiences (Free Plan).</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-graduation-cap"></i> Practice Tools</h3>
                    <p>Access interactive learning modes like sentence practice, fill-in-the-blanks, reverse practice, listening practice, and flashcards (Free Plan).</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-code"></i> Code Syntax Highlighting</h3>
                    <p>Automatic syntax highlighting for code blocks in multiple programming languages, improving readability (Premium Plan).</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-highlighter"></i> Text Highlighting</h3>
                    <p>Highlight text with red, green, or custom colors to emphasize and organize content (Premium Plan).</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-file-alt"></i> File Management</h3>
                    <p>Create, open, and edit files with permanent storage for seamless workflow management (Premium Plan).</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-smile"></i> Emoji Support</h3>
                    <p>Add emojis to enhance reading and editing, making content more engaging (Premium Plan).</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-bookmark"></i> New Word Bookmarking</h3>
                    <p>Bookmark new vocabulary for quick reference during learning (Premium Plan).</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-font"></i> Formatting & Customization</h3>
                    <p>Apply bold, italic, alignment, font size, and style customizations for personalized content (Premium Plan).</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-brain"></i> Advanced Learning Tools</h3>
                    <p>Engage with typing practice, word order, fill-in-the-blanks, and matching exercises for deeper learning (Premium Plan).</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-microphone"></i> Speech Recognition</h3>
                    <p>Utilize OpenAI Whisper integration for hands-free editing and pronunciation practice (Premium Plan).</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-calendar-alt"></i> Schedule Integration</h3>
                    <p>Organize tasks with built-in calendar features for efficient planning (Premium Plan).</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-chart-line"></i> Progress Tracking</h3>
                    <p>Monitor learning with detailed progress tests and visual tracking plots (Premium Plan).</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-book"></i> Book Linking</h3>
                    <p>Link default or customized books with audio for enhanced language learning (Premium & Ultra Premium Plans).</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-image"></i> Image Upload & Insertion</h3>
                    <p>Insert images into documents to enrich content creation (Premium Plan).</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-paper-plane"></i> Direct Email Integration</h3>
                    <p>Send documents with attachments via email for easy sharing (Premium Plan).</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-concierge-bell"></i> Priority Support</h3>
                    <p>Receive faster assistance for a smoother experience (Premium Plan).</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-user-cog"></i> Personalized Lesson Customization</h3>
                    <p>Tailor lessons to your specific needs for a bespoke learning experience (Ultra Premium Plan).</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-book-open"></i> Custom Book & Audio Integration</h3>
                    <p>Integrate personalized books and audio content for advanced learning (Ultra Premium Plan).</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-vial"></i> Tailored Practice Tests</h3>
                    <p>Access customized tests designed to match your learning goals (Ultra Premium Plan).</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-user-tie"></i> Dedicated Account Manager</h3>
                    <p>Receive personalized support from a dedicated manager (Ultra Premium Plan).</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-gem"></i> Premium Content Updates</h3>
                    <p>Stay ahead with exclusive access to new content and features (Ultra Premium Plan).</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-chart-bar"></i> Advanced Analytics Dashboard</h3>
                    <p>Gain insights with a comprehensive dashboard for tracking progress (Ultra Premium Plan).</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-flask"></i> Exclusive Beta Features</h3>
                    <p>Test cutting-edge features before public release (Ultra Premium Plan).</p>
                </div>
            `
        },
        about: {
            title: "About TyporaX",
            content: `
                <div class="info-modal-section">
                    <h3><i class="fas fa-rocket"></i> Our Mission</h3>
                    <p>TyporaX was created with a simple mission: to make document creation beautiful, intuitive, and distraction-free.</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-users"></i> Our Team</h3>
                    <p>We are a small team of developers and designers passionate about markdown and clean documentation.</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-history"></i> Our Story</h3>
                    <p>Founded in 2023, TyporaX emerged from our frustration with existing markdown editors that were either too complex or too simple.</p>
                    <p>We wanted to create a tool that balances powerful features with a clean, intuitive interface.</p>
                </div>
            `
        },
        privacy: {
            title: "Privacy Policy",
            content: `
                <div class="info-modal-section">
                    <h3><i class="fas fa-database"></i> Data Collection</h3>
                    <p>We collect only essential data for account functionality (e.g., username for session management) and to enhance your experience with TyporaX. No unnecessary personal information is stored.</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-lock"></i> Document Storage</h3>
                    <p>Your Markdown files and uploaded content (e.g., images for select users) are encrypted and securely stored. We do not access your documents unless explicitly authorized for support purposes.</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-handshake"></i> Third-Party Services</h3>
                    <p>We utilize trusted third-party tools for syntax highlighting and for Markdown rendering, and Font Awesome for icons. Analytics and authentication may also involve third parties—see our full policy for details.</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-microphone-alt"></i> Speech and Audio Features</h3>
                    <p>For premium users, speech recognition and audio features may process voice data locally or via secure third-party services. This data is not retained beyond the session unless specified.</p>
                </div>
                <div class="info-modal-section">
                    <p>Effective as of April 09, 2024. </p>
                </div>
            `
        },
        terms: {
            title: "Terms of Service",
            content: `
                <div class="info-modal-section">
                    <h3><i class="fas fa-user-shield"></i> User Accounts</h3>
                    <p>You are responsible for securing your account credentials. Premium features (e.g., book linking, speech recognition) may be restricted to premium users as determined by TyporaX.</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-server"></i> Service Usage</h3>
                    <p>TyporaX is offered 'as is,' with no guarantees of uninterrupted service. Features like real-time preview and learning tools depend on third-party libraries.</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-copyright"></i> Content Ownership</h3>
                    <p>You own all content created or uploaded (e.g., Markdown files, images, diary entries). TyporaX claims no rights to your work and will not use it without consent.</p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-check-circle"></i> Acceptable Use</h3>
                    <p>Use TyporaX responsibly. Do not exploit features like email integration or file uploads for spam, malicious content, or unauthorized distribution.</p>
                </div>
                <div class="info-modal-section">
                    <p>Effective as of April 09, 2024.</p>
                </div>
            `
        },
        contact: {
            title: "Contact Us",
            content: `
                <div class="info-modal-section">
                    <h3><i class="fas fa-envelope"></i> Email</h3>
                    <p><a href="mailto:typorax@gmail.com" class="contact-link">typorax@gmail.com</a></p>
                </div>
                <div class="info-modal-section">
                    <h3><i class="fas fa-phone-alt"></i> Phone</h3>
                    <p><a href="tel:+31684698570" class="contact-link">+31 684-698-570</a></p>
                </div>
            `
        }
    };

    // Add modal styles programmatically with enhanced and responsive styling
    const modalStyles = document.createElement('style');
    modalStyles.textContent = `
        /* Info Modal Styling */
        .info-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.4s cubic-bezier(0.19, 1, 0.22, 1);
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
        }
        
        .info-modal.show {
            opacity: 1;
        }
        
        .info-modal-content {
            background-color: var(--bg-color, #ffffff);
            border-radius: var(--border-radius, 12px);
            box-shadow: var(--shadow-lg, 0 15px 30px rgba(0, 0, 0, 0.15), 0 5px 15px rgba(0, 0, 0, 0.08));
            padding: 30px;
            width: 90%;
            max-width: 700px;
            position: relative;
            transform: translateY(-30px) scale(0.95);
            transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
            max-height: 85vh;
            overflow-y: auto;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .info-modal.show .info-modal-content {
            transform: translateY(0) scale(1);
        }
        
        .info-modal-close {
            position: absolute;
            top: 15px;
            right: 20px;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            cursor: pointer;
            color: var(--text-light, #4b5563);
            transition: all 0.3s ease;
            border-radius: 50%;
            background-color: rgba(0, 0, 0, 0.05);
            z-index: 10;
        }
        
        .info-modal-close:hover {
            color: var(--primary-color, #4f46e5);
            background-color: rgba(79, 70, 229, 0.1);
            transform: rotate(90deg);
        }
        
        .info-modal-header {
            position: relative;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid var(--border-color, rgba(79, 70, 229, 0.2));
        }
        
        .info-modal-title {
            text-align: center;
            color: var(--text-color, #111827);
            margin: 0;
            font-weight: 700;
            font-size: 28px;
            background: linear-gradient(45deg, var(--primary-color, #4f46e5), #6366f1);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .info-modal-section {
            margin-bottom: 24px;
            padding: 16px;
            border-radius: 10px;
            transition: all 0.3s ease;
        }
        
        .info-modal-section:hover {
            background: rgba(79, 70, 229, 0.05);
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
        }
        
        .info-modal-section h3 {
            color: var(--text-color, #111827);
            font-size: 18px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            font-weight: 600;
        }
        
        .info-modal-section h3 i {
            margin-right: 12px;
            color: var(--primary-color, #4f46e5);
            font-size: 20px;
            width: 24px;
            text-align: center;
        }
        
        .info-modal-section p {
            color: var(--text-light, #4b5563);
            font-size: 16px;
            line-height: 1.6;
            margin: 0 0 8px 36px;
        }
        
        .info-modal-section p:last-child {
            margin-bottom: 0;
        }
        
        /* Scrollbar styling for modal content */
        .info-modal-content::-webkit-scrollbar {
            width: 8px;
        }
        
        .info-modal-content::-webkit-scrollbar-track {
            background: rgba(229, 231, 235, 0.5);
            border-radius: 10px;
        }
        
        .info-modal-content::-webkit-scrollbar-thumb {
            background: var(--primary-color, #4f46e5);
            border-radius: 10px;
        }
        
        .info-modal-content::-webkit-scrollbar-thumb:hover {
            background: var(--primary-hover, #4338ca);
        }
        
        /* Contact links styling */
        .contact-link {
            color: var(--primary-color, #4f46e5);
            text-decoration: none;
            transition: all 0.3s ease;
            position: relative;
        }
        
        .contact-link:after {
            content: '';
            position: absolute;
            width: 0;
            height: 2px;
            bottom: -2px;
            left: 0;
            background-color: var(--primary-color, #4f46e5);
            transition: width 0.3s ease;
        }
        
        .contact-link:hover:after {
            width: 100%;
        }
        
        /* Responsive styles */
        @media (max-width: 768px) {
            .info-modal-content {
                padding: 20px;
                width: 95%;
                max-height: 80vh;
            }
            
            .info-modal-title {
                font-size: 24px;
            }
            
            .info-modal-section h3 {
                font-size: 17px;
            }
            
            .info-modal-section p {
                font-size: 15px;
                margin-left: 32px;
            }
            
            .info-modal-close {
                top: 10px;
                right: 10px;
                width: 36px;
                height: 36px;
                font-size: 20px;
            }
        }
        
        @media (max-width: 480px) {
            .info-modal-content {
                padding: 16px;
                border-radius: 10px;
            }
            
            .info-modal-title {
                font-size: 22px;
            }
            
            .info-modal-section {
                padding: 12px;
                margin-bottom: 16px;
            }
            
            .info-modal-section h3 {
                font-size: 16px;
            }
            
            .info-modal-section h3 i {
                font-size: 18px;
                margin-right: 10px;
            }
            
            .info-modal-section p {
                font-size: 14px;
                line-height: 1.5;
                margin-left: 28px;
            }
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
            .info-modal-content {
                background-color: #1f2937;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .info-modal-section:hover {
                background: rgba(255, 255, 255, 0.05);
            }
            
            .info-modal-title {
                color: #f3f4f6;
                background: linear-gradient(45deg, #6366f1, #8b5cf6);
                -webkit-background-clip: text;
                background-clip: text;
            }
            
            .info-modal-section h3 {
                color: #f3f4f6;
            }
            
            .info-modal-section p {
                color: #d1d5db;
            }
            
            .info-modal-close {
                color: #d1d5db;
                background-color: rgba(255, 255, 255, 0.1);
            }
            
            .info-modal-close:hover {
                background-color: rgba(255, 255, 255, 0.2);
            }
            
            .info-modal-content::-webkit-scrollbar-track {
                background: rgba(75, 85, 99, 0.3);
            }
        }
        
        /* Animation for modal sections */
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .info-modal.show .info-modal-section {
            animation: fadeInUp 0.4s ease forwards;
            opacity: 0;
        }
        
        /* Staggered animation delay for sections */
        .info-modal.show .info-modal-section:nth-child(1) { animation-delay: 0.1s; }
        .info-modal.show .info-modal-section:nth-child(2) { animation-delay: 0.15s; }
        .info-modal.show .info-modal-section:nth-child(3) { animation-delay: 0.2s; }
        .info-modal.show .info-modal-section:nth-child(4) { animation-delay: 0.25s; }
        .info-modal.show .info-modal-section:nth-child(5) { animation-delay: 0.3s; }
        .info-modal.show .info-modal-section:nth-child(n+6) { animation-delay: 0.35s; }
    `;
    document.head.appendChild(modalStyles);

    // Check if Font Awesome is loaded, if not add it
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const fontAwesome = document.createElement('link');
        fontAwesome.rel = 'stylesheet';
        fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css';
        document.head.appendChild(fontAwesome);
    }

    // Create modal container (only once)
    if (!document.getElementById('infoModal')) {
        const modalHTML = `
            <div id="infoModal" class="info-modal">
                <div class="info-modal-content">
                    <span class="info-modal-close" role="button" aria-label="Close">×</span>
                    <div class="info-modal-header">
                        <h2 id="infoModalTitle" class="info-modal-title"></h2>
                    </div>
                    <div id="infoModalBody"></div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Get modal elements
    const modal = document.getElementById('infoModal');
    const modalTitle = document.getElementById('infoModalTitle');
    const modalBody = document.getElementById('infoModalBody');
    const closeBtn = modal.querySelector('.info-modal-close');

    // Debugging: Check if modal elements exist
    if (!modal || !modalTitle || !modalBody || !closeBtn) {
        console.error('One or more info modal elements not found:', {
            modal,
            modalTitle,
            modalBody,
            closeBtn
        });
        return;
    }

    // Set up event listeners for navigation links
    setupNavLinkListener('features');
    setupNavLinkListener('about');
    setupFooterLinkListener('Privacy Policy', 'privacy');
    setupFooterLinkListener('Terms of Service', 'terms');
    setupFooterLinkListener('Contact Us', 'contact');

    // Add touch support for mobile devices
    let touchStartY = 0;
    let touchEndY = 0;
    const modalContent = modal.querySelector('.info-modal-content');
    
    modalContent.addEventListener('touchstart', function(e) {
        touchStartY = e.changedTouches[0].screenY;
    }, {passive: true});
    
    modalContent.addEventListener('touchend', function(e) {
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    }, {passive: true});
    
    function handleSwipe() {
        if (touchEndY - touchStartY > 100) {
            // Swipe down gesture detected
            closeModal();
        }
    }

    // Close modal function with enhanced animation
    const closeModal = () => {
        document.body.classList.remove('modal-open');
        modal.classList.remove('show');
        
        // Apply closing animation to modal sections
        const sections = modal.querySelectorAll('.info-modal-section');
        sections.forEach((section, index) => {
            section.style.animation = `fadeInUp 0.3s ease-out reverse forwards ${0.05 * (sections.length - index)}s`;
        });
        
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = ''; // Re-enable scrolling
            
            // Reset animations
            sections.forEach(section => {
                section.style.animation = '';
                section.style.opacity = '';
            });
        }, 400); // Match CSS transition duration
    };

    // Close modal when clicking the close button
    closeBtn.addEventListener('click', closeModal);

    // Close modal when clicking outside the modal content
    window.addEventListener('click', function (event) {
        if (event.target === modal) {
            closeModal();
        }
    });

    // Close modal when pressing ESC key
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && modal.classList.contains('show')) {
            closeModal();
        }
    });

    // Prevent propagation of clicks within modal content
    modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Helper function to set up nav link listeners
    function setupNavLinkListener(id) {
        const links = document.querySelectorAll(`nav.nav-links a[href="#${id}"]`);
        links.forEach(link => {
            if (link) {
                link.addEventListener('click', function (e) {
                    e.preventDefault();
                    openModal(id);
                });
            }
        });
    }

    // Helper function to set up footer link listeners
    function setupFooterLinkListener(text, id) {
        const links = document.querySelectorAll('.footer-links a');
        links.forEach(link => {
            if (link.textContent === text || link.textContent.trim() === text) {
                link.addEventListener('click', function (e) {
                    e.preventDefault();
                    openModal(id);
                });
            }
        });
    }

    // Function to open modal with specific content and enhanced animations
    function openModal(id) {
        const modalData = modalContents[id];
        if (modalData) {
            modalTitle.textContent = modalData.title;
            modalBody.innerHTML = modalData.content;
            
            // Add proper accessibility
            modal.setAttribute('aria-labelledby', 'infoModalTitle');
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            
            document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
            document.body.classList.add('modal-open');
            
            modal.style.display = 'flex'; // Use flex for centering
            
            // Small delay to ensure transition works
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
            
            console.log(`${id} modal opened`); // Debugging
            
            // Focus trap for accessibility
            setTimeout(() => {
                closeBtn.focus();
            }, 100);
        } else {
            console.error(`No modal data found for id: ${id}`);
        }
    }
    
    // Helper function to handle mobile nav menu toggles if they exist
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle, .hamburger-menu, #menuToggle');
    if (mobileMenuToggle) {
        const navLinks = document.querySelectorAll('nav.nav-links a, .mobile-nav a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                // Close mobile menu if it's open
                const mobileNav = document.querySelector('.mobile-nav, .nav-links.active');
                if (mobileNav && mobileNav.classList.contains('active')) {
                    mobileNav.classList.remove('active');
                    if (mobileMenuToggle.classList.contains('active')) {
                        mobileMenuToggle.classList.remove('active');
                    }
                }
            });
        });
    }
});