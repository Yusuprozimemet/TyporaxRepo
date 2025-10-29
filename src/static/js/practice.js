let wordbank = [];
let typoWords = []; // Store typo words for personalized practice
let currentWordIndex = 0;
let practiceActive = false;
let practiceContainer = null;
let lastCompletedIndex = 0; // Track last completed index for resuming
let isPersonalizedMode = false; // Track whether personalized mode is active
let originalWordbank = []; // Store original wordbank for switching back
let savedTypos = new Set(); // Track saved typos in the session

/**
 * Start the vocabulary practice session
 */
function startPractice() {
    if (practiceActive) {
        closePracticeMode();
        return;
    }

    // Fetch the wordbank data
    fetchWordbank()
        .then(words => {
            if (words && words.length > 0) {
                originalWordbank = words; // Store original wordbank
                wordbank = [...originalWordbank]; // Use a copy for practice
                // Start from the last completed index if available
                currentWordIndex = lastCompletedIndex;
                setupPracticeMode();
            } else {
                showMessage('No words found in wordbank');
            }
        })
        .catch(error => {
            console.error('Error fetching wordbank:', error);
            showMessage('Failed to load wordbank');
        });
}

/**
 * Fetch the wordbank data from the server
 * @returns {Promise<Array>} Promise resolving to array of word objects
 */
async function fetchWordbank() {
    try {
        const response = await fetch('/wordbank/');
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        return parseWordbank(data.content);
    } catch (error) {
        console.error('Error fetching wordbank:', error);
        throw error;
    }
}

/**
 * Fetch typo words for personalized practice
 * @returns {Promise<Array>} Promise resolving to array of typo word objects
 */
async function fetchTypoWords() {
    try {
        const response = await fetch('/typo/wordbank/get_typos');
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        return data.typos || [];
    } catch (error) {
        console.error('Error fetching typo words:', error);
        showMessage('Failed to load typo words');
        return [];
    }
}

/**
 * Parse the wordbank markdown content into structured data
 * @param {string} content - The markdown content
 * @returns {Array} Array of word objects
 */
function parseWordbank(content) {
    const words = [];
    const lines = content.split('\n');

    lines.forEach(line => {
        // Match lines starting with "- **" (markdown list items with bold text)
        const match = line.match(/- \*\*(.*?)\*\*\s+(🟥|🟨|🟧|🟩|⬜️)\s+\*(.*?)\*/);
        if (match) {
            const dutch = match[1].trim();
            const difficulty = match[2];
            const english = match[3].trim();

            words.push({
                dutch,
                english,
                difficulty
            });
        }
    });

    return words;
}

/**
 * Toggle between normal and personalized practice mode
 */
function togglePersonalizedMode() {
    const personalizedButton = document.querySelector('.practice-personalized');
    isPersonalizedMode = personalizedButton.classList.contains('active');

    if (isPersonalizedMode) {
        // Switch to personalized mode
        fetchTypoWords()
            .then(typos => {
                if (typos && typos.length > 0) {
                    typoWords = typos;
                    wordbank = [...typoWords]; // Use typo words
                    currentWordIndex = 0;
                    lastCompletedIndex = 0;
                    showMessage('Switched to personalized practice');
                    displayCurrentWord();
                    updateProgress();
                } else {
                    showMessage('No typo words available');
                    personalizedButton.classList.remove('active');
                    isPersonalizedMode = false;
                    wordbank = [...originalWordbank]; // Revert to original wordbank
                }
            })
            .catch(error => {
                console.error('Error loading typo words:', error);
                showMessage('Failed to load typo words');
                personalizedButton.classList.remove('active');
                isPersonalizedMode = false;
                wordbank = [...originalWordbank]; // Revert to original wordbank
            });
    } else {
        // Switch back to normal mode
        wordbank = [...originalWordbank]; // Restore original wordbank
        currentWordIndex = lastCompletedIndex;
        showMessage('Switched to normal practice');
        displayCurrentWord();
        updateProgress();
    }
}

/**
 * Set up the practice mode interface
 */
function setupPracticeMode() {
    practiceActive = true;

    // Create practice container if it doesn't exist
    if (!practiceContainer) {
        practiceContainer = document.createElement('div');
        practiceContainer.className = 'practice-container';
        document.body.appendChild(practiceContainer);
    }

    // Add practice styles
    addPracticeStyles();

    // Reset and show the practice container
    practiceContainer.innerHTML = `
        <div class="practice-header">
            <div class="practice-current-word"></div>
            <button class="practice-close" onclick="closePracticeMode()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="practice-content">
            <div class="practice-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
                <div class="progress-text">0/${wordbank.length}</div>
            </div>
            <div class="practice-word-container">
                <div class="practice-hint"></div>
                <div class="practice-translation"></div>
            </div>
            <div class="practice-input-container">
                <input type="text" class="practice-input" placeholder="Type the Dutch word here..." autocomplete="off">
                <button class="practice-pronounce">
                    <i class="fas fa-volume-up"></i>
                </button>
                <button class="practice-reveal">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
            <div class="practice-feedback"></div>
            <div class="practice-controls">
                <button class="practice-skip">
                    <i class="fas fa-fast-forward"></i>
                </button>
                <button class="practice-next">
                    <i class="fas fa-chevron-right"></i>
                </button>
                <button class="practice-personalized">
                    <i class="fas fa-user"></i>
                </button>
            </div>
        </div>
    `;

    practiceContainer.style.display = 'block';

    // Set up event listeners
    setupPracticeEventListeners();

    // Display the first word
    displayCurrentWord();
}

/**
 * Set up event listeners for practice mode
 */
function setupPracticeEventListeners() {
    const input = document.querySelector('.practice-input');
    const nextButton = document.querySelector('.practice-next');
    const skipButton = document.querySelector('.practice-skip');
    const pronounceButton = document.querySelector('.practice-pronounce');
    const revealButton = document.querySelector('.practice-reveal');
    const personalizedButton = document.querySelector('.practice-personalized');

    // Initially disable the next button until answer is correct or revealed
    nextButton.disabled = true;

    // Input event listener to check answers
    input.addEventListener('input', checkAnswer);

    // Enter key to proceed to next word
    input.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            const feedbackElement = document.querySelector('.practice-feedback');
            const isCorrect = feedbackElement.classList.contains('correct');
            const translationVisible = document.querySelector('.practice-translation').style.visibility === 'visible';

            if (isCorrect || translationVisible) {
                // If answer is correct or has been revealed, go to next word
                goToNextWord();
            } else {
                // Otherwise, just check the answer and show feedback
                const userAnswer = input.value.trim();
                if (userAnswer) {
                    showIncorrectFeedback(userAnswer);
                }
            }

            event.preventDefault(); // Prevent form submission if inside a form
        }
    });

    // Next button - only enabled after correct answer or reveal
    nextButton.addEventListener('click', goToNextWord);

    // Skip button - reveals answer
    skipButton.addEventListener('click', revealAnswer);

    // Pronounce button
    pronounceButton.addEventListener('click', () => {
        const currentWord = wordbank[currentWordIndex]?.dutch;
        if (currentWord) {
            pronounceWord(currentWord);
        }
    });

    // Reveal button
    revealButton.addEventListener('click', revealAnswer);

    // Personalized button - toggle personalized mode
    personalizedButton.addEventListener('click', () => {
        personalizedButton.classList.toggle('active');
        togglePersonalizedMode();
    });

    // Add global keyboard listener for when input is disabled
    document.addEventListener('keydown', event => {
        // Only process if practice mode is active
        if (!practiceActive) return;

        if (event.key === 'Enter') {
            const input = document.querySelector('.practice-input');
            const nextButton = document.querySelector('.practice-next');
            // Only handle Enter globally if input is disabled and next button is enabled
            if (input && input.disabled && !nextButton.disabled) {
                goToNextWord();
                event.preventDefault();
            }
        }
    });

    // Focus on input
    input.focus();
}

/**
 * Display the current word in the practice interface
 */
function displayCurrentWord() {
    if (!wordbank.length || currentWordIndex >= wordbank.length) {
        finishPractice();
        return;
    }

    const currentWord = wordbank[currentWordIndex];
    const hintElement = document.querySelector('.practice-hint');
    const wordHeaderElement = document.querySelector('.practice-current-word');
    const translationElement = document.querySelector('.practice-translation');
    const feedbackElement = document.querySelector('.practice-feedback');
    const input = document.querySelector('.practice-input');
    const nextButton = document.querySelector('.practice-next');

    // Update progress
    updateProgress();

    // Clear previous state
    input.value = '';
    input.disabled = false;
    feedbackElement.textContent = '';
    feedbackElement.className = 'practice-feedback';
    translationElement.style.visibility = 'hidden';
    wordHeaderElement.textContent = ''; // Clear header word
    nextButton.disabled = true;

    // Show only hints initially
    hintElement.textContent = `${currentWord.difficulty} Type the Dutch word`;

    // Show translation hint
    translationElement.textContent = currentWord.english;

    // Automatically pronounce the word when displaying a new word
    setTimeout(() => {
        pronounceWord(currentWord.dutch);
    }, 500);

    // Focus on input
    input.focus();
}

/**
 * Check if the user's answer is correct
 */
function checkAnswer() {
    const input = document.querySelector('.practice-input');
    const userAnswer = input.value.trim();
    const correctAnswer = wordbank[currentWordIndex].dutch;
    const feedbackElement = document.querySelector('.practice-feedback');
    const wordHeaderElement = document.querySelector('.practice-current-word');
    const nextButton = document.querySelector('.practice-next');

    // If empty input, clear feedback
    if (!userAnswer) {
        feedbackElement.textContent = '';
        feedbackElement.className = 'practice-feedback';
        return;
    }

    // Check for exact match
    if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
        // Correct answer
        feedbackElement.textContent = 'Correct! ✓';
        feedbackElement.className = 'practice-feedback correct';

        // Show the word in the header
        wordHeaderElement.textContent = correctAnswer;
        wordHeaderElement.classList.add('correct-answer');

        // Disable input and enable next button
        input.disabled = true;
        nextButton.disabled = false;

        // Update last completed index for resuming later
        lastCompletedIndex = currentWordIndex + 1;

        // Pronounce the word after a short delay
        setTimeout(() => {
            pronounceWord(correctAnswer);
        }, 500);

        // Reveal translation
        document.querySelector('.practice-translation').style.visibility = 'visible';
    } else if (userAnswer.length > correctAnswer.length) {
        // Too many characters
        feedbackElement.textContent = 'Too many letters';
        feedbackElement.className = 'practice-feedback incorrect';

        // Add shake animation to feedback
        feedbackElement.classList.add('shake-animation');
        setTimeout(() => {
            feedbackElement.classList.remove('shake-animation');
        }, 500);

        // Save the incorrect answer
        saveTypo(userAnswer, correctAnswer, wordbank[currentWordIndex].english);
    }
}

/**
 * Show feedback for incorrect answer
 * @param {string} userAnswer - User's answer
 */
function showIncorrectFeedback(userAnswer) {
    const correctAnswer = wordbank[currentWordIndex].dutch;
    const feedbackElement = document.querySelector('.practice-feedback');

    // Only provide feedback if answer is wrong
    if (userAnswer.toLowerCase() !== correctAnswer.toLowerCase()) {
        feedbackElement.textContent = `Incorrect. Try again or skip to see the answer.`;
        feedbackElement.className = 'practice-feedback incorrect';

        // Add shake animation
        feedbackElement.classList.add('shake-animation');
        setTimeout(() => {
            feedbackElement.classList.remove('shake-animation');
        }, 500);

        // Save the incorrect answer
        saveTypo(userAnswer, correctAnswer, wordbank[currentWordIndex].english);
    }
}

/**
 * Save an incorrectly typed word to typo.json
 * @param {string} userAnswer - The user's incorrect input
 * @param {string} correctAnswer - The correct Dutch word
 * @param {string} english - The English translation
 */
function saveTypo(userAnswer, correctAnswer, english) {
    const typoKey = `${userAnswer}|${correctAnswer}`; // Unique key for the typo
    if (savedTypos.has(typoKey)) {
        return; // Skip if already saved in this session
    }

    savedTypos.add(typoKey);

    fetch('/typo/wordbank/save_typo', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            userAnswer: userAnswer,
            correctAnswer: correctAnswer,
            english: english,
            timestamp: new Date().toISOString()
        }),
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Error saving typo:', data.error);
                showMessage('Failed to save typo');
            } else {
                showMessage('Typo saved for review');
            }
        })
        .catch(error => {
            console.error('Error saving typo:', error);
            showMessage('Failed to save typo');
        });
}

/**
 * Reveal the correct answer
 */
function revealAnswer() {
    const wordHeaderElement = document.querySelector('.practice-current-word');
    const feedbackElement = document.querySelector('.practice-feedback');
    const input = document.querySelector('.practice-input');
    const nextButton = document.querySelector('.practice-next');
    const currentWord = wordbank[currentWordIndex];

    // Show the word in the header
    wordHeaderElement.textContent = currentWord.dutch;

    // Show translation
    document.querySelector('.practice-translation').style.visibility = 'visible';

    // Update feedback
    feedbackElement.textContent = 'Answer revealed';
    feedbackElement.className = 'practice-feedback';

    // Disable input and enable next button
    input.disabled = true;
    nextButton.disabled = false;

    // Pronounce the word
    pronounceWord(currentWord.dutch);
}

/**
 * Go to the next word
 */
function goToNextWord() {
    const wordHeaderElement = document.querySelector('.practice-current-word');
    wordHeaderElement.classList.remove('correct-answer');

    currentWordIndex++;

    // Update last completed index for resuming later
    lastCompletedIndex = currentWordIndex;

    if (currentWordIndex < wordbank.length) {
        displayCurrentWord();
    } else {
        finishPractice();
    }
}

/**
 * Update the progress indicator
 */
function updateProgress() {
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');

    const progressPercentage = ((currentWordIndex) / wordbank.length) * 100;
    progressFill.style.width = `${progressPercentage}%`;
    progressText.textContent = `${currentWordIndex}/${wordbank.length}`;
}

/**
 * Finish the practice session
 */
function finishPractice() {
    if (!practiceContainer) return;

    practiceContainer.innerHTML = `
        <div class="practice-header">
            <h3>Practice Complete!</h3>
            <button class="practice-close" onclick="closePracticeMode()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="practice-content">
            <div style="text-align: center; padding: 30px 0;">
                <i class="fas fa-trophy" style="font-size: 48px; color: #FFD700; margin-bottom: 20px;"></i>
                <h2>Great job!</h2>
                <p>You've completed practicing all ${wordbank.length} words.</p>
                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                    <button class="practice-from-beginning" style="
                        padding: 12px 24px;
                        background-color: #4caf50;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        cursor: pointer;
                        font-family: 'Poppins', sans-serif;
                    ">Start from Beginning</button>
                    <button class="practice-close-btn" style="
                        padding: 12px 24px;
                        background-color: var(--button-bg, #f0f0f0);
                        color: var(--text-color, #333);
                        border: 1px solid var(--border-color, #e0e0e0);
                        border-radius: 8px;
                        font-size: 16px;
                        cursor: pointer;
                        font-family: 'Poppins', sans-serif;
                    ">Close</button>
                </div>
            </div>
        </div>
    `;

    document.querySelector('.practice-from-beginning').addEventListener('click', () => {
        currentWordIndex = 0;
        lastCompletedIndex = 0;
        wordbank = isPersonalizedMode ? [...typoWords] : [...originalWordbank]; // Use appropriate wordbank
        setupPracticeMode(); // Restart practice
    });

    document.querySelector('.practice-close-btn').addEventListener('click', closePracticeMode);
}

/**
 * Close the practice mode
 */
function closePracticeMode() {
    if (practiceContainer) {
        practiceContainer.style.display = 'none';
        practiceActive = false;
    }
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

    // Speak the word
    window.speechSynthesis.speak(utterance);
}

/**
 * Show a temporary message to the user
 * @param {string} message - The message to show
 */
function showMessage(message) {
    // Create or update a message element
    let messageElement = document.querySelector('.practice-message');

    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.className = 'practice-message';
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

/**
 * Add CSS styles for practice mode
 */
function addPracticeStyles() {
    // Only add styles if they don't already exist
    if (!document.getElementById('practice-styles')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'practice-styles';
        styleElement.textContent = `
            .practice-container {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 500px;
                max-width: 90vw;
                background-color: var(--modal-bg, #ffffff);
                border-radius: 12px;
                box-shadow: 0 8px 30px var(--header-shadow, rgba(0, 0, 0, 0.05));
                z-index: 1000;
                overflow: hidden;
                display: none;
                font-family: 'Poppins', sans-serif;
                border: 1px solid var(--modal-border, #d9e1e8);
            }
            
            [data-theme="dark"] .practice-container {
                --bg-color: #1a202c;
                --text-color: #d1d7e0;
                --border-color: #374151;
                --input-bg: #1a202c;
                --button-bg: #374151;
                --button-hover: #4b5563;
                --feedback-correct: #166534;
                --feedback-incorrect: #7f1d1d;
                --hint-color: #9ca3af;
            }
            
            [data-theme="light"] .practice-container {
                --bg-color: #f7f9fc;
                --text-color: #1f2a44;
                --border-color: #d9e1e8;
                --input-bg: #f7f9fc;
                --button-bg: #e6f0fa;
                --button-hover: #d0e2f5;
                --feedback-correct: #e6f9e6;
                --feedback-incorrect: #ffe6e8;
                --hint-color: #5c6b80;
            }
            
            .practice-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid var(--border-color);
                background: var(--header-bg, linear-gradient(to right, #ffffff, #f7f9fc));
                position: relative;
            }
            
            .practice-header h3 {
                margin: 0;
                font-size: 18px;
                color: var(--text-color, #1f2a44);
                flex: 1;
            }
            
            .practice-current-word {
                font-size: 16px;
                font-weight: 500;
                color: var(--text-color, #1f2a44);
                text-align: center;
                flex: 2;
                min-height: 24px;
            }
            
            .practice-close {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: var(--text-color, #1f2a44);
                opacity: 0.7;
                transition: opacity 0.2s;
            }
            
            .practice-close:hover {
                opacity: 1;
            }
            
            .practice-content {
                padding: 20px;
                background-color: var(--bg-color, #f7f9fc);
            }
            
            .practice-progress {
                margin-bottom: 20px;
            }
            
            .progress-bar {
                height: 6px;
                background-color: var(--border-color, #d9e1e8);
                border-radius: 3px;
                overflow: hidden;
                margin-bottom: 8px;
            }
            
            .progress-fill {
                height: 100%;
                background-color: var(--switch-active, #2563eb);
                transition: width 0.3s ease;
            }
            
            .practice-progress-text {
                text-align: right;
                font-size: 14px;
                color: var(--hint-color, #5c6b80);
            }
            
            .practice-word-container {
                text-align: center;
                margin: 20px 0;
                min-height: 80px;
            }
            
            .practice-hint {
                font-size: 14px;
                color: var(--hint-color, #5c6b80);
                margin-bottom: 8px;
            }
            
            .practice-translation {
                font-size: 16px;
                color: var(--hint-color, #5c6b80);
                font-style: italic;
                visibility: hidden;
            }
            
            .practice-input-container {
                display: flex;
                margin-bottom: 20px;
                gap: 8px;
            }
            
            .practice-input {
                flex: 1;
                padding: 12px 16px;
                border-radius: 8px;
                border: 1px solid var(--search-input-border, #c5d0db);
                font-size: 16px;
                background-color: var(--input-bg, #f7f9fc);
                color: var(--text-color, #1f2a44);
                font-family: 'Poppins', sans-serif;
            }
            
            .practice-input:focus {
                outline: none;
                border-color: var(--switch-active, #2563eb);
                box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
            }
            
            .practice-pronounce, .practice-reveal, .practice-personalized {
                background-color: var(--button-bg, #e6f0fa);
                border: 1px solid var(--border-color, #d9e1e8);
                border-radius: 8px;
                width: 46px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                color: var(--text-color, #1f2a44);
            }
            
            .practice-pronounce:hover, .practice-reveal:hover, .practice-personalized:hover {
                background-color: var(--button-hover, #d0e2f5);
            }
            
            .practice-personalized.active {
                background-color: var(--switch-active, #2563eb);
                border-color: var(--switch-active, #2563eb);
                color: #ffffff;
            }
            
            .practice-feedback {
                text-align: center;
                font-size: 16px;
                min-height: 24px;
                margin-bottom: 20px;
            }
            
            .practice-feedback.correct {
                color: var(--switch-active, #2563eb);
                font-weight: 500;
                background-color: var(--feedback-correct, #e6f9e6);
                border-radius: 4px;
                padding: 4px 8px;
            }
            
            .practice-feedback.incorrect {
                color: var(--text-color, #1f2a44);
                background-color: var(--feedback-incorrect, #ffe6e8);
                border-radius: 4px;
                padding: 4px 8px;
            }
            
            .practice-controls {
                display: flex;
                justify-content: space-between;
                gap: 10px;
            }
            
            .practice-skip, .practice-next, .practice-personalized {
                flex: 1;
                padding: 12px;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                font-family: 'Poppins', sans-serif;
                transition: all 0.2s;
            }
            
            .practice-skip {
                background-color: var(--button-bg, #e6f0fa);
                border: 1px solid var(--border-color, #d9e1e8);
                color: var(--text-color, #1f2a44);
            }
            
            .practice-skip:hover {
                background-color: var(--button-hover, #d0e2f5);
            }
            
            .practice-next {
                background-color: var(--switch-active, #2563eb);
                border: 1px solid var(--switch-active, #2563eb);
                color: #ffffff;
            }
            
            .practice-next:hover {
                background-color: #1d4ed8;
                border-color: #1d4ed8;
            }
            
            .practice-next:disabled {
                background-color: var(--switch-bg, #c5d0db);
                border: 1px solid var(--switch-bg, #c5d0db);
                cursor: not-allowed;
                color: var(--hint-color, #5c6b80);
            }
            
            .correct-answer {
                animation: pulse 0.5s;
            }
            
            .shake-animation {
                animation: shake 0.5s;
            }
            
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
        `;
        document.head.appendChild(styleElement);
    }
}