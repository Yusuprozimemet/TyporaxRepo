document.addEventListener('DOMContentLoaded', () => {
    let pdfModal;
    let manageBooksModal;
    let toastNotification;

    const createElementWithClass = (tag, className) => {
        const element = document.createElement(tag);
        element.className = className;
        return element;
    };

    const injectStyles = () => {
        const styles = `
            /* General Modal Styles */
            .pdf-modal, .manage-books-modal {
                display: none;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(8px);
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .pdf-modal.active, .manage-books-modal.active {
                opacity: 1;
            }
            
            .pdf-content {
                background-color: var(--editor-bg, #ffffff);
                color: var(--editor-text-color, #333333);
                border: none;
                border-radius: 12px;
                margin: 5% auto;
                padding: 0;
                box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
                width: 85%; /* Original size for PDF modal */
                height: 85%;
                display: flex;
                flex-direction: column;
                transform: translateY(-20px);
                opacity: 0;
                transition: transform 0.4s ease, opacity 0.4s ease;
                overflow: hidden;
            }
            
            .manage-books-content {
                background-color: var(--editor-bg, #ffffff);
                color: var(--editor-text-color, #333333);
                border: none;
                border-radius: 12px;
                margin: 5% auto;
                padding: 0;
                box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
                width: 70%; /* Smaller size for Book Management modal */
                height: 70%;
                display: flex;
                flex-direction: column;
                transform: translateY(-20px);
                opacity: 0;
                transition: transform 0.4s ease, opacity 0.4s ease;
                overflow: hidden;
            }
            
            .pdf-modal.active .pdf-content, 
            .manage-books-modal.active .manage-books-content {
                transform: translateY(0);
                opacity: 1;
            }
            
            /* Header Styles */
            .pdf-header, .manage-books-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid var(--footer-border, #e0e0e0);
                padding: 15px 20px;
                background-color: var(--menu-bg, #f8f8f8);
            }
            
            .pdf-header h3, .manage-books-header h3 {
                margin: 0;
                font-size: 1.4em;
                font-weight: 600;
                color: var(--editor-text-color, #333333);
            }
            
            .pdf-close-btn, .manage-books-close-btn {
                background-color: transparent;
                color: var(--menu-item-color, #555);
                border: none;
                font-size: 1.8em;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .pdf-close-btn:hover, .manage-books-close-btn:hover {
                background-color: rgba(0, 0, 0, 0.1);
                color: var(--menu-item-hover-color, #222);
            }
            
            /* Body Styles */
            .pdf-body, .manage-books-body {
                flex-grow: 1;
                overflow: auto;
                padding: 0;
            }
            
            .manage-books-body {
                padding: 20px;
            }
            
            #pdf-viewer {
                width: 100%;
                height: 100%;
                border: none;
            }
            
            /* Loading Spinner */
            .pdf-loading-wrapper {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                background-color: rgba(255, 255, 255, 0.8);
                z-index: 5;
                transition: opacity 0.3s ease;
            }
            
            .pdf-loading-spinner {
                width: 50px;
                height: 50px;
                border: 4px solid rgba(0, 0, 0, 0.1);
                border-radius: 50%;
                border-top: 4px solid #3498db;
                animation: pdf-spin 1s linear infinite;
            }
            
            @keyframes pdf-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            
            
            .book-links-loading, .book-links-error {
                padding: 8px 12px;
                color: var(--menu-item-color, #666);
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .book-links-loading i {
                animation: spin 1s linear infinite;
            }
            
            .book-links-error i {
                color: #e74c3c;
            }
            
            /* Book Management Styles */
            .add-book-form {
                display: grid;
                grid-template-columns: 1fr 1fr 2fr auto;
                gap: 14px;
                margin-bottom: 28px;
                padding: 24px;
                border-radius: 10px;
                background-color: var(--sidebar-bg, #ffffff);
                border: 1px solid var(--sidebar-border, #d9e1e8);
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
            }
            
            .add-book-form input {
                padding: 12px 14px;
                border: 1px solid var(--search-input-border, #c5d0db);
                border-radius: 8px;
                font-size: 0.95em;
                background-color: var(--search-input-bg, #f7f9fc);
                color: var(--text-color, #1f2a44);
                transition: all 0.2s ease;
            }
            
            .add-book-form input:focus {
                border-color: var(--switch-active, #2563eb);
                box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
                outline: none;
            }
            
            .add-book-form button {
                background-color: var(--switch-active, #2563eb);
                color: white;
                border: none;
                padding: 12px 18px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.25s ease;
            }
            
            .add-book-form button:hover {
                filter: brightness(1.1);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
            }
            
            .add-book-form h4 {
                grid-column: 1 / -1;
                margin: 0 0 12px 0;
                font-size: 1.1em;
                color: var(--text-color, #1f2a44);
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .add-book-form h4 i {
                color: var(--switch-active, #2563eb);
            }
            
            #book-list {
                display: grid;
                gap: 18px;
            }
            
            .book-item {
                display: grid;
                grid-template-columns: 1fr 1fr 2fr auto auto;
                gap: 14px;
                padding: 18px;
                border-radius: 10px;
                background-color: var(--editor-bg, #ffffff);
                border: 1px solid var(--file-item-border, #d9e1e8);
                box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
                transition: all 0.25s ease;
                align-items: center;
            }
            
            .book-item:hover {
                box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
                transform: translateY(-2px);
                border-color: var(--search-input-border, #c5d0db);
            }
            
            .book-item input {
                padding: 10px 14px;
                border: 1px solid var(--search-input-border, #c5d0db);
                border-radius: 8px;
                font-size: 0.95em;
                background-color: var(--search-input-bg, #f7f9fc);
                color: var(--text-color, #1f2a44);
                transition: all 0.2s ease;
            }
            
            .book-item input:focus {
                border-color: var(--switch-active, #2563eb);
                box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
                outline: none;
            }
            
            .book-item button {
                border: none;
                padding: 10px 14px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.25s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                min-width: 46px;
                height: 40px;
            }
            
            .book-item .delete-book-btn {
                background-color: var(--highlight-red, #ffe6e8);
                color: #e11d48;
            }
            
            .book-item .delete-book-btn:hover {
                background-color: #fecdd3;
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(225, 29, 72, 0.2);
            }
            
            .book-item .edit-book-btn {
                background-color: var(--highlight-green, #e6f9e6);
                color: #16a34a;
            }
            
            .book-item .edit-book-btn:hover {
                background-color: #dcfce7;
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(22, 163, 74, 0.2);
            }
            
            /* No Books Message */
            .no-books-message {
                text-align: center;
                padding: 30px;
                background-color: var(--search-input-bg, #f7f9fc);
                border: 1px solid var(--file-item-border, #d9e1e8);
                border-radius: 10px;
                color: var(--menu-item-color, #5c6b80);
                font-size: 1.1em;
                margin-top: 24px;
            }
            
            .no-books-message i {
                font-size: 2em;
                margin-bottom: 12px;
                color: var(--button-text, #5c6b80);
                display: block;
            }
            
            /* Empty State */
            .empty-state {
                text-align: center;
                padding: 48px 24px;
                color: var(--menu-item-color, #5c6b80);
                background-color: var(--search-input-bg, #f7f9fc);
                border-radius: 10px;
                border: 1px dashed var(--file-item-border, #d9e1e8);
                margin-top: 16px;
            }
            
            .empty-state i {
                font-size: 3em;
                margin-bottom: 16px;
                color: var(--button-text, #5c6b80);
                display: block;
            }
            
            .empty-state h3 {
                margin-bottom: 12px;
                font-size: 1.4em;
                color: var(--text-color, #1f2a44);
            }
            
            .empty-state p {
                max-width: 450px;
                margin: 0 auto;
                margin-bottom: 24px;
                line-height: 1.6;
            }
            
            /* Toast Notification */
            .toast-notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background-color: #333;
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
                display: flex;
                align-items: center;
                gap: 10px;
                transform: translateY(100px);
                opacity: 0;
                transition: transform 0.3s ease, opacity 0.3s ease;
                z-index: 2000;
                max-width: 300px;
            }
            
            .toast-notification.success {
                background-color: #2ecc71;
            }
            
            .toast-notification.error {
                background-color: #e74c3c;
            }
            
            .toast-notification.info {
                background-color: #3498db;
            }
            
            .toast-notification.show {
                transform: translateY(0);
                opacity: 1;
            }
            
            .toast-notification i {
                font-size: 1.2em;
            }
            
            /* No Books Message */
            .no-books-message {
                text-align: center;
                padding: 30px;
                background-color: #f8f8f8;
                border-radius: 8px;
                color: #666;
                font-size: 1.1em;
                margin-top: 20px;
            }
            
            .no-books-message i {
                font-size: 2em;
                margin-bottom: 10px;
                color: #999;
                display: block;
            }
            
            /* Empty State */
            .empty-state {
                text-align: center;
                padding: 40px 20px;
                color: #666;
            }
            
            .empty-state i {
                font-size: 3em;
                margin-bottom: 15px;
                color: #999;
                display: block;
            }
            
            .empty-state h3 {
                margin-bottom: 10px;
                font-size: 1.4em;
            }
            
            .empty-state p {
                max-width: 400px;
                margin: 0 auto;
                margin-bottom: 20px;
            }
            
            /* Responsive adjustments */
            @media (max-width: 768px) {
                .add-book-form,
                .book-item {
                    grid-template-columns: 1fr;
                }
                
                .pdf-content {
                    width: 95%;
                    height: 90%;
                    margin: 5% auto;
                }
                
                .manage-books-content {
                    width: 95%;
                    height: 90%;
                    margin: 5% auto;
                }
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        const styleElement = document.createElement('style');
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
    };

    const createToastNotification = () => {
        toastNotification = createElementWithClass('div', 'toast-notification');
        document.body.appendChild(toastNotification);

        return {
            show: (message, type = 'info', duration = 3000) => {
                // Set the message and icon based on type
                let icon = '';
                switch (type) {
                    case 'success':
                        icon = '<i class="fas fa-check-circle"></i>';
                        break;
                    case 'error':
                        icon = '<i class="fas fa-exclamation-circle"></i>';
                        break;
                    case 'info':
                    default:
                        icon = '<i class="fas fa-info-circle"></i>';
                        break;
                }

                toastNotification.innerHTML = `${icon}<span>${message}</span>`;
                toastNotification.className = `toast-notification ${type}`;

                // Add show class to trigger animation
                setTimeout(() => {
                    toastNotification.classList.add('show');
                }, 10);

                // Hide after duration
                setTimeout(() => {
                    toastNotification.classList.remove('show');
                }, duration);
            }
        };
    };

    const createPdfModal = () => {
        pdfModal = createElementWithClass('div', 'pdf-modal');
        pdfModal.innerHTML = `
            <div class="pdf-content">
                <div class="pdf-header">
                    <h3><i class="fas fa-book-open"></i> <span class="pdf-title">Reading Book</span></h3>
                    <button class="pdf-close-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="pdf-body">
                    <iframe id="pdf-viewer" seamless="seamless" scrolling="no" frameborder="0" allowtransparency="true" allowfullscreen="true"></iframe>
                    <div class="pdf-loading-wrapper">
                        <div class="pdf-loading-spinner"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(pdfModal);
        return pdfModal;
    };

    const createManageBooksModal = () => {
        manageBooksModal = createElementWithClass('div', 'manage-books-modal');
        manageBooksModal.innerHTML = `
            <div class="manage-books-content">
                <div class="manage-books-header">
                    <h3><i class="fas fa-book"></i> Manage Book Links</h3>
                    <button class="manage-books-close-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="manage-books-body">
                    <div class="add-book-form">
                        <h4><i class="fas fa-plus-circle"></i> Add New Book</h4>
                        <input type="text" id="new-book-key" placeholder="Book Key (e.g., A0A2)" required>
                        <input type="text" id="new-book-title" placeholder="Book Title" required>
                        <input type="url" id="new-book-url" placeholder="Book URL" required>
                        <button id="add-book-btn"><i class="fas fa-plus"></i> Add Book</button>
                    </div>
                    <div id="book-list"></div>
                </div>
            </div>
        `;
        document.body.appendChild(manageBooksModal);
        return manageBooksModal;
    };

    const loadBooks = async () => {
        try {
            // Ensure the .book-links container exists
            let bookLinksContainer = document.querySelector('.book-links');
            if (!bookLinksContainer) {
                console.warn('.book-links container not found, retrying...');
                await new Promise(resolve => setTimeout(resolve, 100)); // Wait briefly and retry
                bookLinksContainer = document.querySelector('.book-links');
                if (!bookLinksContainer) {
                    console.error('.book-links container is missing');
                    return;
                }
            }

            // Ensure the #manage-books button exists
            let manageBooksBtn = bookLinksContainer.querySelector('#manage-books');
            if (!manageBooksBtn) {
                console.warn('#manage-books button not found, creating one...');
                manageBooksBtn = document.createElement('button');
                manageBooksBtn.id = 'manage-books';
                manageBooksBtn.innerHTML = '<i class="fas fa-cog"></i> Manage Books';
                bookLinksContainer.appendChild(manageBooksBtn);
            }

            // Create a container for book links to avoid overwriting #manage-books
            let bookLinksList = bookLinksContainer.querySelector('.book-links-list');
            if (!bookLinksList) {
                bookLinksList = document.createElement('div');
                bookLinksList.className = 'book-links-list';
                bookLinksContainer.insertBefore(bookLinksList, manageBooksBtn);
            }

            // Show a loading state
            bookLinksList.innerHTML = '<span class="book-links-loading"><i class="fas fa-spinner"></i> Loading books...</span>';

            const response = await fetch('/editor/books', {
                headers: { 'Cache-Control': 'no-cache' } // Avoid stale cache
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const books = await response.json();

            // Clear loading state and existing book links
            bookLinksList.innerHTML = '';
            bookLinksList.querySelectorAll('.book-link').forEach(link => link.remove());

            // Add book links with icons
            if (books.length === 0) {
                bookLinksList.innerHTML = '<span class="book-links-info"><i class="fas fa-info-circle"></i> No books available. Add some books using the manage button.</span>';
            } else {
                books.forEach(book => {
                    const link = document.createElement('a');
                    link.href = '#';
                    link.className = 'book-link';
                    link.setAttribute('data-book-key', book.key);
                    link.setAttribute('title', book.title);
                    link.innerHTML = `<i class="fas fa-book"></i> ${book.title}`;
                    bookLinksList.appendChild(link);
                });
            }

            setupBookLinkListeners();
            return books;
        } catch (error) {
            console.error('Error loading books:', error);
            const bookLinksList = document.querySelector('.book-links-list');
            if (bookLinksList) {
                bookLinksList.innerHTML = '<span class="book-links-error"><i class="fas fa-exclamation-triangle"></i> Error loading books. Please try again.</span>';
            }
            return [];
        }
    };

    const setupBookLinkListeners = () => {
        const bookLinks = document.querySelectorAll('.book-link');
        const pdfViewer = pdfModal.querySelector('#pdf-viewer');
        const loadingWrapper = pdfModal.querySelector('.pdf-loading-wrapper');
        const pdfTitle = pdfModal.querySelector('.pdf-title');

        bookLinks.forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                const bookKey = link.getAttribute('data-book-key');
                const bookTitle = link.getAttribute('title');

                // Open the modal first with animation
                pdfModal.style.display = 'block';
                setTimeout(() => {
                    pdfModal.classList.add('active');
                }, 10);

                try {
                    // Update the title
                    pdfTitle.textContent = bookTitle || 'Reading Book';

                    // Show loading spinner
                    loadingWrapper.style.display = 'flex';

                    const response = await fetch('/editor/books');
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const books = await response.json();
                    const book = books.find(b => b.key === bookKey);

                    if (book && book.url) {
                        pdfViewer.src = book.url;
                    } else {
                        throw new Error(`Book URL not found for key: ${bookKey}`);
                    }
                } catch (error) {
                    console.error('Error fetching book URL:', error);
                    toast.show('Error loading book', 'error');
                    loadingWrapper.style.display = 'none';
                }
            });
        });
    };

    const setupManageBooksModal = () => {
        const closeBtn = manageBooksModal.querySelector('.manage-books-close-btn');
        const addBookBtn = manageBooksModal.querySelector('#add-book-btn');
        const bookList = manageBooksModal.querySelector('#book-list');
        const toast = createToastNotification();

        const renderBookList = async () => {
            try {
                const books = await loadBooks();
                bookList.innerHTML = '';

                if (books.length === 0) {
                    bookList.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-books"></i>
                            <h3>No Books Yet</h3>
                            <p>Start adding your books using the form above. They will appear here for easy management.</p>
                        </div>
                    `;
                    return;
                }

                books.forEach((book, index) => {
                    const bookItem = document.createElement('div');
                    bookItem.className = 'book-item';
                    bookItem.innerHTML = `
                        <input type="text" value="${book.key}" data-index="${index}" class="book-key" placeholder="Book Key">
                        <input type="text" value="${book.title}" data-index="${index}" class="book-title" placeholder="Book Title">
                        <input type="url" value="${book.url}" data-index="${index}" class="book-url" placeholder="Book URL">
                        <button class="edit-book-btn" data-index="${index}" title="Save Changes"><i class="fas fa-save"></i></button>
                        <button class="delete-book-btn" data-index="${index}" title="Delete Book"><i class="fas fa-trash"></i></button>
                    `;
                    bookList.appendChild(bookItem);
                });

                // Add event listeners for delete buttons
                bookList.querySelectorAll('.delete-book-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const index = btn.getAttribute('data-index');
                        try {
                            const response = await fetch('/editor/books');
                            let books = await response.json();
                            const deletedBook = books[index];
                            books.splice(index, 1);
                            const saveResponse = await fetch('/editor/save_books', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ books })
                            });
                            if (!saveResponse.ok) {
                                throw new Error(`HTTP error! status: ${saveResponse.status}`);
                            }
                            renderBookList();
                            toast.show(`"${deletedBook.title}" has been deleted`, 'info');
                        } catch (error) {
                            console.error('Error deleting book:', error);
                            toast.show('Error deleting book', 'error');
                        }
                    });
                });

                // Add event listeners for edit buttons
                bookList.querySelectorAll('.edit-book-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const index = btn.getAttribute('data-index');
                        const keyInput = bookList.querySelector(`.book-key[data-index="${index}"]`);
                        const titleInput = bookList.querySelector(`.book-title[data-index="${index}"]`);
                        const urlInput = bookList.querySelector(`.book-url[data-index="${index}"]`);

                        // Validate inputs
                        if (!keyInput.value.trim() || !titleInput.value.trim() || !urlInput.value.trim()) {
                            toast.show('All fields are required', 'error');
                            return;
                        }

                        try {
                            const response = await fetch('/editor/books');
                            let books = await response.json();
                            books[index] = {
                                key: keyInput.value.trim(),
                                title: titleInput.value.trim(),
                                url: urlInput.value.trim()
                            };
                            const saveResponse = await fetch('/editor/save_books', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ books })
                            });
                            if (!saveResponse.ok) {
                                throw new Error(`HTTP error! status: ${saveResponse.status}`);
                            }

                            // Highlight the updated book item
                            const bookItem = btn.closest('.book-item');
                            bookItem.style.backgroundColor = '#e8f7f0';
                            setTimeout(() => {
                                bookItem.style.backgroundColor = '';
                            }, 1000);

                            loadBooks();
                            toast.show(`"${titleInput.value}" has been updated`, 'success');
                        } catch (error) {
                            console.error('Error updating book:', error);
                            toast.show('Error updating book', 'error');
                        }
                    });
                });
            } catch (error) {
                console.error('Error rendering book list:', error);
                toast.show('Error loading book management list', 'error');
            }
        };

        addBookBtn.addEventListener('click', async () => {
            const keyInput = manageBooksModal.querySelector('#new-book-key');
            const titleInput = manageBooksModal.querySelector('#new-book-title');
            const urlInput = manageBooksModal.querySelector('#new-book-url');
            const key = keyInput.value.trim();
            const title = titleInput.value.trim();
            const url = urlInput.value.trim();

            if (key && title && url) {
                try {
                    const response = await fetch('/editor/books');
                    let books = await response.json();

                    // Check if key already exists
                    if (books.some(book => book.key === key)) {
                        toast.show('A book with this key already exists', 'error');
                        return;
                    }

                    books.push({ key, title, url });
                    const saveResponse = await fetch('/editor/save_books', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ books })
                    });
                    if (!saveResponse.ok) {
                        throw new Error(`HTTP error! status: ${saveResponse.status}`);
                    }
                    keyInput.value = '';
                    titleInput.value = '';
                    urlInput.value = '';
                    renderBookList();
                    toast.show(`"${title}" has been added`, 'success');
                } catch (error) {
                    console.error('Error adding book:', error);
                    toast.show('Error adding book', 'error');
                }
            } else {
                toast.show('Please fill in all fields', 'error');
            }
        });

        closeBtn.addEventListener('click', () => {
            manageBooksModal.classList.remove('active');
            setTimeout(() => {
                manageBooksModal.style.display = 'none';
            }, 300);
        });

        manageBooksModal.addEventListener('click', (event) => {
            if (event.target === manageBooksModal) {
                manageBooksModal.classList.remove('active');
                setTimeout(() => {
                    manageBooksModal.style.display = 'none';
                }, 300);
            }
        });

        renderBookList();
    };

    const setupEventListeners = () => {
        const closeBtn = pdfModal.querySelector('.pdf-close-btn');
        const pdfViewer = pdfModal.querySelector('#pdf-viewer');
        const loadingWrapper = pdfModal.querySelector('.pdf-loading-wrapper');
        const toast = createToastNotification();

        closeBtn.addEventListener('click', () => {
            pdfModal.classList.remove('active');
            setTimeout(() => {
                pdfModal.style.display = 'none';
                pdfViewer.src = '';
            }, 300);
        });

        pdfViewer.addEventListener('load', () => {
            loadingWrapper.style.display = 'none';
        });

        pdfViewer.addEventListener('error', () => {
            loadingWrapper.style.display = 'none';
            toast.show('Failed to load PDF. Please check the URL.', 'error');
        });

        pdfModal.addEventListener('click', (event) => {
            if (event.target === pdfModal) {
                pdfModal.classList.remove('active');
                setTimeout(() => {
                    pdfModal.style.display = 'none';
                    pdfViewer.src = '';
                }, 300);
            }
        });

        const manageBooksBtn = document.querySelector('#manage-books');
        if (manageBooksBtn) {
            manageBooksBtn.addEventListener('click', () => {
                manageBooksModal.style.display = 'block';
                setTimeout(() => {
                    manageBooksModal.classList.add('active');
                }, 10);
                setupManageBooksModal();
            });
        }
    };

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (pdfModal && pdfModal.style.display === 'block') {
                pdfModal.classList.remove('active');
                setTimeout(() => {
                    pdfModal.style.display = 'none';
                    const pdfViewer = pdfModal.querySelector('#pdf-viewer');
                    if (pdfViewer) pdfViewer.src = '';
                }, 300);
            }
            if (manageBooksModal && manageBooksModal.style.display === 'block') {
                manageBooksModal.classList.remove('active');
                setTimeout(() => {
                    manageBooksModal.style.display = 'none';
                }, 300);
            }
        }
    });

    const init = async () => {
        injectStyles();
        pdfModal = createPdfModal();
        manageBooksModal = createManageBooksModal();
        const toast = createToastNotification();
        setupEventListeners();
        await loadBooks(); // Ensure loadBooks is awaited
    };

    // Wait for DOM to be fully ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
});