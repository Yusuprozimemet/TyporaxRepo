// pronounce.js - Dutch word pronunciation for TyporaX
// This script adds pronunciation functionality to the preview mode

/**
 * Initialize the pronunciation feature when the document is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're in preview mode and initialize if needed
    const previewToggle = document.querySelector('#menu-toggle-preview input[type="checkbox"]');
    
    if (previewToggle) {
        previewToggle.addEventListener('change', function() {
            if (this.checked) {
                // Preview mode is active, initialize pronunciation
                initializePronunciation();
            }
        });
        
        // Also check initial state in case preview is on by default
        if (previewToggle.checked) {
            initializePronunciation();
        }
    }
});

/**
 * Initialize the pronunciation functionality
 */
function initializePronunciation() {
    const previewElement = document.getElementById('markdown-preview');
    if (!previewElement) return;
    
    // Add pronunciation indicator styles
    addPronunciationStyles();
    
    // Create the pronunciation status indicator
    createPronunciationIndicator();
    
    // Add click event listener to the preview area
    previewElement.addEventListener('click', handleWordClick);
}

/**
 * Handle clicks on words in the preview area
 * @param {Event} event - The click event
 */
function handleWordClick(event) {
    // Only process if target is a text node or contains text
    if (event.target.nodeType === Node.TEXT_NODE || 
        (event.target.childNodes.length > 0 && !event.target.classList.contains('pronounce-indicator'))) {
        
        // Get the word at the clicked position
        const word = getClickedWord(event);
        
        if (word && word.trim().length > 0) {
            pronounceWord(word);
        }
    }
}

/**
 * Get the word at the clicked position
 * @param {Event} event - The click event
 * @returns {string} The clicked word
 */
function getClickedWord(event) {
    let word = '';
    
    // Check if we clicked directly on text or on an element containing text
    let node = event.target;
    let range, textNode, offset;
    
    if (document.caretPositionFromPoint) {
        // Firefox
        const position = document.caretPositionFromPoint(event.clientX, event.clientY);
        if (position) {
            textNode = position.offsetNode;
            offset = position.offset;
        }
    } else if (document.caretRangeFromPoint) {
        // Chrome
        range = document.caretRangeFromPoint(event.clientX, event.clientY);
        if (range) {
            textNode = range.startContainer;
            offset = range.startOffset;
        }
    }
    
    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        const text = textNode.textContent;
        
        // Find word boundaries
        let startPos = offset;
        let endPos = offset;
        
        // Find start of word
        while (startPos > 0 && /\w/.test(text.charAt(startPos - 1))) {
            startPos--;
        }
        
        // Find end of word
        while (endPos < text.length && /\w/.test(text.charAt(endPos))) {
            endPos++;
        }
        
        // Extract the word
        if (endPos > startPos) {
            word = text.substring(startPos, endPos);
        }
    }
    
    return word;
}

/**
 * Fetch and cache user's language preference
 * @returns {Promise<string>} The BCP 47 language code (e.g., 'nl-NL')
 */
async function getLanguagePreference() {
    if (getLanguagePreference.cached) {
        console.log('Returning cached language:', getLanguagePreference.cached);
        return getLanguagePreference.cached;
    }
    try {
        const response = await fetch('/profile/get_profile', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error('Failed to fetch profile');
        }
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }
        const languageMap = {
            'dutch': 'nl-NL',
            'english': 'en-US',
            'italian': 'it-IT',
            'french': 'fr-FR',
            'german': 'de-DE',
            'chinese': 'zh-CN',
            'spanish': 'es-ES',
            'arabic': 'ar-SA',
            'turkish': 'tr-TR',
            'polish': 'pl-PL'
        };
        const langCode = languageMap[data.language_preference] || 'nl-NL';
        console.log('Fetched language preference:', data.language_preference, 'Mapped to:', langCode);
        getLanguagePreference.cached = langCode;
        return langCode;
    } catch (error) {
        console.error('Error fetching language preference:', error);
        getLanguagePreference.cached = 'nl-NL';
        return 'nl-NL';
    }
}

/**
 * Pronounce a word using the Speech Synthesis API
 * @param {string} word - The word to pronounce
 */
async function pronounceWord(word) {
    // Check if browser supports speech synthesis
    if (!('speechSynthesis' in window)) {
        showMessage('Speech synthesis not supported in this browser');
        return;
    }

    // Get the user's language preference
    const lang = await getLanguagePreference();

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(word);

    // Set language to user's preference
    utterance.lang = lang;

    // Adjust rate slightly for better pronunciation
    utterance.rate = 0.9;

    // Set up event handlers
    utterance.onstart = () => {
        updatePronunciationIndicator(true, word);
    };

    utterance.onend = () => {
        updatePronunciationIndicator(false);
    };

    utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        updatePronunciationIndicator(false);
        showMessage('Error pronouncing word');
    };

    // Speak the word
    window.speechSynthesis.speak(utterance);
}

/**
 * Add CSS styles for pronunciation features
 */
function addPronunciationStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .pronounce-indicator {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            z-index: 1000;
            display: none;
            align-items: center;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            font-family: 'Poppins', sans-serif;
        }
        
        .pronounce-indicator.active {
            display: flex;
        }
        
        .pronounce-indicator i {
            margin-right: 8px;
            color: #4caf50;
        }
        
        .click-instructions {
            position: fixed;
            top: 70px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
            font-family: 'Poppins', sans-serif;
        }
        
        .preview-active .click-instructions {
            opacity: 1;
            animation: fadeInOut 3s forwards;
        }
        
        @keyframes fadeInOut {
            0% { opacity: 0; }
            20% { opacity: 1; }
            80% { opacity: 1; }
            100% { opacity: 0; }
        }
    `;
    document.head.appendChild(styleElement);
}

/**
 * Create the pronunciation status indicator
 */
function createPronunciationIndicator() {
    // Create the pronunciation indicator if it doesn't exist
    if (!document.querySelector('.pronounce-indicator')) {
        const indicator = document.createElement('div');
        indicator.className = 'pronounce-indicator';
        indicator.innerHTML = '<i class="fas fa-volume-up"></i> <span class="pronounce-text">Pronouncing...</span>';
        document.body.appendChild(indicator);
    }
    
    // Create instructions element
    if (!document.querySelector('.click-instructions')) {
        const instructions = document.createElement('div');
        instructions.className = 'click-instructions';
        instructions.textContent = 'Click on any Dutch word to hear pronunciation';
        document.body.appendChild(instructions);
        
        // Add class to body when preview is active
        const togglePreview = document.querySelector('#menu-toggle-preview input');
        if (togglePreview) {
            togglePreview.addEventListener('change', function() {
                if (this.checked) {
                    document.body.classList.add('preview-active');
                    // Reset animation by removing and re-adding the element
                    const oldInstructions = document.querySelector('.click-instructions');
                    if (oldInstructions) {
                        const newInstructions = oldInstructions.cloneNode(true);
                        oldInstructions.parentNode.replaceChild(newInstructions, oldInstructions);
                    }
                } else {
                    document.body.classList.remove('preview-active');
                }
            });
        }
    }
}

/**
 * Update the pronunciation indicator status
 * @param {boolean} isActive - Whether pronunciation is active
 * @param {string} word - The word being pronounced
 */
function updatePronunciationIndicator(isActive, word = '') {
    const indicator = document.querySelector('.pronounce-indicator');
    if (!indicator) return;
    
    if (isActive) {
        indicator.classList.add('active');
        indicator.querySelector('.pronounce-text').textContent = `Pronouncing: ${word}`;
    } else {
        indicator.classList.remove('active');
    }
}

/**
 * Show a temporary message to the user
 * @param {string} message - The message to show
 */
function showMessage(message) {
    // Create or update a message element
    let messageElement = document.querySelector('.pronounce-message');
    
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.className = 'pronounce-message';
        messageElement.style.cssText = `
            position: fixed;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 1000;
            transition: opacity 0.3s ease;
            font-family: 'Poppins', sans-serif;
        `;
        document.body.appendChild(messageElement);
    }
    
    messageElement.textContent = message;
    messageElement.style.opacity = '1';
    
    // Hide the message after 3 seconds
    setTimeout(() => {
        messageElement.style.opacity = '0';
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 300);
    }, 3000);
}