document.addEventListener('DOMContentLoaded', function() {
    const matchingBtn = document.getElementById('matching-practice');
    
    if (matchingBtn) {
        matchingBtn.addEventListener('click', initMatchingExercise);
    }
    
    // Track difficult words for personalized learning
    let difficultWords = JSON.parse(localStorage.getItem('difficultWords')) || [];
    
    // Track which words have been practiced in the current session
    let practicedWords = [];
    
    // Track progress variables
    let wordsInBank = 0;
    let totalWordsToPractice = 0;
    let wordsPerSet = 6;
    let setsCompleted = 0;
    
    function initMatchingExercise() {
        // First check if a modal already exists and remove it
        const existingModal = document.querySelector('.matching-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Reset tracking variables
        practicedWords = [];
        setsCompleted = 0;
        
        // Fetch saved words from the server
        fetch('/wordbank/saved')
            .then(response => response.json())
            .then(data => {
                if (data.content) {
                    const allWords = parseWordbank(data.content);
                    wordsInBank = allWords.length;
                    
                    // Calculate how many sets we need to cover all words
                    // Each word should be practiced at least once
                    totalWordsToPractice = wordsInBank;
                    
                    if (wordsInBank === 0) {
                        alert('Please save some words first!');
                        return;
                    }
                    
                    createMatchingGame(allWords);
                } else {
                    alert('Please save some words first!');
                }
            })
            .catch(error => {
                console.error('Error loading wordbank:', error);
                alert('Error loading wordbank. Please try again.');
            });
    }
    
    function parseWordbank(content) {
        // Parse the markdown format of saved words
        const words = [];
        const lines = content.split('\n');
        
        lines.forEach(line => {
            if (line.trim() === '') return;
            
            // Extract Dutch, difficulty, and English
            const match = line.match(/- \*\*(.+?)\*\* (🟥|🟨|🟩) \*(.+?)\*/);
            if (match) {
                const dutch = match[1];
                const difficulty = match[2];
                // Extract just the English definition without example
                const english = match[3].split(';')[0].trim();
                
                words.push({
                    dutch,
                    english,
                    difficulty
                });
            }
        });
        
        return words;
    }
    
    function createMatchingGame(words) {
        // Create a modal dialog for the matching game
        const modal = document.createElement('div');
        modal.className = 'modal matching-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Matching Exercise</h2>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="matching-instructions">
                        <p>Match each Dutch word with its English meaning by clicking on both.</p>
                    </div>
                    <div class="matching-stats">
                        <span id="matching-score">Score: 0</span>
                        <span id="matching-timer">Time: 0s</span>
                        <span id="words-progress">Words: 0/${totalWordsToPractice}</span>
                        <span id="sets-completed">Set: ${setsCompleted + 1}</span>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar" id="progress-bar" style="width: 0%;"></div>
                    </div>
                    <div class="matching-container">
                        <div id="dutch-words" class="word-column"></div>
                        <div id="english-words" class="word-column"></div>
                    </div>
                    <div class="matching-feedback" id="matching-feedback"></div>
                </div>
                <button id="new-matching-set" class="btn">Next Set</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Store words in modal's dataset for later access
        modal.dataset.allWords = JSON.stringify(words);
        
        // Show the modal
        modal.style.display = 'block';
        
        // Close button functionality
        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = function() {
            modal.style.display = 'none';
            setTimeout(() => {
                modal.remove();
            }, 300);
        };
        
        // Close if clicked outside the modal content
        window.onclick = function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
                setTimeout(() => {
                    modal.remove();
                }, 300);
            }
        };
        
        // Initialize the game with the first set
        startMatchingGame(words, modal);
        
        // Next set button
        const nextSetBtn = modal.querySelector('#new-matching-set');
        nextSetBtn.onclick = function() {
            setsCompleted++;
            
            // Get all words from modal's dataset
            const allWords = JSON.parse(modal.dataset.allWords);
            
            // Check if we've practiced all words
            if (practicedWords.length >= totalWordsToPractice) {
                // Exercise complete!
                modal.querySelector('.matching-feedback').innerHTML = 
                    `<span class="exercise-complete">Congratulations! You've practiced all ${totalWordsToPractice} words in your wordbank!</span>`;
                nextSetBtn.textContent = "Start Over";
                nextSetBtn.onclick = function() {
                    // Reset and start over
                    practicedWords = [];
                    setsCompleted = 0;
                    startMatchingGame(allWords, modal);
                    nextSetBtn.textContent = "Next Set";
                    // Restore original onclick handler
                    nextSetBtn.onclick = arguments.callee;
                };
            } else {
                // Continue with next set
                startMatchingGame(allWords, modal);
            }
        };
    }
    
    function updateProgressDisplay(modal, wordsMatched) {
        // Update progress counter and progress bar
        const progressElement = modal.querySelector('#words-progress');
        const setsElement = modal.querySelector('#sets-completed');
        const progressBar = modal.querySelector('#progress-bar');
        
        progressElement.textContent = `Words: ${Math.min(practicedWords.length, totalWordsToPractice)}/${totalWordsToPractice}`;
        setsElement.textContent = `Set: ${setsCompleted + 1}`;
        
        const progressPercentage = Math.min((practicedWords.length / totalWordsToPractice) * 100, 100);
        progressBar.style.width = `${progressPercentage}%`;
        
        // Add color based on progress
        if (progressPercentage < 30) {
            progressBar.style.backgroundColor = '#ff9999'; // Light red
        } else if (progressPercentage < 70) {
            progressBar.style.backgroundColor = '#ffcc99'; // Light orange
        } else {
            progressBar.style.backgroundColor = '#99cc99'; // Light green
        }
        
        // Update next button state
        const nextBtn = modal.querySelector('#new-matching-set');
        if (practicedWords.length >= totalWordsToPractice && wordsMatched === wordsPerSet) {
            nextBtn.textContent = "Start Over";
        } else {
            nextBtn.textContent = "Next Set";
        }
    }
    
    function startMatchingGame(allWords, modal) {
        const dutchContainer = modal.querySelector('#dutch-words');
        const englishContainer = modal.querySelector('#english-words');
        const feedbackElement = modal.querySelector('#matching-feedback');
        const scoreElement = modal.querySelector('#matching-score');
        const timerElement = modal.querySelector('#matching-timer');
        
        // Clear previous content
        dutchContainer.innerHTML = '';
        englishContainer.innerHTML = '';
        feedbackElement.innerHTML = '';
        
        let currentScore = 0;
        scoreElement.textContent = `Score: ${currentScore}`;
        
        // Select words for this round (prioritizing unmatched words and difficult words)
        const gameWords = selectWordsForRound(allWords, wordsPerSet);
        
        // Shuffle the words for display
        const shuffledDutch = [...gameWords];
        const shuffledEnglish = [...gameWords].sort(() => Math.random() - 0.5);
        
        // Create word elements
        shuffledDutch.forEach(word => {
            const element = document.createElement('div');
            element.className = 'matching-word dutch-word';
            element.textContent = word.dutch;
            element.dataset.word = word.dutch;
            dutchContainer.appendChild(element);
        });
        
        shuffledEnglish.forEach(word => {
            const element = document.createElement('div');
            element.className = 'matching-word english-word';
            element.textContent = word.english;
            element.dataset.word = word.english;
            englishContainer.appendChild(element);
        });
        
        // Update progress display
        updateProgressDisplay(modal, 0);
        
        // Game state
        let selectedDutch = null;
        let selectedEnglish = null;
        let matchedWords = [];
        let startTime = Date.now();
        let timerInterval = setInterval(updateTimer, 1000);
        
        function updateTimer() {
            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            timerElement.textContent = `Time: ${elapsedSeconds}s`;
        }
        
        // Handle clicks on Dutch words
        const dutchWords = modal.querySelectorAll('.dutch-word');
        dutchWords.forEach(element => {
            element.addEventListener('click', function() {
                if (matchedWords.includes(this.dataset.word)) return;
                
                // Reset previous selection
                dutchWords.forEach(el => el.classList.remove('selected'));
                
                // Select this word
                this.classList.add('selected');
                selectedDutch = this.dataset.word;
                
                checkForMatch();
            });
        });
        
        // Handle clicks on English words
        const englishWords = modal.querySelectorAll('.english-word');
        englishWords.forEach(element => {
            element.addEventListener('click', function() {
                if (this.classList.contains('matched')) return;
                
                // Reset previous selection
                englishWords.forEach(el => el.classList.remove('selected'));
                
                // Select this word
                this.classList.add('selected');
                selectedEnglish = this.dataset.word;
                
                checkForMatch();
            });
        });
        
        function checkForMatch() {
            if (!selectedDutch || !selectedEnglish) return;
            
            // Find if there's a match
            const match = gameWords.find(word => 
                word.dutch === selectedDutch && 
                word.english === selectedEnglish
            );
            
            if (match) {
                // Found a match!
                const dutchElement = modal.querySelector(`.dutch-word[data-word="${selectedDutch}"]`);
                const englishElement = modal.querySelector(`.english-word[data-word="${selectedEnglish}"]`);
                
                dutchElement.classList.add('matched');
                englishElement.classList.add('matched');
                dutchElement.classList.remove('selected');
                englishElement.classList.remove('selected');
                
                matchedWords.push(selectedDutch);
                currentScore += 10;
                scoreElement.textContent = `Score: ${currentScore}`;
                
                // Add to practiced words if not already there
                if (!practicedWords.includes(selectedDutch)) {
                    practicedWords.push(selectedDutch);
                }
                
                // Remove from difficult words if present
                difficultWords = difficultWords.filter(word => word.dutch !== selectedDutch);
                
                feedbackElement.innerHTML = `<span class="correct-match">Correct match! "${selectedDutch}" = "${selectedEnglish}"</span>`;
                
                // Update progress display
                updateProgressDisplay(modal, matchedWords.length);
                
                // Check if current set is complete
                if (matchedWords.length === gameWords.length) {
                    clearInterval(timerInterval);
                    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
                    
                    if (practicedWords.length >= totalWordsToPractice) {
                        feedbackElement.innerHTML = `<span class="game-complete">All words practiced! Time: ${elapsedSeconds}s</span>`;
                    } else {
                        feedbackElement.innerHTML = `<span class="game-complete">Set complete! Time: ${elapsedSeconds}s</span>`;
                    }
                    
                    // Save updated difficult words
                    localStorage.setItem('difficultWords', JSON.stringify(difficultWords));
                }
            } else {
                // Not a match
                feedbackElement.innerHTML = `<span class="incorrect-match">Not a match, try again!</span>`;
                
                // Find the correct dutch word for this english translation
                const correctWord = gameWords.find(word => word.english === selectedEnglish);
                
                // Add to difficult words if not already there
                if (correctWord && !difficultWords.some(word => word.dutch === correctWord.dutch)) {
                    difficultWords.push(correctWord);
                }
            }
            
            selectedDutch = null;
            selectedEnglish = null;
        }
    }
    
    function selectWordsForRound(allWords, count) {
        // Calculate how many words we still need to practice
        const remainingWords = allWords.filter(word => !practicedWords.includes(word.dutch));
        
        // If we've practiced all words or almost done, just use remaining words
        if (remainingWords.length <= count) {
            return remainingWords;
        }
        
        let selectedWords = [];
        
        // First prioritize words that haven't been practiced yet
        let unpracticedToInclude = Math.min(Math.floor(count * 0.7), remainingWords.length);
        
        // Shuffle the unpracticed words for randomness
        const shuffledUnpracticed = [...remainingWords].sort(() => Math.random() - 0.5);
        
        // Add unpracticed words
        for (let i = 0; i < unpracticedToInclude; i++) {
            selectedWords.push(shuffledUnpracticed[i]);
        }
        
        // Then add difficult words (that haven't been added yet)
        let difficultToInclude = Math.min(count - selectedWords.length, difficultWords.length);
        
        for (let i = 0; i < difficultToInclude; i++) {
            const foundWord = allWords.find(word => 
                word.dutch === difficultWords[i].dutch && 
                !selectedWords.some(selected => selected.dutch === difficultWords[i].dutch)
            );
            
            if (foundWord) {
                selectedWords.push(foundWord);
            }
        }
        
        // Fill remaining slots with random words from the wordbank
        const remainingCount = count - selectedWords.length;
        if (remainingCount > 0) {
            const availableWords = allWords.filter(word => 
                !selectedWords.some(selected => selected.dutch === word.dutch)
            );
            
            // Shuffle the available words
            const shuffled = [...availableWords].sort(() => Math.random() - 0.5);
            
            // Add random words until we reach desired count
            for (let i = 0; i < Math.min(remainingCount, shuffled.length); i++) {
                selectedWords.push(shuffled[i]);
            }
        }
        
        return selectedWords;
    }
});