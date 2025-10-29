// enhanced-image-modal.js

document.addEventListener('DOMContentLoaded', () => {
    // Element references with error handling
    const images = document.querySelectorAll('.image-section .screenshot');
    
    // If no images found, exit early
    if (images.length === 0) {
        console.warn('No images with class "screenshot" found in the ".image-section"');
        return;
    }
    
    const imageArray = Array.from(images).map(img => ({
        src: img.src,
        alt: img.alt,
        title: img.getAttribute('title') || img.alt || 'Image'
    }));

    // Create image modal HTML with accessibility improvements
    const modalHTML = `
        <div id="imageModal" class="image-modal" role="dialog" aria-modal="true" aria-label="Image viewer">
            <div class="image-modal-content">
                <button class="image-modal-close" aria-label="Close image viewer">×</button>
                <div class="image-modal-header">
                    <h3 id="modalImageTitle" class="modal-title"></h3>
                    <div class="image-counter"><span id="currentImageNum">1</span>/<span id="totalImages">${imageArray.length}</span></div>
                </div>
                <div class="image-modal-body">
                    <img id="modalImage" src="" alt="" class="modal-image">
                    <button class="nav-btn prev-btn" aria-label="Previous image"><i class="fas fa-chevron-left"></i></button>
                    <button class="nav-btn next-btn" aria-label="Next image"><i class="fas fa-chevron-right"></i></button>
                    <div class="loading-spinner" id="imageLoader">
                        <div class="spinner"></div>
                    </div>
                </div>
                <div class="image-modal-footer">
                    <button id="fullscreenBtn" class="action-btn" aria-label="Toggle fullscreen">
                        <i class="fas fa-expand"></i>
                    </button>
                    <button id="zoomInBtn" class="action-btn" aria-label="Zoom in">
                        <i class="fas fa-search-plus"></i>
                    </button>
                    <button id="zoomOutBtn" class="action-btn" aria-label="Zoom out">
                        <i class="fas fa-search-minus"></i>
                    </button>
                    <button id="resetZoomBtn" class="action-btn" aria-label="Reset zoom">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Get modal elements with error handling
    const modal = document.getElementById('imageModal');
    if (!modal) {
        console.error('Image modal element not found');
        return;
    }

    const modalElements = {
        image: document.getElementById('modalImage'),
        title: document.getElementById('modalImageTitle'),
        currentNum: document.getElementById('currentImageNum'),
        total: document.getElementById('totalImages'),
        closeBtn: modal.querySelector('.image-modal-close'),
        prevBtn: modal.querySelector('.prev-btn'),
        nextBtn: modal.querySelector('.next-btn'),
        fullscreenBtn: document.getElementById('fullscreenBtn'),
        zoomInBtn: document.getElementById('zoomInBtn'),
        zoomOutBtn: document.getElementById('zoomOutBtn'),
        resetZoomBtn: document.getElementById('resetZoomBtn'),
        loader: document.getElementById('imageLoader')
    };

    // Check if all elements exist
    const missingElements = Object.entries(modalElements)
        .filter(([key, element]) => !element)
        .map(([key]) => key);
    
    if (missingElements.length > 0) {
        console.error(`Missing modal elements: ${missingElements.join(', ')}`);
        return;
    }

    // Add modal styles with improved mobile responsiveness
    const modalStyles = document.createElement('style');
    modalStyles.textContent = `
        /* Image Modal Styling */
        .image-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
            align-items: center;
            justify-content: center;
        }
        
        .image-modal.show {
            opacity: 1;
            display: flex;
        }
        
        .image-modal-content {
            background-color: rgba(30, 30, 30, 0.8);
            border-radius: 8px;
            box-shadow: 0 10px 15px rgba(0, 0, 0, 0.2);
            width: 90%;
            max-width: 1200px;
            max-height: 90vh;
            position: relative;
            transform: translateY(-20px);
            transition: transform 0.3s ease;
            display: flex;
            flex-direction: column;
        }
        
        .image-modal.show .image-modal-content {
            transform: translateY(0);
        }
        
        .image-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            color: #fff;
        }
        
        .modal-title {
            margin: 0;
            font-size: 18px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 80%;
        }
        
        .image-counter {
            font-size: 14px;
            color: #ccc;
        }
        
        .image-modal-close {
            position: absolute;
            top: 10px;
            right: 15px;
            font-size: 28px;
            cursor: pointer;
            color: #ffffff;
            background: transparent;
            border: none;
            z-index: 10;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s ease;
        }
        
        .image-modal-close:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }
        
        .image-modal-body {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            flex-grow: 1;
            min-height: 200px;
        }
        
        .modal-image {
            max-width: 100%;
            max-height: calc(90vh - 120px);
            object-fit: contain;
            border-radius: 4px;
            transition: opacity 0.3s ease, transform 0.3s ease;
            cursor: grab;
        }
        
        .modal-image.grabbing {
            cursor: grabbing;
        }
        
        .modal-image.fade {
            opacity: 0;
        }
        
        .image-modal-footer {
            display: flex;
            justify-content: center;
            padding: 10px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .action-btn {
            background-color: rgba(255, 255, 255, 0.1);
            color: #fff;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            margin: 0 5px;
            cursor: pointer;
            transition: background-color 0.2s ease;
        }
        
        .action-btn:hover {
            background-color: rgba(255, 255, 255, 0.3);
        }
        
        .nav-btn {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background-color: rgba(0, 0, 0, 0.5);
            color: #ffffff;
            border: none;
            width: 40px;
            height: 40px;
            font-size: 18px;
            cursor: pointer;
            border-radius: 50%;
            transition: background-color 0.3s ease, opacity 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 5;
        }
        
        .nav-btn:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }
        
        .prev-btn {
            left: 15px;
        }
        
        .next-btn {
            right: 15px;
        }
        
        .loading-spinner {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            display: none;
        }
        
        .loading-spinner.show {
            display: block;
        }
        
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        /* Responsive styles */
        @media (max-width: 768px) {
            .image-modal-content {
                width: 95%;
                max-height: 95vh;
            }
            
            .modal-title {
                font-size: 16px;
                max-width: 70%;
            }
            
            .nav-btn {
                width: 36px;
                height: 36px;
                font-size: 16px;
            }
            
            .action-btn {
                padding: 6px 10px;
                font-size: 14px;
            }
            
            .modal-image {
                max-height: calc(95vh - 110px);
            }
        }
        
        @media (max-width: 480px) {
            .image-modal-content {
                width: 100%;
                height: 100%;
                max-height: 100vh;
                border-radius: 0;
            }
            
            .modal-image {
                max-height: calc(100vh - 110px);
            }
            
            .nav-btn {
                opacity: 0.7;
                width: 32px;
                height: 32px;
            }
            
            .action-btn {
                padding: 5px 8px;
                margin: 0 3px;
            }
        }
    `;
    document.head.appendChild(modalStyles);

    let currentIndex = 0;
    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    let isFullscreen = false;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;

    // Show loading spinner while image loads
    const showLoader = () => {
        modalElements.loader.classList.add('show');
    };

    const hideLoader = () => {
        modalElements.loader.classList.remove('show');
    };

    // Open modal with selected image
    const openModal = (index) => {
        currentIndex = index;
        resetZoom();
        updateImage();
        document.body.style.overflow = 'hidden';
        modal.classList.add('show');
        
        // Announce to screen readers
        const announcer = document.createElement('div');
        announcer.setAttribute('aria-live', 'polite');
        announcer.classList.add('sr-only');
        announcer.textContent = `Image viewer opened. Use arrow keys to navigate between images. Press Escape to close.`;
        document.body.appendChild(announcer);
        setTimeout(() => announcer.remove(), 1000);
        
        console.log(`Image modal opened at index: ${index}`);
    };

    // Close modal
    const closeModal = () => {
        modal.classList.remove('show');
        setTimeout(() => {
            document.body.style.overflow = '';
            resetZoom();
        }, 300);
        
        // Exit fullscreen if active
        if (isFullscreen && document.exitFullscreen) {
            document.exitFullscreen();
        }
    };

    // Update displayed image
    const updateImage = () => {
        showLoader();
        modalElements.image.classList.add('fade');
        
        // Update counter and title
        modalElements.currentNum.textContent = currentIndex + 1;
        modalElements.title.textContent = imageArray[currentIndex].title;
        
        setTimeout(() => {
            modalElements.image.src = imageArray[currentIndex].src;
            modalElements.image.alt = imageArray[currentIndex].alt;
            
            // When image loads, remove fade effect and hide loader
            modalElements.image.onload = () => {
                modalElements.image.classList.remove('fade');
                hideLoader();
            };
            
            // If image fails to load
            modalElements.image.onerror = () => {
                hideLoader();
                modalElements.image.alt = 'Failed to load image';
                modalElements.image.classList.remove('fade');
            };
        }, 300);
    };

    // Navigate to previous image
    const showPrevImage = () => {
        currentIndex = (currentIndex - 1 + imageArray.length) % imageArray.length;
        resetZoom();
        updateImage();
    };

    // Navigate to next image
    const showNextImage = () => {
        currentIndex = (currentIndex + 1) % imageArray.length;
        resetZoom();
        updateImage();
    };

    // Zoom functions
    const zoomIn = () => {
        scale = Math.min(scale * 1.2, 5);
        updateTransform();
    };

    const zoomOut = () => {
        scale = Math.max(scale / 1.2, 0.5);
        updateTransform();
    };

    const resetZoom = () => {
        scale = 1;
        translateX = 0;
        translateY = 0;
        updateTransform();
    };

    // Update image transform
    const updateTransform = () => {
        modalElements.image.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    };

    // Toggle fullscreen
    const toggleFullscreen = () => {
        if (!isFullscreen) {
            if (modal.requestFullscreen) {
                modal.requestFullscreen();
            } else if (modal.webkitRequestFullscreen) {
                modal.webkitRequestFullscreen();
            } else if (modal.msRequestFullscreen) {
                modal.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    };

    // Drag functionality for panning when zoomed
    const startDrag = (e) => {
        if (scale <= 1) return;
        
        isDragging = true;
        modalElements.image.classList.add('grabbing');
        
        // Get starting position for mouse or touch
        if (e.type === 'mousedown') {
            startX = e.clientX;
            startY = e.clientY;
        } else if (e.type === 'touchstart') {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }
        
        lastX = translateX;
        lastY = translateY;
    };

    const drag = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        
        let currentX, currentY;
        if (e.type === 'mousemove') {
            currentX = e.clientX;
            currentY = e.clientY;
        } else if (e.type === 'touchmove') {
            currentX = e.touches[0].clientX;
            currentY = e.touches[0].clientY;
        }
        
        translateX = lastX + (currentX - startX);
        translateY = lastY + (currentY - startY);
        updateTransform();
    };

    const endDrag = () => {
        isDragging = false;
        modalElements.image.classList.remove('grabbing');
    };

    // Handle mouse wheel for zooming
    const handleWheel = (e) => {
        e.preventDefault();
        if (e.deltaY < 0) {
            zoomIn();
        } else {
            zoomOut();
        }
    };

    // Handle pinch zoom on mobile
    let initialDistance = 0;
    let initialScale = 1;

    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            initialDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            initialScale = scale;
        } else if (e.touches.length === 1) {
            startDrag(e);
        }
    };

    const handleTouchMove = (e) => {
        if (e.touches.length === 2) {
            const currentDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            
            const ratio = currentDistance / initialDistance;
            scale = Math.min(Math.max(initialScale * ratio, 0.5), 5);
            updateTransform();
        } else if (e.touches.length === 1 && isDragging) {
            drag(e);
        }
    };

    // Handle swipe navigation
    let touchStartX = 0;
    let touchStartTime = 0;

    const handleSwipeStart = (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartTime = Date.now();
    };

    const handleSwipeEnd = (e) => {
        if (scale > 1) return; // Don't navigate if zoomed in
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchTime = Date.now() - touchStartTime;
        const swipeDistance = touchEndX - touchStartX;
        
        // Only register fast swipes with significant distance
        if (touchTime < 300 && Math.abs(swipeDistance) > 50) {
            if (swipeDistance > 0) {
                showPrevImage();
            } else {
                showNextImage();
            }
        }
    };

    // Fullscreen change handler
    const handleFullscreenChange = () => {
        isFullscreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.msFullscreenElement
        );
        
        modalElements.fullscreenBtn.innerHTML = isFullscreen ? 
            '<i class="fas fa-compress"></i>' : 
            '<i class="fas fa-expand"></i>';
    };

    // Add click event listeners to images
    images.forEach((img, index) => {
        img.style.cursor = 'pointer';
        img.setAttribute('role', 'button');
        img.setAttribute('aria-label', `View ${img.alt || 'image'} in gallery`);
        img.setAttribute('tabindex', '0');
        
        // Handle both click and keyboard accessibility
        img.addEventListener('click', () => openModal(index));
        img.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openModal(index);
            }
        });
    });

    // Modal event listeners
    modalElements.closeBtn.addEventListener('click', closeModal);
    modalElements.prevBtn.addEventListener('click', showPrevImage);
    modalElements.nextBtn.addEventListener('click', showNextImage);
    modalElements.zoomInBtn.addEventListener('click', zoomIn);
    modalElements.zoomOutBtn.addEventListener('click', zoomOut);
    modalElements.resetZoomBtn.addEventListener('click', resetZoom);
    modalElements.fullscreenBtn.addEventListener('click', toggleFullscreen);
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!modal.classList.contains('show')) return;
        
        switch (e.key) {
            case 'ArrowLeft':
                showPrevImage();
                break;
            case 'ArrowRight':
                showNextImage();
                break;
            case 'Escape':
                closeModal();
                break;
            case '+':
                zoomIn();
                break;
            case '-':
                zoomOut();
                break;
            case '0':
                resetZoom();
                break;
            case 'f':
                toggleFullscreen();
                break;
        }
    });

    // Close modal when clicking outside content
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Mouse drag events
    modalElements.image.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
    
    // Touch events for mobile
    modalElements.image.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', endDrag);
    
    // Swipe navigation
    modalElements.image.addEventListener('touchstart', handleSwipeStart);
    modalElements.image.addEventListener('touchend', handleSwipeEnd);
    
    // Wheel event for zoom
    modalElements.image.addEventListener('wheel', handleWheel, { passive: false });
    
    // Fullscreen change event
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    // Use double-tap/click for zooming
    let lastTap = 0;
    const handleDoubleTap = (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        
        if (tapLength < 300 && tapLength > 0) {
            // Double tap detected
            if (scale > 1) {
                resetZoom();
            } else {
                // Zoom in to where the user double-tapped
                scale = 2;
                updateTransform();
            }
            e.preventDefault();
        }
        
        lastTap = currentTime;
    };
    
    modalElements.image.addEventListener('click', handleDoubleTap);
    modalElements.image.addEventListener('touchend', handleDoubleTap);

    // Add image preloading
    const preloadImages = (index) => {
        if (imageArray.length <= 1) return;
        
        // Preload next image
        const nextIndex = (index + 1) % imageArray.length;
        const nextImage = new Image();
        nextImage.src = imageArray[nextIndex].src;
        
        // Preload previous image
        const prevIndex = (index - 1 + imageArray.length) % imageArray.length;
        const prevImage = new Image();
        prevImage.src = imageArray[prevIndex].src;
    };
    
    // Preload adjacent images when the current image loads
    modalElements.image.addEventListener('load', () => {
        preloadImages(currentIndex);
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (modal.classList.contains('show')) {
            resetZoom();
        }
    });
    
    // Notify when loaded
    console.log('Enhanced image modal initialized with', imageArray.length, 'images');

    // Provide fallback for missing Font Awesome icons
    const checkForFontAwesome = () => {
        // Simplified check for Font Awesome
        const iconElementTest = document.querySelector('.fas');
        const hasIconFont = iconElementTest && 
            window.getComputedStyle(iconElementTest, ':before').content !== 'none';
        
        if (!hasIconFont) {
            console.warn('Font Awesome not detected, applying text fallbacks for buttons');
            
            // Replace icon elements with text
            const iconReplacements = {
                'prev-btn': '←',
                'next-btn': '→',
                'image-modal-close': '×',
                'fullscreenBtn': '⤢',
                'zoomInBtn': '+',
                'zoomOutBtn': '−',
                'resetZoomBtn': '↺'
            };
            
            for (const [selector, text] of Object.entries(iconReplacements)) {
                const element = document.querySelector(`.${selector}`) || document.getElementById(selector);
                if (element) {
                    element.innerHTML = text;
                }
            }
        }
    };
    
    // Check for Font Awesome after a short delay
    setTimeout(checkForFontAwesome, 500);
});