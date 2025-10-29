// speechrecognition.js

document.addEventListener('DOMContentLoaded', function () {
    // Variables
    let recording = false;
    let mediaRecorder;
    let audioChunks = [];
    let practiceText = '';
    let recordingTimer;

    // DOM elements
    const speechButton = document.getElementById('speech-recognition');

    // Create modal HTML and append to body
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'speech-practice-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Speaking Practice</h2>
            
            <div id="practice-container">
                <h3>Text to Practice</h3>
                <div id="practice-text-container">
                    <p id="practice-text">Please select text in the editor before clicking the Speaking button.</p>
                </div>
                
                <div id="recording-controls">
                    <button id="start-recording" class="primary-btn">Start Recording</button>
                    <div id="recording-status" style="display: none;">
                        <div class="recording-indicator">
                            <div class="recording-pulse"></div>
                            Recording... <span id="recording-time">0</span> seconds
                        </div>
                        <button id="stop-recording" class="danger-btn">Stop Recording</button>
                    </div>
                </div>
                
                <div id="results-container" style="display: none;">
                    <h3>Evaluation Results</h3>
                    
                    <div class="result-section">
                        <h4>Your Speech</h4>
                        <p id="transcription-result">Processing...</p>
                    </div>
                    
                    <div class="result-section">
                        <h4>Pronunciation Analysis</h4>
                        <div id="word-analysis"></div>
                    </div>
                    
                    <div class="result-section score-container">
                        <div id="accuracy-score" class="score-circle">
                            <span class="score-value">0%</span>
                            <span class="score-label">Accuracy</span>
                        </div>
                        <div id="fluency-score" class="score-circle">
                            <span class="score-value">0%</span>
                            <span class="score-label">Fluency</span>
                        </div>
                        <div id="pronunciation-score" class="score-circle">
                            <span class="score-value">0%</span>
                            <span class="score-label">Pronunciation</span>
                        </div>
                    </div>
                    
                    <div class="result-section">
                        <h4>Feedback</h4>
                        <div id="feedback-container"></div>
                    </div>
                    
                    <div class="button-group">
                        <button id="try-again" class="secondary-btn">Practice Again</button>
                        <button id="close-results" class="primary-btn">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Add CSS for the practice modal
    const style = document.createElement('style');
    style.textContent = `
        /* Modal Styles */
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            overflow-y: auto;
        }
        
        .modal-content {
            background-color: var(--menu-bg, white);
            color: var(--text-color, #333);
            margin: 5% auto;
            padding: 25px;
            border-radius: 8px;
            width: 80%;
            max-width: 600px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            border: 1px solid var(--menu-border, #e1e4e8);
        }
        
        .close {
            color: var(--menu-item-color, #6a737d);
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
        }
        
        .close:hover {
            color: var(--menu-item-hover-color, #24292e);
        }
        
        h2, h3, h4 {
            color: var(--text-color, #333);
            margin-top: 0;
        }
        
        h2 {
            margin-bottom: 20px;
            font-size: 22px;
            border-bottom: 1px solid var(--file-item-border, #e1e4e8);
            padding-bottom: 10px;
        }
        
        h3 {
            font-size: 18px;
            margin-bottom: 15px;
        }
        
        h4 {
            font-size: 16px;
            margin-bottom: 10px;
        }
        
        #practice-text-container {
            margin-bottom: 20px;
            padding: 15px;
            border-radius: 6px;
            background-color: var(--textarea-bg, #f6f8fa);
            border: 1px solid var(--file-item-border, #e1e4e8);
            max-height: 150px;
            overflow-y: auto;
        }
        
        #practice-text {
            margin: 0;
            line-height: 1.6;
            white-space: pre-wrap;
        }
        
        #recording-controls {
            margin-bottom: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        #recording-status {
            margin-top: 15px;
            width: 100%;
            text-align: center;
        }
        
        .recording-indicator {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 15px;
            color: #d32f2f;
            font-weight: 500;
        }

        /* Add this to your existing CSS for the modal */
        .modal-content {
            max-height: 90vh;
            overflow-y: auto;
        }

        /* For smoother scrolling */
        .modal-content::-webkit-scrollbar {
            width: 8px;
        }

        .modal-content::-webkit-scrollbar-track {
            background: var(--textarea-bg, #f6f8fa);
            border-radius: 4px;
        }

        .modal-content::-webkit-scrollbar-thumb {
            background: var(--menu-item-color, #6a737d);
            border-radius: 4px;
        }

        /* Dark theme compatibility */
        [data-theme="dark"] .modal-content::-webkit-scrollbar-track {
            background: var(--textarea-bg, #2d333b);
        }

        [data-theme="dark"] .modal-content::-webkit-scrollbar-thumb {
            background: var(--menu-item-color, #6a737d);
        }
        
        .recording-pulse {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: #d32f2f;
            margin-right: 10px;
            animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
            0% {
                transform: scale(0.95);
                box-shadow: 0 0 0 0 rgba(211, 47, 47, 0.7);
            }
            
            70% {
                transform: scale(1);
                box-shadow: 0 0 0 10px rgba(211, 47, 47, 0);
            }
            
            100% {
                transform: scale(0.95);
                box-shadow: 0 0 0 0 rgba(211, 47, 47, 0);
            }
        }
        
        .result-section {
            margin-bottom: 20px;
            padding: 15px;
            border-radius: 6px;
            background-color: var(--textarea-bg, #f6f8fa);
            border: 1px solid var(--file-item-border, #e1e4e8);
        }
        
        .score-container {
            display: flex;
            justify-content: space-around;
            flex-wrap: wrap;
        }
        
        .score-circle {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            margin: 10px;
            box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
            position: relative;
        }
        
        #accuracy-score {
            background: linear-gradient(45deg, #43a047, #66bb6a);
            color: white;
        }
        
        #fluency-score {
            background: linear-gradient(45deg, #1e88e5, #42a5f5);
            color: white;
        }
        
        #pronunciation-score {
            background: linear-gradient(45deg, #8e24aa, #ab47bc);
            color: white;
        }
        
        .score-value {
            font-size: 24px;
            font-weight: bold;
        }
        
        .score-label {
            font-size: 12px;
            margin-top: 5px;
        }
        
        #word-analysis {
            line-height: 1.8;
        }
        
        .word {
            display: inline-block;
            margin-right: 5px;
            padding: 2px 5px;
            border-radius: 4px;
        }
        
        .word-correct {
            background-color: rgba(67, 160, 71, 0.2);
        }
        
        .word-similar {
            background-color: rgba(255, 152, 0, 0.2);
        }
        
        .word-incorrect {
            background-color: rgba(211, 47, 47, 0.2);
        }
        
        .button-group {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }
        
        button {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
            transition: background-color 0.2s, transform 0.1s;
        }
        
        button:hover {
            transform: translateY(-1px);
        }
        
        button:active {
            transform: translateY(1px);
        }
        
        .primary-btn {
            background-color: #4CAF50;
            color: white;
        }
        
        .primary-btn:hover {
            background-color: #43A047;
        }
        
        .secondary-btn {
            background-color: #2196F3;
            color: white;
        }
        
        .secondary-btn:hover {
            background-color: #1E88E5;
        }
        
        .danger-btn {
            background-color: #F44336;
            color: white;
        }
        
        .danger-btn:hover {
            background-color: #E53935;
        }
        
        /* Dark theme compatibility */
        [data-theme="dark"] .modal-content {
            background-color: var(--editor-bg, #252932);
            color: var(--text-color, #c6cdd4);
        }
        
        [data-theme="dark"] #practice-text-container,
        [data-theme="dark"] .result-section {
            background-color: var(--textarea-bg, #2d333b);
            border-color: var(--file-item-border, #373e47);
        }
        
        /* Toast notification */
        .toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            background-color: var(--menu-bg, white);
            color: var(--text-color, #333);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
            z-index: 1100;
            max-width: 300px;
            border-left: 4px solid #4CAF50;
            animation: fadeIn 0.3s;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        [data-theme="dark"] .toast {
            background-color: var(--editor-bg, #252932);
            color: var(--text-color, #c6cdd4);
        }
    `;
    document.head.appendChild(style);

    // Initialize event listeners
    function initializeEvents() {
        // Button to open practice modal
        speechButton.addEventListener('click', openPracticeModal);

        // Close button for modal
        document.querySelector('#speech-practice-modal .close').addEventListener('click', closePracticeModal);

        // Recording controls
        document.getElementById('start-recording').addEventListener('click', startRecording);
        document.getElementById('stop-recording').addEventListener('click', stopRecording);

        // Results buttons
        document.getElementById('try-again').addEventListener('click', resetRecording);
        document.getElementById('close-results').addEventListener('click', closePracticeModal);

        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                closePracticeModal();
            }
        });
    }

    // Function to open practice modal
    function openPracticeModal() {
        const modal = document.getElementById('speech-practice-modal');

        // Check if API key is set
        const apiKey = localStorage.getItem('openai_api_key');
        if (!apiKey) {
            showCustomNotification('Please set up your OpenAI API key first', 'error');
            return;
        }

        // Get selected text
        const selectedText = getSelectedText();
        if (!selectedText) {
            showCustomNotification('Please select text to practice speaking', 'warning');
            return;
        }

        // Set practice text
        practiceText = selectedText;
        document.getElementById('practice-text').textContent = selectedText;

        // Reset previous results
        resetUI();

        // Show modal
        modal.style.display = 'block';
    }


    // Function to close practice modal
    function closePracticeModal() {
        const modal = document.getElementById('speech-practice-modal');
        modal.style.display = 'none';

        // Stop recording if in progress
        if (recording) {
            stopRecording();
        }
    }

    // Function to get selected text
    function getSelectedText() {
        // This will need to be modified based on your actual editor implementation
        // For now, we'll use the standard browser selection
        return window.getSelection().toString().trim();
    }

    // Function to reset UI elements
    function resetUI() {
        document.getElementById('start-recording').style.display = 'block';
        document.getElementById('recording-status').style.display = 'none';
        document.getElementById('results-container').style.display = 'none';
    }

    // Function to start recording
    function startRecording() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showToast('Your browser does not support audio recording', 'error');
            return;
        }

        // Reset previous recording data
        audioChunks = [];

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaRecorder = new MediaRecorder(stream);

                // Event handler for when data is available
                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };

                // Event handler for when recording stops
                mediaRecorder.onstop = processRecording;

                // Start recording
                mediaRecorder.start();
                recording = true;

                // Update UI
                document.getElementById('start-recording').style.display = 'none';
                document.getElementById('recording-status').style.display = 'block';

                // Start recording timer
                let seconds = 0;
                const timerElement = document.getElementById('recording-time');
                recordingTimer = setInterval(() => {
                    seconds++;
                    timerElement.textContent = seconds;

                    // Auto-stop after 60 seconds
                    if (seconds >= 60) {
                        stopRecording();
                    }
                }, 1000);
            })
            .catch(error => {
                console.error('Error accessing microphone:', error);
                showToast('Could not access your microphone', 'error');
            });
    }

    // Function to stop recording
    function stopRecording() {
        if (mediaRecorder && recording) {
            mediaRecorder.stop();
            recording = false;

            // Stop all audio tracks
            mediaRecorder.stream.getTracks().forEach(track => track.stop());

            // Clear timer
            clearInterval(recordingTimer);

            // Update UI
            document.getElementById('recording-status').style.display = 'none';
            document.getElementById('results-container').style.display = 'block';
        }
    }
    // Add this before your processRecording function
    function ensureApiKeyIsSet() {
        // Check if API key exists in localStorage or somewhere in your app
        const apiKey = localStorage.getItem('openai_api_key');

        if (!apiKey) {
            // If no API key, prompt the user
            const userApiKey = prompt("Please enter your OpenAI API key to continue:");

            if (userApiKey) {
                // Save to server session
                return fetch('/openai/set_api_key', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        'api_key': userApiKey
                    })
                })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error("Failed to set API key");
                        }
                        localStorage.setItem('openai_api_key', userApiKey);
                        return true;
                    });
            } else {
                return Promise.resolve(false);
            }
        }

        return Promise.resolve(true);
    }

    // Function to process the recording
    function processRecording() {
        ensureApiKeyIsSet()
            .then(keySet => {
                if (!keySet) {
                    showToast('API key is required for speech evaluation', 'error');
                    document.getElementById('transcription-result').textContent = 'Error: OpenAI API key is required.';
                    return;
                }

                const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });

                // Display loading state
                document.getElementById('transcription-result').textContent = 'Processing your recording...';
                document.getElementById('word-analysis').innerHTML = '<div class="loading-spinner"></div>';

                // Create form data to send to server
                const formData = new FormData();
                formData.append('audio', audioBlob, 'recording.mp3');
                formData.append('reference_text', practiceText);
                formData.append('language', localStorage.getItem('practice_language') || 'en-US');

                // First try the evaluation endpoint
                fetch('/openai/evaluate_speaking', {
                    method: 'POST',
                    body: formData
                })
                    .then(response => {
                        if (!response.ok) {
                            if (response.status === 404) {
                                // If 404, the endpoint doesn't exist, try using the transcribe endpoint as fallback
                                console.log('Evaluation endpoint not found, falling back to transcription only');
                                return fallbackToTranscriptionOnly(formData);
                            }
                            throw new Error(`HTTP error! Status: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        if (data.error) {
                            showToast(data.error, 'error');
                            document.getElementById('transcription-result').textContent = `Error: ${data.error}`;
                            return;
                        }

                        // Display transcription result
                        document.getElementById('transcription-result').textContent = data.transcription;

                        // Display word-by-word analysis
                        displayWordAnalysis(data.word_analysis);

                        // Update scores
                        document.querySelector('#accuracy-score .score-value').textContent = `${data.accuracy_score}%`;
                        document.querySelector('#fluency-score .score-value').textContent = `${data.fluency_score}%`;
                        document.querySelector('#pronunciation-score .score-value').textContent = `${data.pronunciation_score}%`;

                        // Display feedback
                        displayFeedback(data.feedback);
                    })
                    .catch(error => {
                        console.error('Error processing recording:', error);
                        showToast('Error processing your recording. Please check console for details.', 'error');
                        document.getElementById('transcription-result').textContent = 'Error processing your recording. Please try again.';
                    });
            });
    }

    // Fallback function if the evaluation endpoint doesn't exist
    function fallbackToTranscriptionOnly(formData) {
        return fetch('/openai/transcribe', {
            method: 'POST',
            body: formData
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Create a simulated evaluation response with just the transcription
                return {
                    transcription: data.transcription,
                    accuracy_score: calculateSimpleAccuracyScore(data.transcription, practiceText),
                    fluency_score: 70, // Default value
                    pronunciation_score: 75, // Default value
                    word_analysis: null, // Will be generated by displayWordAnalysis
                    feedback: null // Will be generated by displayFeedback
                };
            });
    }

    // Function to calculate a simple accuracy score based on word match ratio
    function calculateSimpleAccuracyScore(transcription, reference) {
        const transcribedWords = transcription.split(/\s+/);
        const referenceWords = reference.split(/\s+/);

        let matchedWords = 0;
        const minLength = Math.min(transcribedWords.length, referenceWords.length);

        for (let i = 0; i < minLength; i++) {
            if (transcribedWords[i].toLowerCase() === referenceWords[i].toLowerCase()) {
                matchedWords++;
            } else if (similarity(transcribedWords[i].toLowerCase(), referenceWords[i].toLowerCase()) > 0.7) {
                matchedWords += 0.5;
            }
        }

        const maxLength = Math.max(transcribedWords.length, referenceWords.length);
        return Math.round((matchedWords / maxLength) * 100);
    }

    // Add this CSS for the loading spinner
    const spinnerStyle = document.createElement('style');
    spinnerStyle.textContent = `
    .loading-spinner {
        width: 40px;
        height: 40px;
        margin: 20px auto;
        border: 4px solid rgba(0, 0, 0, 0.1);
        border-radius: 50%;
        border-top: 4px solid #2196F3;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    [data-theme="dark"] .loading-spinner {
        border: 4px solid rgba(255, 255, 255, 0.1);
        border-top: 4px solid #2196F3;
    }
`;
    document.head.appendChild(spinnerStyle);

    // Function to display word-by-word analysis
    function displayWordAnalysis(wordAnalysis) {
        // If server doesn't provide word analysis, generate a simple one
        if (!wordAnalysis) {
            const originalWords = practiceText.split(/\s+/);
            const transcribedWords = document.getElementById('transcription-result').textContent.split(/\s+/);

            wordAnalysis = [];
            let minLength = Math.min(originalWords.length, transcribedWords.length);

            for (let i = 0; i < minLength; i++) {
                let status = 'incorrect';

                if (originalWords[i].toLowerCase() === transcribedWords[i].toLowerCase()) {
                    status = 'correct';
                } else if (similarity(originalWords[i].toLowerCase(), transcribedWords[i].toLowerCase()) > 0.7) {
                    status = 'similar';
                }

                wordAnalysis.push({
                    original: originalWords[i],
                    transcribed: transcribedWords[i],
                    status: status
                });
            }
        }

        // Build word analysis display
        const analysisContainer = document.getElementById('word-analysis');
        analysisContainer.innerHTML = '';

        wordAnalysis.forEach(word => {
            const wordSpan = document.createElement('span');
            wordSpan.className = `word word-${word.status}`;
            wordSpan.textContent = word.transcribed || word.original;
            wordSpan.title = `Original: ${word.original}`;
            analysisContainer.appendChild(wordSpan);
        });
    }

    // Function to display feedback
    function displayFeedback(feedback) {
        // If server doesn't provide feedback, generate a simple one
        if (!feedback) {
            const accuracyScore = parseInt(document.querySelector('#accuracy-score .score-value').textContent);

            if (accuracyScore >= 80) {
                feedback = {
                    overall: "Excellent job! Your pronunciation is very clear.",
                    suggestions: [
                        "Continue practicing with more complex sentences",
                        "Try speaking at a natural pace"
                    ]
                };
            } else if (accuracyScore >= 60) {
                feedback = {
                    overall: "Good effort! Your pronunciation is generally clear, but there's room for improvement.",
                    suggestions: [
                        "Practice the highlighted words that were mispronounced",
                        "Try speaking more slowly and clearly"
                    ]
                };
            } else {
                feedback = {
                    overall: "Keep practicing! Your pronunciation needs some work.",
                    suggestions: [
                        "Focus on pronouncing each word carefully",
                        "Break down difficult words into syllables",
                        "Listen to native speakers and mimic their pronunciation"
                    ]
                };
            }
        }

        // Build feedback display
        const feedbackContainer = document.getElementById('feedback-container');
        feedbackContainer.innerHTML = `
            <p><strong>Overall:</strong> ${feedback.overall}</p>
            <p><strong>Suggestions:</strong></p>
            <ul>
                ${feedback.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
            </ul>
        `;
    }

    // Function to reset recording UI
    function resetRecording() {
        document.getElementById('results-container').style.display = 'none';
        document.getElementById('start-recording').style.display = 'block';
    }

    // Function to calculate word similarity (Levenshtein distance based)
    function similarity(s1, s2) {
        // Simple implementation of Levenshtein distance
        const track = Array(s2.length + 1).fill(null).map(() =>
            Array(s1.length + 1).fill(null));

        for (let i = 0; i <= s1.length; i += 1) {
            track[0][i] = i;
        }

        for (let j = 0; j <= s2.length; j += 1) {
            track[j][0] = j;
        }

        for (let j = 1; j <= s2.length; j += 1) {
            for (let i = 1; i <= s1.length; i += 1) {
                const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
                track[j][i] = Math.min(
                    track[j][i - 1] + 1, // deletion
                    track[j - 1][i] + 1, // insertion
                    track[j - 1][i - 1] + indicator, // substitution
                );
            }
        }

        const distance = track[s2.length][s1.length];
        const maxLength = Math.max(s1.length, s2.length);

        return maxLength === 0 ? 1 : (1 - distance / maxLength);
    }

    // Function to show toast notification
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.style.borderLeftColor = type === 'error' ? '#F44336' :
            type === 'warning' ? '#FF9800' : '#4CAF50';
        toast.textContent = message;
        document.body.appendChild(toast);

        // Automatically remove toast after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    // Mock server response for testing
    // In a real implementation, this would come from your backend
    function mockEvaluationResponse() {
        // Calculate random scores for demo
        const accuracyScore = Math.floor(Math.random() * 30) + 70; // 70-100
        const fluencyScore = Math.floor(Math.random() * 30) + 65; // 65-95
        const pronunciationScore = Math.floor(Math.random() * 25) + 70; // 70-95

        return {
            transcription: practiceText, // Pretend perfect transcription for demo
            accuracy_score: accuracyScore,
            fluency_score: fluencyScore,
            pronunciation_score: pronunciationScore,
            word_analysis: generateMockWordAnalysis(practiceText),
            feedback: {
                overall: accuracyScore > 85 ?
                    "Excellent job! Your pronunciation is very clear." :
                    "Good effort! Your pronunciation is generally clear with some areas for improvement.",
                suggestions: [
                    "Practice emphasizing syllables correctly",
                    "Work on maintaining a consistent speaking pace",
                    "Pay attention to word endings"
                ]
            }
        };
    }

    // Generate mock word analysis for testing
    function generateMockWordAnalysis(text) {
        const words = text.split(/\s+/);
        return words.map(word => {
            // Randomly assign status for demo
            const rand = Math.random();
            let status = 'correct';

            if (rand < 0.1) {
                status = 'incorrect';
            } else if (rand < 0.2) {
                status = 'similar';
            }

            return {
                original: word,
                transcribed: word,
                status: status
            };
        });
    }

    // Initialize event listeners when DOM is loaded
    initializeEvents();
});