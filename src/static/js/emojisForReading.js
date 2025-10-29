document.addEventListener('DOMContentLoaded', () => {
    // Add CSS dynamically
    const style = document.createElement('style');
    style.textContent = `
        .menu-item {
            position: relative;
            display: inline-block;
        }
        .emoji-selector {
            padding: 8px 30px 8px 12px;
            font-size: 16px;
            background-color: var(--button-bg, #ffffff);
            color: var(--button-text, #333333);
            border: 1px solid var(--menu-border, #e0e0e0);
            border-radius: 6px;
            cursor: pointer;
            appearance: none;
            -webkit-appearance: none;
            -moz-appearance: none;
            background-image: url("data:image/svg+xml;utf8,<svg fill='currentColor' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'><path d='M7 7l3-3 3 3m0 6l-3 3-3-3'></path></svg>");
            background-repeat: no-repeat;
            background-position: right 10px center;
            background-size: 14px;
            min-width: 60px;
            transition: all 0.2s ease;
        }
        .emoji-selector:hover {
            background-color: var(--button-hover-bg, #f5f5f5);
            border-color: var(--switch-active, #007bff);
        }
        .emoji-selector:focus {
            outline: none;
            border-color: var(--switch-active, #007bff);
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.2);
        }
        .ripple {
            position: absolute;
            border-radius: 50%;
            background: rgba(0, 123, 255, 0.3);
            transform: scale(0);
            animation: ripple 0.5s ease-out;
            pointer-events: none;
        }
        @keyframes ripple {
            to {
                transform: scale(3);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    const emojiSelector = document.querySelector('.emoji-selector');

    if (emojiSelector) {
        // Handle emoji selection (for onchange in HTML)
        window.handleEmojiSelect = (emoji) => {
            insertEmoji(emoji);
        };

        // Ripple effect on click
        emojiSelector.addEventListener('click', (e) => {
            createRipple(e, emojiSelector);
        });

        // Accessibility: handle keyboard navigation
        emojiSelector.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                emojiSelector.click();
            }
        });
    }
});

function insertEmoji(emoji) {
    const editor = document.getElementById('markdown-editor');
    const preview = document.getElementById('markdown-preview');

    if (!editor || !preview) {
        console.warn('Editor or preview element not found');
        return;
    }

    const isPreviewMode = preview.style.display !== 'none';

    if (!isPreviewMode) {
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const text = editor.value;
        const before = text.substring(0, start);
        const after = text.substring(end);

        editor.value = before + emoji + after;
        editor.selectionStart = editor.selectionEnd = start + emoji.length;
        editor.focus();
        updatePreview();
    }
}

function updatePreview() {
    const preview = document.getElementById('markdown-preview');
    const editor = document.getElementById('markdown-editor');

    if (!preview || !editor) {
        console.warn('Preview or editor element not found');
        return;
    }

    try {
        const html = marked.parse(editor.value);
        preview.innerHTML = html;
    } catch (error) {
        console.error('Error parsing markdown:', error);
        preview.innerHTML = '<p>Error rendering preview</p>';
    }
}

function createRipple(event, element) {
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');
    element.appendChild(ripple);

    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    setTimeout(() => ripple.remove(), 500);
}