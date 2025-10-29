// fillblanks.js - Script to practice filling in blanks with Dutch words

// Use a self-executing function to avoid global variable conflicts
(function () {
    // Variables scoped to this function
    let wordbank = [];
    let currentExercise = null;
    let currentScore = 0;
    let totalQuestions = 0;
    let exerciseContainer = null;
    let overlayElement = null;
    let currentWordIndex = 0; // Track the current position in the wordbank

    // Initialize event listener for the fill blanks button
    document.addEventListener('DOMContentLoaded', function () {
        document.getElementById('fill-button').addEventListener('click', startFillBlanks);
    });

    // Make startFillBlanks function available globally
    window.startFillBlanks = function () {
        console.log("Starting fill blanks exercise...");

        // Create overlay background if it doesn't exist
        if (!overlayElement) {
            overlayElement = document.createElement('div');
            overlayElement.id = 'exercise-overlay';
            document.body.appendChild(overlayElement);
        }

        // Create the exercise container if it doesn't exist
        if (!exerciseContainer) {
            exerciseContainer = document.createElement('div');
            exerciseContainer.id = 'exercise-container';
            exerciseContainer.className = 'exercise-panel';
            document.body.appendChild(exerciseContainer);
        }

        // Show loading state
        exerciseContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i> Loading word bank...</div>';

        // Show the exercise UI
        overlayElement.style.display = 'block';
        exerciseContainer.style.display = 'block';

        // Fetch the wordbank from the server
        console.log("Fetching wordbank from server...");
        fetch('/wordbank/')
            .then(response => {
                console.log("Received response:", response.status);
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    console.error("Server error:", data.error);
                    exerciseContainer.innerHTML = `<div class="error">Error: ${data.error}</div>`;
                    return;
                }

                console.log("Data received, parsing wordbank...");
                // Parse the wordbank from markdown format
                parseWordbank(data.content);

                // Initialize the exercise
                if (wordbank.length > 0) {
                    // Reset the current word index to start from the beginning
                    currentWordIndex = 0;
                    initializeExercise();
                } else {
                    exerciseContainer.innerHTML = `
                        <div class="error">
                            <h3>No usable words found</h3>
                            <p>Could not find words with examples in the wordbank. Make sure your wordbank contains words with example sentences in the format:</p>
                            <pre>- **Word** 🟥 *Definition; "Example sentence." (Translation)*</pre>
                        </div>
                    `;
                }
            })
            .catch(error => {
                console.error("Fetch error:", error);
                exerciseContainer.innerHTML = `
                    <div class="error">
                        <h3>Error Loading Wordbank</h3>
                        <p>${error.message}</p>
                        <p>Make sure the wordbank file exists and the server is running.</p>
                    </div>
                `;
            });
    };

    // Function to parse the wordbank from markdown format
    function parseWordbank(content) {
        wordbank = [];

        console.log("Parsing content length:", content.length);

        // Split the content by lines
        const lines = content.split('\n');
        console.log("Number of lines:", lines.length);

        // Process each line
        for (const line of lines) {
            // Check if the line contains a word definition
            if (line.trim().startsWith('- **') && line.includes('*')) {
                try {
                    // Extract the word, which is between ** and **
                    const wordStart = line.indexOf('**') + 2;
                    const wordEnd = line.indexOf('**', wordStart);
                    if (wordStart < 0 || wordEnd < 0) continue;

                    const word = line.substring(wordStart, wordEnd);

                    // Look for Dutch example sentences which are typically in quotes
                    let example = '';
                    let match = line.match(/"([^"]+)"/);
                    if (match && match[1]) {
                        example = match[1];
                    }

                    // Get definition part (text after the emoji and before any example)
                    let definition = '';
                    const emojiPos = line.indexOf('🟥');
                    if (emojiPos > 0) {
                        const defStart = line.indexOf('*', emojiPos) + 1;
                        const defEnd = line.lastIndexOf('*');
                        if (defStart > 0 && defEnd > defStart) {
                            definition = line.substring(defStart, defEnd).split(';')[0].trim();
                        }
                    }

                    // Add to wordbank if we have the required parts
                    if (word && example && example.toLowerCase().includes(word.toLowerCase())) {
                        console.log("Found word:", word, "with example:", example);
                        wordbank.push({
                            word: word,
                            definition: definition || 'No definition available',
                            example: example,
                            fullLine: line
                        });
                    }
                } catch (e) {
                    console.error('Error parsing line:', line, e);
                }
            }
        }

        console.log(`Parsed ${wordbank.length} words with examples`);
    }

    // Function to initialize the exercise
    function initializeExercise() {
        // Reset scores
        currentScore = 0;
        totalQuestions = 0;

        // Create UI for the exercise
        exerciseContainer.innerHTML = `
            <div class="exercise-header">
                <h2>Fill in the Blanks</h2>
                <div class="exercise-stats">
                    <div class="score-display"><i class="fas fa-star"></i> Score: <span id="current-score">0</span>/<span id="total-questions">0</span></div>
                    <div class="progress-display"><i class="fas fa-book"></i> Word <span id="current-word-num">1</span> of <span id="total-words">${wordbank.length}</span></div>
                </div>
                <button id="close-exercise-button" class="close-button"><i class="fas fa-times"></i></button>
            </div>
            <div id="exercise-content"></div>
            <div class="exercise-controls">
                <button id="next-question" class="fancy-button primary">Next</button>
                <button id="end-exercise" class="fancy-button secondary">End</button>
            </div>
        `;

        // Add event listeners
        document.getElementById('next-question').addEventListener('click', generateQuestion);
        document.getElementById('end-exercise').addEventListener('click', endExercise);
        document.getElementById('close-exercise-button').addEventListener('click', closeExercise);

        // Generate the first question
        generateQuestion();
    }

    // Function to close the exercise
    function closeExercise() {
        overlayElement.classList.remove('active');
        exerciseContainer.classList.remove('active');
        setTimeout(() => {
            overlayElement.style.display = 'none';
            exerciseContainer.style.display = 'none';
        }, 300);
    }

    // Function to generate a new question
    function generateQuestion() {
        if (wordbank.length === 0) {
            document.getElementById('exercise-content').innerHTML = `
                <div class="message error">No words with examples found in the wordbank.</div>
            `;
            return;
        }

        // Check if we've gone through all words
        if (currentWordIndex >= wordbank.length) {
            // We've completed the entire wordbank
            endExercise();
            return;
        }

        // Get the next word in sequence
        currentExercise = wordbank[currentWordIndex];

        // Update the word counter display
        document.getElementById('current-word-num').textContent = currentWordIndex + 1;

        console.log("Selected exercise:", currentExercise);

        // Create a sentence with a blank where the word should be
        const originalSentence = currentExercise.example;
        const wordToReplace = currentExercise.word;

        // Create a RegExp that's case-insensitive
        const wordRegExp = new RegExp(wordToReplace, 'gi');

        // Replace all occurrences of the word with a blank span
        const sentenceWithBlank = originalSentence.replace(wordRegExp, '<span class="blank"></span>');

        // Get hint from definition
        const hint = currentExercise.definition;

        // Create HTML for the question
        const questionHTML = `
            <div class="question-container">
                <p class="sentence">${sentenceWithBlank}</p>
                <p class="hint"><i class="fas fa-lightbulb"></i> Hint: ${hint}</p>
                <div class="answer-input">
                    <input type="text" id="user-answer" placeholder="Type the missing word" class="text-input">
                    <button id="check-answer" class="fancy-button primary"><i class="fas fa-check"></i></button>
                </div>
                <div id="feedback" class="feedback"></div>
            </div>
        `;

        // Update the exercise content
        document.getElementById('exercise-content').innerHTML = questionHTML;

        // Add event listener for the check button
        document.getElementById('check-answer').addEventListener('click', checkAnswer);

        // Allow pressing Enter to submit
        document.getElementById('user-answer').addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                checkAnswer();
            }
        });

        // Focus on the input field
        document.getElementById('user-answer').focus();

        // Add active classes for animations
        overlayElement.classList.add('active');
        exerciseContainer.classList.add('active');
    }

    // Function to check the user's answer
    function checkAnswer() {
        const userAnswer = document.getElementById('user-answer').value.trim();
        const correctAnswer = currentExercise.word;
        const feedbackEl = document.getElementById('feedback');

        // Increase total questions
        totalQuestions++;
        document.getElementById('total-questions').textContent = totalQuestions;

        // Check if the answer is correct (case-insensitive)
        if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
            // Correct answer
            currentScore++;
            document.getElementById('current-score').textContent = currentScore;

            feedbackEl.innerHTML = `
                <div class="correct">
                    <i class="fas fa-check-circle"></i> Correct! The word is "${correctAnswer}".
                    <p class="original-sentence">${currentExercise.example}</p>
                </div>
            `;
        } else {
            // Incorrect answer
            feedbackEl.innerHTML = `
                <div class="incorrect">
                    <i class="fas fa-times-circle"></i> Incorrect. The correct word is "${correctAnswer}".
                    <p class="original-sentence">${currentExercise.example}</p>
                    <p class="auto-save-message"><i class="fas fa-bookmark"></i> Word automatically saved</p>
                </div>
            `;
            // Automatically save the word
            saveWordAutomatically();
        }

        // Show feedback
        feedbackEl.classList.add('show');

        // Disable the input and button
        document.getElementById('user-answer').disabled = true;
        document.getElementById('check-answer').disabled = true;

        // Move to the next word in the sequence
        currentWordIndex++;

        // Focus on the next button
        document.getElementById('next-question').focus();

        // Update next button text if we're at the end
        if (currentWordIndex >= wordbank.length) {
            document.getElementById('next-question').textContent = "Show Results";
        }
    }

    // Function to automatically save incorrect words
    function saveWordAutomatically() {
        const wordData = {
            dutch: currentExercise.word,
            english: currentExercise.definition,
            difficulty: '🟥' // Assuming all words are difficult, adjust as needed
        };

        fetch('/wordbank/save_word', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(wordData),
        })
            .then(response => response.json())
            .then(data => {
                if (!data.message) {
                    console.error('Error saving word: ' + data.error);
                    // Notify the user if the save failed
                    const messageEl = document.querySelector('.auto-save-message');
                    if (messageEl) {
                        messageEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> Failed to save word';
                        messageEl.style.color = '#d32f2f';
                    }
                }
            })
            .catch((error) => {
                console.error('Error:', error);
                // Notify the user if the save failed
                const messageEl = document.querySelector('.auto-save-message');
                if (messageEl) {
                    messageEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> Failed to save word';
                    messageEl.style.color = '#d32f2f';
                }
            });
    }

    // Function to end the exercise
    function endExercise() {
        // Show final score and summary
        const percentageScore = totalQuestions > 0 ? Math.round((currentScore / totalQuestions) * 100) : 0;
        const completedWords = currentWordIndex;
        const totalWords = wordbank.length;
        const progressPercentage = Math.round((completedWords / totalWords) * 100);

        exerciseContainer.innerHTML = `
            <div class="exercise-summary">
                <h2>Exercise Complete</h2>
                <div class="final-score">
                    <p>Final Score: ${currentScore}/${totalQuestions} (${percentageScore}%)</p>
                    <div class="score-bar">
                        <div class="score-fill" style="width: ${percentageScore}%;"></div>
                    </div>
                </div>
                <div class="progress-stats">
                    <p>Words Completed: ${completedWords}/${totalWords} (${progressPercentage}%)</p>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercentage}%;"></div>
                    </div>
                </div>
                <div class="summary-message">
                    ${getMessage(percentageScore)}
                </div>
                <div class="summary-buttons">
                    <button id="restart-exercise" class="fancy-button primary"><i class="fas fa-redo"></i> Try Again</button>
                    <button id="close-exercise" class="fancy-button secondary"><i class="fas fa-times"></i> Close</button>
                </div>
            </div>
        `;

        // Add event listeners
        document.getElementById('restart-exercise').addEventListener('click', startFillBlanks);
        document.getElementById('close-exercise').addEventListener('click', closeExercise);
    }

    // Function to get encouraging message based on score
    function getMessage(score) {
        if (score >= 90) {
            return '<p><i class="fas fa-trophy"></i> Excellent! Your Dutch vocabulary is outstanding!</p>';
        } else if (score >= 70) {
            return '<p><i class="fas fa-star"></i> Great job! You\'re making good progress with your Dutch!</p>';
        } else if (score >= 50) {
            return '<p><i class="fas fa-thumbs-up"></i> Good effort! Keep practicing to improve your Dutch vocabulary.</p>';
        } else {
            return '<p><i class="fas fa-book"></i> Keep studying! Regular practice will help you improve your Dutch skills.</p>';
        }
    }

    // Function to add styles to the page
    function addStyles() {
        // Check if styles already exist
        if (document.getElementById('fillblanks-styles')) return;

        const styleElement = document.createElement('style');
        styleElement.id = 'fillblanks-styles';
        styleElement.textContent = `
            /* Fill Blanks Exercise Module Styles */
            #exercise-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(3px);
                z-index: 999;
                display: none;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            #exercise-overlay.active {
                opacity: 1;
            }

            .exercise-panel {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.95);
                background-color: var(--modal-bg);
                color: var(--text-color);
                border-radius: 12px;
                border: 1px solid var(--modal-border);
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15), 0 1px 8px rgba(0, 0, 0, 0.1);
                padding: 24px;
                margin: 0;
                display: none;
                max-width: 650px;
                width: 90%;
                z-index: 1000;
                max-height: 85vh;
                overflow-y: auto;
                overflow-x: hidden;
                opacity: 0;
                transition: transform 0.3s ease, opacity 0.3s ease;
            }

            .exercise-panel.active {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }

            .exercise-header {
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                border-bottom: 1px solid var(--menu-border);
                padding-bottom: 15px;
                position: relative;
            }

            .exercise-header h2 {
                margin: 0;
                font-size: 1.5rem;
                font-weight: 600;
                color: var(--text-color);
                flex: 1;
            }

            .exercise-stats {
                display: flex;
                gap: 16px;
                margin-right: 40px;
            }

            .score-display, .progress-display {
                font-size: 14px;
                color: var(--header-tagline);
                display: flex;
                align-items: center;
            }

            .score-display i, .progress-display i {
                margin-right: 6px;
                font-size: 16px;
            }

            .close-button {
                position: absolute;
                right: 0;
                top: 0;
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: var(--menu-item-color);
                opacity: 0.8;
                transition: opacity 0.2s, transform 0.2s;
                padding: 5px;
                border-radius: 50%;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .close-button:hover {
                opacity: 1;
                background-color: var(--menu-item-hover-bg);
                transform: rotate(90deg);
            }

            .question-container {
                background-color: var(--editor-bg);
                border-radius: 10px;
                padding: 20px;
                margin-bottom: 24px;
                border: 1px solid var(--editor-border);
                transition: box-shadow 0.3s ease;
            }

            .question-container:hover {
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
            }

            .sentence {
                font-size: 1.2em;
                margin-bottom: 18px;
                line-height: 1.6;
                font-weight: 500;
            }

            .sentence span.blank {
                position: relative;
                display: inline-block;
                width: 100px;
                height: 2px;
                background-color: var(--text-color);
                opacity: 0.5;
                margin: 0 4px;
                vertical-align: middle;
            }

            .sentence span.blank::before,
            .sentence span.blank::after {
                content: '';
                position: absolute;
                width: 4px;
                height: 8px;
                background-color: var(--text-color);
                opacity: 0.5;
            }

            .sentence span.blank::before {
                left: 0;
                top: -3px;
            }

            .sentence span.blank::after {
                right: 0;
                top: -3px;
            }

            .hint {
                display: flex;
                align-items: center;
                gap: 8px;
                color: var(--header-tagline);
                font-style: italic;
                margin-bottom: 20px;
                padding: 10px;
                border-radius: 6px;
                background-color: var(--bg-color);
                border-left: 3px solid var(--header-tagline);
            }

            .hint i {
                font-size: 16px;
            }

            .answer-input {
                display: flex;
                gap: 10px;
                margin-bottom: 15px;
            }

            .text-input {
                flex: 1;
                padding: 12px 16px;
                border: 1px solid var(--search-input-border);
                border-radius: 8px;
                font-size: 16px;
                background-color: var(--search-input-bg);
                color: var(--editor-text-color);
                transition: border-color 0.3s, box-shadow 0.3s;
            }

            .text-input:focus {
                outline: none;
                border-color: var(--switch-active);
                box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
            }

            .text-input:disabled {
                opacity: 0.7;
                cursor: not-allowed;
            }

            .fancy-button {
                padding: 0.6em 1.3em;
                border: none;
                border-radius: 8px;
                font-size: 1em;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }

            .fancy-button:hover {
                box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
                transform: translateY(-1px);
            }

            .fancy-button:active {
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                transform: translateY(1px);
            }

            .fancy-button i {
                font-size: 0.9em;
            }

            .fancy-button.primary {
                background: linear-gradient(to right, #4a6fdc, #7749d5);
                color: white;
            }

            .fancy-button.primary:hover {
                background: linear-gradient(to right, #5a7fe8, #865ae2);
            }

            .fancy-button.primary:active {
                background: linear-gradient(to right, #3a5fcc, #6639c5);
            }

            .fancy-button.secondary {
                background: var(--button-bg);
                color: var(--button-text);
                border: 1px solid var(--menu-border);
            }

            .fancy-button.secondary:hover {
                background: var(--button-hover-bg);
            }

            .fancy-button:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }

            /* Dark theme variations */
            [data-theme="dark"] .fancy-button.primary {
                background: linear-gradient(to right, #5d7fe2, #8a5ce8);
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
            }

            [data-theme="dark"] .fancy-button.primary:hover {
                background: linear-gradient(to right, #6d8fee, #9a6cf4);
            }

            [data-theme="dark"] .fancy-button.primary:active {
                background: linear-gradient(to right, #4d6fd2, #7a4cd8);
            }

            [data-theme="dark"] .sentence span.blank,
            [data-theme="dark"] .sentence span.blank::before,
            [data-theme="dark"] .sentence span.blank::after {
                background-color: var(--editor-text-color);
            }

            .feedback {
                margin-top: 15px;
                opacity: 0;
                transform: translateY(10px);
                transition: opacity 0.3s ease, transform 0.3s ease;
            }

            .feedback.show {
                opacity: 1;
                transform: translateY(0);
            }

            .correct {
                background-color: var(--highlight-green);
                color: #2e7d32;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #2e7d32;
                animation: pulse 1s ease;
            }

            [data-theme="dark"] .correct {
                background-color: rgba(22, 101, 52, 0.3);
                color: #4ade80;
                border-left: 4px solid #4ade80;
            }

            .incorrect {
                background-color: var(--highlight-red);
                color: #d32f2f;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #d32f2f;
            }

            [data-theme="dark"] .incorrect {
                background-color: rgba(127, 29, 29, 0.3);
                color: #f87171;
                border-left: 4px solid #f87171;
            }

            .original-sentence {
                font-style: italic;
                margin-top: 10px;
                padding: 8px;
                background-color: var(--search-input-bg);
                border-radius: 6px;
            }

            .auto-save-message {
                margin-top: 10px;
                font-size: 0.9em;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            [data-theme="dark"] .auto-save-message {
                color: #4ade80;
            }

            .exercise-controls {
                display: flex;
                justify-content: space-between;
                margin-top: 24px;
                gap: 12px;
            }

            .exercise-summary {
                text-align: center;
                padding: 10px;
            }

            .exercise-summary h2 {
                margin-top: 0;
                margin-bottom: 24px;
                font-size: 1.8em;
                background: linear-gradient(to right, #4a6fdc, #7749d5);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            [data-theme="dark"] .exercise-summary h2 {
                background: linear-gradient(to right, #5d7fe2, #8a5ce8);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            .final-score, .progress-stats {
                font-size: 1.2em;
                margin: 24px 0;
            }

            .score-bar, .progress-bar {
                height: 20px;
                background-color: var(--search-input-bg);
                border-radius: 10px;
                margin: 15px 0;
                overflow: hidden;
                box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
            }

            .score-fill {
                height: 100%;
                background: linear-gradient(to right, #4caf50, #8bc34a);
                transition: width 1s ease;
                border-radius: 10px;
            }

            .progress-fill {
                height: 100%;
                background: linear-gradient(to right, #2196F3, #03A9F4);
                transition: width 1s ease;
                border-radius: 10px;
            }

            .summary-message {
                margin: 30px 0;
                font-size: 1.1em;
                padding: 15px;
                background-color: var(--search-input-bg);
                border-radius: 10px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
            }

            .summary-message i {
                font-size: 2em;
                margin-bottom: 10px;
            }

            .summary-buttons {
                display: flex;
                justify-content: center;
                gap: 15px;
                margin-top: 20px;
            }

            .loading {
                text-align: center;
                padding: 30px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 15px;
            }

            .loading i {
                font-size: 2em;
                color: var(--switch-active);
                animation: spin 1.5s linear ampl;
            }

            .error {
                color: #d32f2f;
                background-color: var(--highlight-red);
                padding: 20px;
                border-radius: 8px;
                border-left: 4px solid #d32f2f;
                margin: 15px 0;
            }

            [data-theme="dark"] .error {
                background-color: rgba(127, 29, 29, 0.3);
                color: #f87171;
                border-left: 4px solid #f87171;
            }

            .error h3 {
                margin-top: 0;
                margin-bottom: 10px;
            }

            .error pre {
                background: rgba(0,0,0,0.05);
                padding: 10px;
                border-radius: 4px;
                overflow-x: auto;
                margin-top: 15px;
            }

            [data-theme="dark"] .error pre {
                background: rgba(255,255,255,0.05);
            }

            /* Animations */
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.02); }
                100% { transform: scale(1); }
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            /* Responsive adjustments */
            @media (max-width: 768px) {
                .exercise-panel {
                    width: 95%;
                    padding: 16px;
                    max-height: 90vh;
                }
                
                .exercise-header {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 10px;
                }
                
                .exercise-stats {
                    flex-direction: column;
                    gap: 8px;
                    margin-top: 10px;
                    margin-right: 0;
                }
                
                .fancy-button {
                    padding: 10px 16px;
                    font-size: 14px;
                }
                
                .sentence {
                    font-size: 1em;
                }
                
                .exercise-controls {
                    flex-direction: column;
                }
                
                .summary-buttons {
                    flex-direction: column;
                    width: 100%;
                }
            }

            /* For very small screens */
            @media (max-width: 480px) {
                .exercise-panel {
                    padding: 12px;
                }
                
                .question-container {
                    padding: 15px;
                }
                
                .answer-input {
                    flex-direction: column;
                }
                
                .text-input {
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(styleElement);
    }

    // Initialize the styles when the page loads
    document.addEventListener('DOMContentLoaded', addStyles);
})();