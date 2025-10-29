// Log to confirm script is loaded
console.log('format.js loaded');

// Undo/Redo history
let editorHistory = [];
let historyIndex = -1;

function saveToHistory(textarea) {
    if (historyIndex < editorHistory.length - 1) {
        editorHistory = editorHistory.slice(0, historyIndex + 1); // Truncate future history
    }
    editorHistory.push(textarea.value);
    historyIndex++;
    if (editorHistory.length > 50) { // Limit history to 50 steps
        editorHistory.shift();
        historyIndex--;
    }
}

// Handle dropdown selection
function handleFormattingSelect(value) {
    console.log('handleFormattingSelect called with value:', value);
    const formattingSelector = document.querySelector('.formatting-selector');
    if (formattingSelector) {
        formattingSelector.value = ''; // Reset dropdown to default
    }

    const textarea = document.getElementById('markdown-editor');
    if (!textarea) {
        console.error('Textarea #markdown-editor not found');
        return;
    }

    switch (value) {
        case 'code':
            applyFormatting(textarea, '`', '`', 'Code');
            break;
        case 'bold-italic':
            applyFormatting(textarea, '***', '***', 'Bold & Italic');
            break;
        case 'underline':
            applyFormatting(textarea, '<u>', '</u>', 'Underline');
            break;
        case 'strikethrough':
            applyFormatting(textarea, '~~', '~~', 'Strikethrough');
            break;
        case 'bold':
            applyFormatting(textarea, '**', '**', 'Bold');
            break;
        case 'italic':
            applyFormatting(textarea, '*', '*', 'Italic', (text) => !text.startsWith('**')); // Avoid bold interference
            break;
        case 'left':
            applyAlignment(textarea, 'left');
            break;
        case 'center':
            applyAlignment(textarea, 'center');
            break;
        case 'right':
            applyAlignment(textarea, 'right');
            break;
        default:
            console.log('Unknown formatting option:', value);
    }
}

// Generic function to apply text formatting
function applyFormatting(textarea, prefix, suffix, logLabel, extraCheck = () => true) {
    console.log(`${logLabel} called`);
    saveToHistory(textarea);
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.slice(start, end);

    if (!selectedText) {
        console.log('No text selected');
        return;
    }

    // Toggle formatting
    const isAlreadyFormatted = selectedText.startsWith(prefix) && selectedText.endsWith(suffix) && extraCheck(selectedText);
    let newText;
    if (isAlreadyFormatted) {
        newText = selectedText.slice(prefix.length, -suffix.length); // Remove formatting
    } else {
        newText = `${prefix}${selectedText}${suffix}`; // Add formatting
    }

    // Update textarea value
    textarea.value = textarea.value.slice(0, start) + newText + textarea.value.slice(end);

    // Adjust cursor position
    textarea.selectionStart = start;
    textarea.selectionEnd = start + newText.length;

    // Trigger input event for preview update
    const inputEvent = new Event('input', { bubbles: true });
    textarea.dispatchEvent(inputEvent);
    console.log(`${logLabel} applied:`, newText);
}

// Function to apply alignment to text or images
function applyAlignment(textarea, alignment) {
    console.log(`Apply ${alignment} alignment called`);
    saveToHistory(textarea);
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.slice(start, end);

    if (!selectedText) {
        console.log('No content selected for alignment');
        return;
    }

    let newText;
    const isImage = selectedText.match(/^!\[.*?\]\(.*?\)$/); // Check if selected text is a Markdown image

    if (isImage) {
        // Handle image alignment
        const imgTagRegex = /^<img.*?style=".*?text-align:\s*(left|center|right);?.*?".*?>$/;
        const imgTagMatch = selectedText.match(/^<img.*?>$/);
        if (imgTagMatch && imgTagRegex.test(selectedText)) {
            // Remove existing alignment
            newText = selectedText.replace(/style=".*?"/, '');
        } else {
            // Convert Markdown image to HTML img tag with alignment
            const [, alt, src] = selectedText.match(/^!\[(.*?)\]\((.*?)\)$/);
            let style;
            if (alignment === 'center') {
                style = 'display: block; margin: 0 auto;';
            } else if (alignment === 'left') {
                style = 'float: left; margin-right: 10px;';
            } else {
                style = 'float: right; margin-left: 10px;';
            }
            newText = `<img src="${src}" alt="${alt}" style="${style}">`;
        }
    } else {
        // Handle text alignment
        const divRegex = new RegExp(`^<div style="text-align:\\s*${alignment};?">([\\s\\S]*?)</div>$`);
        const otherDivRegex = /^<div style="text-align:\s*(left|center|right);?">([\s\S]*?)<\/div>$/;
        if (divRegex.test(selectedText)) {
            // Remove existing alignment
            newText = selectedText.replace(divRegex, '$1');
        } else if (otherDivRegex.test(selectedText)) {
            // Replace other alignment with new alignment
            newText = `<div style="text-align: ${alignment};">${selectedText.replace(otherDivRegex, '$2')}</div>`;
        } else {
            // Apply new alignment
            newText = `<div style="text-align: ${alignment};">${selectedText}</div>`;
        }
    }

    // Update textarea value
    textarea.value = textarea.value.slice(0, start) + newText + textarea.value.slice(end);

    // Adjust cursor position
    textarea.selectionStart = start;
    textarea.selectionEnd = start + newText.length;

    // Trigger input event for preview update
    const inputEvent = new Event('input', { bubbles: true });
    textarea.dispatchEvent(inputEvent);
    console.log(`${alignment} alignment applied:`, newText);
}

// Handle drag-and-drop: Insert text or trigger image upload
function handleDrop(event) {
    console.log('handleDrop called');
    event.preventDefault();
    event.stopPropagation();

    const textarea = document.getElementById('markdown-editor');
    if (!textarea) {
        console.error('Textarea #markdown-editor not found');
        return;
    }

    saveToHistory(textarea);
    const dataTransfer = event.dataTransfer;

    // Handle dropped text
    if (dataTransfer.types.includes('text/plain')) {
        const text = dataTransfer.getData('text/plain');
        if (text) {
            console.log('Dropped text:', text);
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
            textarea.selectionStart = textarea.selectionEnd = start + text.length;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // Handle dropped images
    if (dataTransfer.files.length > 0) {
        const file = dataTransfer.files[0];
        console.log('Dropped file:', file.name, file.type);
        if (file.type.startsWith('image/')) {
            const imageUploadInput = document.getElementById('image-upload');
            if (imageUploadInput) {
                console.log('Triggering image-upload input');
                const dt = new DataTransfer();
                dt.items.add(file);
                imageUploadInput.files = dt.files;
                imageUploadInput.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                console.log('No image-upload input; using fallback');
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const imageTag = `![${file.name}](/Uploads/${file.name})`;
                textarea.value = textarea.value.slice(0, start) + imageTag + textarea.value.slice(end);
                textarea.selectionStart = textarea.selectionEnd = start + imageTag.length;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
            }
        } else {
            console.log('Non-image file dropped');
            alert('Only image files are supported.');
        }
    }
}

// Initialize history on textarea input
document.addEventListener('DOMContentLoaded', function () {
    const textarea = document.getElementById('markdown-editor');
    if (textarea) {
        textarea.addEventListener('input', function () {
            saveToHistory(textarea);
        });
        saveToHistory(textarea); // Save initial state
    }
});