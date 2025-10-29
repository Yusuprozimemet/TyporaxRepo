let sidebarVisible = false;

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const overlay = document.getElementById('mobile-overlay');

    sidebarVisible = !sidebarVisible;

    if (sidebarVisible) {
        sidebar.style.transform = 'translateX(0)';
        sidebar.style.opacity = '1';
        toggleBtn.classList.add('open');
        toggleBtn.setAttribute('aria-expanded', 'true');
        overlay.style.display = 'block';
        setTimeout(() => {
            overlay.style.opacity = '1';
        }, 10);
        document.body.classList.add('sidebar-open');
    } else {
        sidebar.style.transform = 'translateX(-100%)';
        sidebar.style.opacity = '0';
        toggleBtn.classList.remove('open');
        toggleBtn.setAttribute('aria-expanded', 'false');
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
        document.body.classList.remove('sidebar-open');
    }
}

function createOverlay() {
    let overlay = document.getElementById('mobile-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'mobile-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.4)';
        overlay.style.zIndex = '90';
        overlay.style.display = 'none';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease';
        overlay.addEventListener('click', toggleSidebar);
        document.body.appendChild(overlay);
    }
    return overlay;
}

function setupMobileLayout() {
    const isMobile = window.innerWidth <= 768;
    const sidebar = document.querySelector('.sidebar');
    const editor = document.querySelector('.editor');
    const menuBar = document.querySelector('.menu-bar');
    const appFooter = document.querySelector('.app-footer');
    let toggleBtn = document.getElementById('sidebar-toggle');

    // Ensure mobile styles are added if not already present
    ensureMobileStyles();

    // Create or get the overlay
    const overlay = createOverlay();

    if (isMobile) {
        // Add mobile class to body for CSS targeting
        document.body.classList.add('mobile-view');

        // Setup toggle button in menu bar if not already present
        if (!toggleBtn) {
            toggleBtn = document.createElement('button');
            toggleBtn.id = 'sidebar-toggle';
            toggleBtn.classList.add('menu-item');
            toggleBtn.innerHTML = `
                <span class="hamburger">
                    <span></span>
                    <span></span>
                    <span></span>
                </span>`;
            toggleBtn.setAttribute('aria-label', 'Toggle menu');
            toggleBtn.onclick = toggleSidebar;
            menuBar.insertBefore(toggleBtn, menuBar.firstChild);
        }

        // Mobile sidebar styles - leverage existing CSS variables
        sidebar.style.position = 'fixed';
        sidebar.style.top = '0';
        sidebar.style.left = '0';
        sidebar.style.width = '80%';
        sidebar.style.maxWidth = '300px';
        sidebar.style.height = '100vh';
        sidebar.style.backgroundColor = 'var(--sidebar-bg)';
        sidebar.style.borderRight = '1px solid var(--sidebar-border)';
        sidebar.style.zIndex = '100';
        sidebar.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        sidebar.style.transform = sidebarVisible ? 'translateX(0)' : 'translateX(-100%)';
        sidebar.style.opacity = sidebarVisible ? '1' : '0';
        sidebar.style.boxShadow = '2px 0 8px rgba(0, 0, 0, 0.15)';
        sidebar.style.overflowY = 'auto'; // Ensure sidebar is scrollable

        // Fix for sidebar file display
        const fileList = sidebar.querySelector('.file-list') || sidebar.querySelector('ul');
        if (fileList) {
            fileList.style.width = '100%';
            fileList.style.overflowX = 'hidden';
            fileList.style.wordBreak = 'break-word'; // Break long filenames

            // Ensure all list items/files are properly styled
            const fileItems = fileList.querySelectorAll('li');
            fileItems.forEach(item => {
                item.style.width = '100%';
                item.style.whiteSpace = 'normal'; // Allow text wrapping
                item.style.textOverflow = 'ellipsis';
                item.style.overflow = 'hidden';
                item.style.padding = '4px 8px';
                item.style.boxSizing = 'border-box';
            });
        }

        // Menu bar adjustments for mobile
        menuBar.style.width = '100%';
        menuBar.style.position = 'fixed';
        menuBar.style.top = '0';
        menuBar.style.left = '0';
        menuBar.style.zIndex = '90';
        menuBar.style.padding = 'max(4px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right)) 4px max(10px, env(safe-area-inset-left))';
        menuBar.style.boxSizing = 'border-box';

        // Footer adjustments for mobile - make it small but visible
        if (appFooter) {
            appFooter.style.display = 'flex'; // Use flex to arrange items
            appFooter.style.flexDirection = 'row'; // Arrange items horizontally
            appFooter.style.justifyContent = 'space-between'; // Distribute items evenly
            appFooter.style.alignItems = 'center'; // Vertically align items
            appFooter.style.position = 'fixed';
            appFooter.style.bottom = '0';
            appFooter.style.left = '0';
            appFooter.style.width = '100%';
            appFooter.style.height = 'auto'; // Adjust height automatically
            appFooter.style.padding = '4px';
            appFooter.style.fontSize = '10px'; // Small font
            appFooter.style.lineHeight = '1';
            appFooter.style.textAlign = 'center';
            appFooter.style.backgroundColor = 'var(--footer-bg, #f0f0f0)';
            appFooter.style.borderTop = '1px solid var(--footer-border, #ddd)';
            appFooter.style.zIndex = '90';
            appFooter.style.boxSizing = 'border-box';
            appFooter.style.paddingBottom = 'max(4px, env(safe-area-inset-bottom))';

            // Adjust editor bottom spacing to account for footer
            // Adjust editor bottom spacing to account for footer
            editor.style.height = `calc(100vh - ${menuBar.offsetHeight}px - ${appFooter.offsetHeight}px)`;
            editor.style.paddingBottom = '0';
            editor.style.marginBottom = '0';

            // Target the book-links div and adjust its styling
            const bookLinks = appFooter.querySelector('.book-links');
            if (bookLinks) {
                bookLinks.style.display = 'flex';         // Use flexbox for horizontal arrangement
                bookLinks.style.flexDirection = 'row';   // Ensure items are in a row
                bookLinks.style.justifyContent = 'flex-start'; // Align items to the start
                bookLinks.style.alignItems = 'center';    // Vertically align items
                bookLinks.style.flexWrap = 'wrap';        // Allows items to wrap to the next line if needed
            }

            // Style each book-link
            const bookLinkElements = appFooter.querySelectorAll('.book-links a');
            bookLinkElements.forEach(link => {
                link.style.fontSize = '10px';  // Set font size
                link.style.margin = '0 2px';   // Add horizontal spacing
                link.style.padding = '2px 4px'; // Add some padding
                link.style.textDecoration = 'none';// Remove underlines
            });

            // Target the copyright notice
            const copyrightNotice = appFooter.querySelector('p');
            if (copyrightNotice) {
                copyrightNotice.style.fontSize = '10px';   // Set font size
                copyrightNotice.style.margin = '0';        // Remove default margins
                copyrightNotice.style.textAlign = 'center'; // Center text
            }

            // Adjust button group
            const buttonGroup = appFooter.querySelector('.button-group');
            if (buttonGroup) {
                buttonGroup.style.display = 'flex';
                buttonGroup.style.flexDirection = 'row';
                buttonGroup.style.justifyContent = 'flex-start'; // Push buttons to the left
                buttonGroup.style.alignItems = 'center';
                buttonGroup.style.overflowX = 'auto';  // Enable horizontal scrolling
                buttonGroup.style.whiteSpace = 'nowrap';// Prevent wrapping
                buttonGroup.style.webkitOverflowScrolling = 'touch'; // For smooth scrolling
            }

            // Style each button
            const buttons = appFooter.querySelectorAll('.button-group button');
            buttons.forEach(button => {
                button.style.fontSize = '10px';
                button.style.padding = '2px 4px';
                button.style.margin = '0 2px';
                button.style.display = 'inline-block'; // Ensure inline display
                button.style.flexShrink = '0';        // Prevent shrinking
                button.style.maxWidth = '80px';       // Set a maximum width
                button.style.overflow = 'hidden';     // Hide overflowing text
                button.style.textOverflow = 'ellipsis';// Add ellipsis for overflow
            });
        }

        // Editor adjustments
        editor.style.marginTop = `${menuBar.offsetHeight}px`; // Account for fixed menu bar
        editor.style.width = '100%';
        editor.style.padding = '0.5rem';
        editor.style.boxSizing = 'border-box';

        // Hide unnecessary UI elements on mobile
        const elementsToHide = [
            'menu-insert',
            'current-file-display',
            'highlight-buttons'
        ];

        elementsToHide.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'none';
        });
    } else {
        // Revert mobile styles
        document.body.classList.remove('mobile-view');

        // Revert sidebar styles
        if (sidebar) {
            sidebar.style.position = '';
            sidebar.style.top = '';
            sidebar.style.left = '';
            sidebar.style.width = '';
            sidebar.style.maxWidth = '';
            sidebar.style.height = '';
            sidebar.style.backgroundColor = '';
            sidebar.style.borderRight = '';
            sidebar.style.zIndex = '';
            sidebar.style.transition = '';
            sidebar.style.transform = '';
            sidebar.style.opacity = '';
            sidebar.style.boxShadow = '';
            sidebar.style.overflowY = '';
        }

        // Revert menu bar styles
        if (menuBar) {
            menuBar.style.width = '';
            menuBar.style.position = '';
            menuBar.style.top = '';
            menuBar.style.left = '';
            menuBar.style.zIndex = '';
            menuBar.style.padding = '';
            menuBar.style.boxSizing = '';
        }

        // Revert footer styles
        if (appFooter) {
            appFooter.style.display = '';
            appFooter.style.position = '';
            appFooter.style.bottom = '';
            appFooter.style.left = '';
            appFooter.style.width = '';
            appFooter.style.height = '';
            appFooter.style.padding = '';
            appFooter.style.fontSize = '';
            appFooter.style.lineHeight = '';
            appFooter.style.textAlign = '';
            appFooter.style.backgroundColor = '';
            appFooter.style.borderTop = '';
            appFooter.style.zIndex = '';
            appFooter.style.boxSizing = '';
            appFooter.style.paddingBottom = '';

            // Revert book-links styles
            const bookLinks = appFooter.querySelector('.book-links');
            if (bookLinks) {
                bookLinks.style.display = '';
                bookLinks.style.flexDirection = '';
                bookLinks.style.justifyContent = '';
                bookLinks.style.alignItems = '';
                bookLinks.style.flexWrap = '';
            }

            const bookLinkElements = appFooter.querySelectorAll('.book-links a');
            bookLinkElements.forEach(link => {
                link.style.fontSize = '';
                link.style.margin = '';
                link.style.padding = '';
                link.style.textDecoration = '';
            });

            // Revert button group styles
            const buttonGroup = appFooter.querySelector('.button-group');
            if (buttonGroup) {
                buttonGroup.style.display = '';
                buttonGroup.style.flexDirection = '';
                buttonGroup.style.justifyContent = '';
                buttonGroup.style.alignItems = '';
                buttonGroup.style.overflowX = '';
                buttonGroup.style.whiteSpace = '';
                buttonGroup.style.webkitOverflowScrolling = '';
            }

            const buttons = appFooter.querySelectorAll('.button-group button');
            buttons.forEach(button => {
                button.style.fontSize = '';
                button.style.padding = '';
                button.style.margin = '';
                button.style.display = '';
                button.style.flexShrink = '';
                button.style.maxWidth = '';
                button.style.overflow = '';
                button.style.textOverflow = '';
            });

            const copyrightNotice = appFooter.querySelector('p');
            if (copyrightNotice) {
                copyrightNotice.style.fontSize = '';
                copyrightNotice.style.margin = '';
                copyrightNotice.style.textAlign = '';
            }
        }

        // Revert editor styles
        if (editor) {
            editor.style.marginTop = '';
            editor.style.width = '';
            editor.style.padding = '';
            editor.style.boxSizing = '';
            editor.style.height = '';
            editor.style.marginBottom = '';
        }

        // Show UI elements
        const elementsToShow = [
            'menu-insert',
            'current-file-display',
            'highlight-buttons'
        ];

        elementsToShow.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = '';
        });

        // Remove toggle button if exists
        if (toggleBtn) {
            toggleBtn.remove();
        }
        if (overlay) {
            overlay.remove();
        }
    }
}

function ensureMobileStyles() {
    if (!document.getElementById('mobile-styles')) {
        const style = document.createElement('style');
        style.id = 'mobile-styles';
        style.textContent = `
            body.mobile-view #send-button {
                display: none !important; /* Hide the send button */
            }

            body.mobile-view #sidebartoggle {
                display: none !important; /* Hide the sidebar toggle button */
            }

            body.mobile-view .app-footer {
                display: flex; /* Ensure footer uses flexbox */
                flex-direction: row; /* Arrange items horizontally */
                justify-content: space-between; /* Distribute items evenly */
                align-items: center; /* Align items vertically */
            }

            body.mobile-view .book-links {
                display: flex; /* Use flexbox for horizontal arrangement */
                flex-direction: row;
                justify-content: flex-start; /* Align to the left */
                align-items: center;
                flex-wrap: wrap; /* Allow wrapping */
            }

            body.mobile-view .book-links a {
                font-size: 10px;
                margin: 0 2px;
                padding: 2px 4px;
            }

            body.mobile-view .button-group {
                display: flex;
                flex-direction: row;
                justify-content: flex-start;
                align-items: center;
                overflow-x: auto; /* Enable horizontal scrolling */
                white-space: nowrap; /* Prevent wrapping to next line */
                -webkit-overflow-scrolling: touch; /* Enable smooth scrolling on iOS */
            }

            body.mobile-view .button-group button {
                display: inline-block; /* Ensure buttons are inline */
                font-size: 10px;
                padding: 2px 4px;
                margin: 0 2px;
                flex-shrink: 0; /* Prevent buttons from shrinking */
                max-width: 80px;       /* Set a maximum width */
                overflow: hidden;     /* Hide overflowing text */
                text-overflow: ellipsis;/* Add ellipsis for overflow */
            }

            body.mobile-view #reading-emojis {
                display: none !important; /* Hide reading-emojis in mobile mode */
            }

            body.mobile-view .formatting-selector {
                display: none !important; /* Hide formatting-selector in mobile mode */
            }

            body.mobile-view #font-settings {
                display: none !important; /* Hide font-settings in mobile mode */
            }

            body.mobile-view #menu-progress {
                display: none !important; /* Hide the Test button in mobile mode */
            }

            body.mobile-view #menu-plot {
                display: none !important; /* Hide the Plot button in mobile mode */
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize setup on page load and resize
document.addEventListener('DOMContentLoaded', setupMobileLayout);
window.addEventListener('resize', setupMobileLayout);
