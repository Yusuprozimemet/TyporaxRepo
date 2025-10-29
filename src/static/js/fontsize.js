// Log to confirm script is loaded
console.log('fontsize.js loaded');

// Undo/Redo history for text changes
let fontHistory = [];
let fontHistoryIndex = -1;

// Save current textarea content to history
function saveFontToHistory(textarea) {
    if (fontHistoryIndex < fontHistory.length - 1) {
        fontHistory = fontHistory.slice(0, fontHistoryIndex + 1); // Truncate future history
    }
    fontHistory.push(textarea.value);
    fontHistoryIndex++;
    if (fontHistory.length > 50) { // Limit history to 50 steps
        fontHistory.shift();
        fontHistoryIndex--;
    }
    console.log('Text state saved:', textarea.value.slice(0, 50) + '...');
}

// Change font size for selected text
function changeFontSize(value) {
    console.log('changeFontSize called with value:', value);
    const textarea = document.getElementById('markdown-editor');
    if (!textarea) {
        console.error('Textarea #markdown-editor not found');
        return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.slice(start, end);

    if (!selectedText) {
        console.log('No text selected');
        alert('Please select text to apply font size.');
        return;
    }

    // Save current state before applying changes
    saveFontToHistory(textarea);

    // Wrap selected text with <span> for font size
    const newText = `<span style="font-size: ${value}px">${selectedText}</span>`;
    console.log(`Applying font size ${value}px to:`, selectedText);

    // Update textarea value
    textarea.value = textarea.value.slice(0, start) + newText + textarea.value.slice(end);

    // Adjust cursor position
    textarea.selectionStart = start;
    textarea.selectionEnd = start + newText.length;

    // Trigger input event for preview update
    const inputEvent = new Event('input', { bubbles: true });
    textarea.dispatchEvent(inputEvent);
    console.log('Font size applied:', newText);
}

// Change font style for selected text
function changeFontStyle(value) {
    console.log('changeFontStyle called with value:', value);
    const textarea = document.getElementById('markdown-editor');
    if (!textarea) {
        console.error('Textarea #markdown-editor not found');
        return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.slice(start, end);

    if (!selectedText) {
        console.log('No text selected');
        alert('Please select text to apply font style.');
        return;
    }

    // Save current state before applying changes
    saveFontToHistory(textarea);

    // Wrap selected text with <span> for font family
    const newText = `<span style="font-family: ${value}">${selectedText}</span>`;
    console.log(`Applying font style ${value} to:`, selectedText);

    // Update textarea value
    textarea.value = textarea.value.slice(0, start) + newText + textarea.value.slice(end);

    // Adjust cursor position
    textarea.selectionStart = start;
    textarea.selectionEnd = start + newText.length;

    // Trigger input event for preview update
    const inputEvent = new Event('input', { bubbles: true });
    textarea.dispatchEvent(inputEvent);
    console.log('Font style applied:', newText);
}

// Undo text changes
function undoFontChange() {
    if (fontHistoryIndex <= 0) {
        console.log('No more changes to undo');
        return;
    }

    fontHistoryIndex--;
    const textarea = document.getElementById('markdown-editor');
    if (!textarea) {
        console.error('Textarea #markdown-editor not found');
        return;
    }

    textarea.value = fontHistory[fontHistoryIndex];
    console.log('Text state restored:', textarea.value.slice(0, 50) + '...');

    // Trigger input event for preview update
    const inputEvent = new Event('input', { bubbles: true });
    textarea.dispatchEvent(inputEvent);
}

// Redo text changes
function redoFontChange() {
    if (fontHistoryIndex >= fontHistory.length - 1) {
        console.log('No more changes to redo');
        return;
    }

    fontHistoryIndex++;
    const textarea = document.getElementById('markdown-editor');
    if (!textarea) {
        console.error('Textarea #markdown-editor not found');
        return;
    }

    textarea.value = fontHistory[fontHistoryIndex];
    console.log('Text state redone:', textarea.value.slice(0, 50) + '...');

    // Trigger input event for preview update
    const inputEvent = new Event('input', { bubbles: true });
    textarea.dispatchEvent(inputEvent);
}

// Initialize history on textarea input
document.addEventListener('DOMContentLoaded', function () {
    const textarea = document.getElementById('markdown-editor');
    if (textarea) {
        textarea.addEventListener('input', function () {
            saveFontToHistory(textarea);
        });
        saveFontToHistory(textarea); // Save initial state
        console.log('Initial text state saved');
    } else {
        console.error('Textarea #markdown-editor not found during initialization');
    }
});