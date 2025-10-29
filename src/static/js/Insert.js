document.addEventListener("DOMContentLoaded", function() {
    const menuInsert = document.getElementById('menu-insert');
    const markdownEditorElement = document.getElementById('markdown-editor');
    const togglePreviewCheckbox = document.querySelector('#menu-toggle-preview input[type="checkbox"]');
    let isUploading = false; // Flag to prevent multiple simultaneous uploads

    if (!menuInsert || !markdownEditorElement) {
        console.error('Required elements not found:', {
            menuInsert: !!menuInsert,
            markdownEditor: !!markdownEditorElement
        });
        return;
    }

    // Function to trigger file input click
    window.triggerImageUpload = function() {
        if (isUploading) {
            console.log('Upload already in progress, ignoring triggerImageUpload');
            return;
        }
        console.log('triggerImageUpload called');
        isUploading = true;
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';

        fileInput.addEventListener('change', (event) => {
            console.log('File selected via triggerImageUpload:', event.target.files[0]?.name);
            handleFileSelect(event);
            document.body.removeChild(fileInput);
            isUploading = false; // Reset flag after upload
        });

        // Handle case where user cancels file selection
        fileInput.addEventListener('cancel', () => {
            console.log('File selection cancelled');
            document.body.removeChild(fileInput);
            isUploading = false;
        });

        document.body.appendChild(fileInput);
        fileInput.click();
    };

    // Handle file selection from menu (bind only once)
    menuInsert.addEventListener('click', () => {
        console.log('Insert menu clicked');
        window.triggerImageUpload();
    }, { once: true }); // Ensure single binding

    // Handle drag and drop
    markdownEditorElement.addEventListener('drop', (event) => {
        event.preventDefault();
        if (isUploading) {
            console.log('Upload already in progress, ignoring drop');
            return;
        }
        const files = event.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            console.log('File dropped:', files[0].name);
            isUploading = true;
            uploadImage(files[0], () => { isUploading = false; });
        }
    });

    // Handle paste
    markdownEditorElement.addEventListener('paste', (event) => {
        if (isUploading) {
            console.log('Upload already in progress, ignoring paste');
            return;
        }
        const items = (event.clipboardData || window.clipboardData).items;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                console.log('Image pasted:', file.name);
                isUploading = true;
                uploadImage(file, () => { isUploading = false; });
            }
        }
    });

    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            uploadImage(file, () => { isUploading = false; });
        } else {
            isUploading = false; // Reset if no file selected
        }
    }

    function uploadImage(file, callback) {
        console.log('Uploading file:', file.name, file.size, file.type);
        const formData = new FormData();
        formData.append('image', file);

        fetch('/files/upload_image', {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
        })
            .then(response => {
                console.log('Response status:', response.status);
                if (!response.ok) {
                    throw new Error(`Upload failed with status ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Server response:', data);
                if (data.success) {
                    insertImageIntoEditor(data.url, file.name);
                } else {
                    alert('Image upload failed: ' + data.error);
                }
                if (callback) callback();
            })
            .catch(error => {
                console.error('Error uploading image:', error);
                alert('Error uploading image.');
                if (callback) callback();
            });
    }

    function insertImageIntoEditor(url, filename) {
        console.log('Inserting image with URL:', url);
        const markdownImageSyntax = `![${filename}](${url})\n`;
        console.log('Generated markdown:', markdownImageSyntax);
        const cursorPosition = markdownEditorElement.selectionStart || markdownEditorElement.value.length;
        const textBeforeCursor = markdownEditorElement.value.substring(0, cursorPosition);
        const textAfterCursor = markdownEditorElement.value.substring(cursorPosition);
        markdownEditorElement.value = textBeforeCursor + markdownImageSyntax + textAfterCursor;

        // Trigger preview update if in preview mode
        if (window.mdEditor && window.mdEditor.updatePreview && togglePreviewCheckbox?.checked) {
            console.log('Updating preview with markdown:', markdownEditorElement.value);
            window.mdEditor.updatePreview();
        }
    }
});