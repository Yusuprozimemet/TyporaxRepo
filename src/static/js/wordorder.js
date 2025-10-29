document.addEventListener('DOMContentLoaded', function() {
    // Add event listener to the word order practice button
    const wordOrderBtn = document.getElementById('word-order-practice');
    if (wordOrderBtn) {
        wordOrderBtn.addEventListener('click', initWordOrderExercise);
    }
    
    // Store difficult sentences for personalized learning
    let difficultSentences = JSON.parse(localStorage.getItem('difficultSentences')) || [];
    
    function initWordOrderExercise() {
        // Remove any existing modal first
        const existingModal = document.querySelector('.word-order-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Fetch saved words to create sentences
        fetch('/wordbank/saved')
            .then(response => response.json())
            .then(data => {
                if (data.content) {
                    createWordOrderGame(parseWordbank(data.content));
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
                
                // Extract examples if available
                let example = '';
                if (match[3].includes(';')) {
                    const exampleMatch = match[3].match(/;\s*"(.+?)"/);
                    if (exampleMatch) {
                        example = exampleMatch[1];
                    }
                }
                
                words.push({
                    dutch,
                    difficulty,
                    example
                });
            }
        });
        
        return words;
    }
    
    function createWordOrderGame(words) {
        // Generate sentences for practice
        const sentences = generateSentences(words);
        
        if (sentences.length === 0) {
            alert('Not enough examples found in your saved words to create sentences. Try adding more words with examples.');
            return;
        }
        
        // Create modal for the word order game
        const modal = document.createElement('div');
        modal.className = 'modal word-order-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Word Order Practice</h2>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="word-order-instructions">
                        <p>Arrange the words in the correct order to form a proper Dutch sentence.</p>
                    </div>
                    <div class="word-order-stats">
                        <span id="word-order-score">Score: 0</span>
                        <span id="word-order-progress">Question: 1/${sentences.length}</span>
                    </div>
                    <div class="word-order-container">
                        <div class="word-order-question" id="word-order-question"></div>
                        <div class="word-order-workspace" id="word-order-workspace"></div>
                        <div class="word-order-scrambled" id="word-order-scrambled"></div>
                    </div>
                    <div class="word-order-feedback" id="word-order-feedback"></div>
                    <div class="word-order-buttons">
                        <button id="check-sentence" class="btn">Check Answer</button>
                        <button id="skip-sentence" class="btn">Skip</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
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
        
        // Initialize the game
        startWordOrderGame(sentences, modal);
    }
    
    function generateSentences(words) {
        const sentences = [];
        
        // First include any difficult sentences from previous practice
        difficultSentences.forEach(sentence => {
            sentences.push(sentence);
        });
        
        // Then add examples from the saved words
        words.forEach(word => {
            if (word.example && word.example.trim() !== '') {
                // Avoid duplicates
                if (!sentences.some(s => s.dutch === word.example)) {
                    sentences.push({
                        dutch: word.example,
                        focusWord: word.dutch,
                        difficulty: word.difficulty
                    });
                }
            }
        });
        
        // If not enough examples, generate simple sentences
        if (sentences.length < 5) {
            const simpleVerbs = ['is', 'heeft', 'gaat', 'ziet', 'komt'];
            const simpleAdverbs = ['nu', 'hier', 'daar', 'vandaag', 'morgen'];
            
            // Filter words that are likely to be nouns or adjectives
            const usableWords = words.filter(word => 
                !simpleVerbs.includes(word.dutch) && 
                !simpleAdverbs.includes(word.dutch)
            );
            
            // Generate simple sentences
            usableWords.forEach(word => {
                const verb = simpleVerbs[Math.floor(Math.random() * simpleVerbs.length)];
                const adverb = simpleAdverbs[Math.floor(Math.random() * simpleAdverbs.length)];
                
                const sentence = `De ${word.dutch} ${verb} ${adverb}.`;
                
                // Avoid duplicates
                if (!sentences.some(s => s.dutch === sentence)) {
                    sentences.push({
                        dutch: sentence,
                        focusWord: word.dutch,
                        difficulty: word.difficulty
                    });
                }
            });
        }
        
        // Shuffle the sentences array
        return sentences.sort(() => Math.random() - 0.5);
    }
    
    function startWordOrderGame(sentences, modal) {
        const questionElement = modal.querySelector('#word-order-question');
        const workspaceElement = modal.querySelector('#word-order-workspace');
        const scrambledElement = modal.querySelector('#word-order-scrambled');
        const feedbackElement = modal.querySelector('#word-order-feedback');
        const scoreElement = modal.querySelector('#word-order-score');
        const progressElement = modal.querySelector('#word-order-progress');
        const checkButton = modal.querySelector('#check-sentence');
        const skipButton = modal.querySelector('#skip-sentence');
        
        let currentScore = 0;
        let currentSentenceIndex = 0;
        let currentSentence = sentences[currentSentenceIndex];
        
        // Initialize first question
        displaySentence(currentSentence);
        
        // Check answer button
        checkButton.addEventListener('click', function() {
            checkAnswer();
        });
        
        // Skip button
        skipButton.addEventListener('click', function() {
            // Add to difficult sentences if skipped
            if (!difficultSentences.some(s => s.dutch === currentSentence.dutch)) {
                difficultSentences.push(currentSentence);
            }
            
            // Move to next sentence
            nextSentence();
        });
        
        function displaySentence(sentence) {
            // Update progress
            progressElement.textContent = `Question: ${currentSentenceIndex + 1}/${sentences.length}`;
            
            // Clear previous content
            workspaceElement.innerHTML = '';
            scrambledElement.innerHTML = '';
            feedbackElement.innerHTML = '';
            
            // Split the sentence into words
            let words = sentence.dutch.split(/\s+/);
            
            // Remove punctuation from words but keep track of it
            words = words.map(word => {
                const punctuation = word.match(/[.,!?;:]/g);
                let cleanWord = word.replace(/[.,!?;:]/g, '');
                return {
                    text: cleanWord,
                    punctuation: punctuation ? punctuation[0] : '',
                    original: word
                };
            });
            
            // Scramble the words
            const scrambledWords = [...words].sort(() => Math.random() - 0.5);
            
            // Create the word elements for the scrambled area
            scrambledWords.forEach(word => {
                const wordElement = document.createElement('div');
                wordElement.className = 'word-order-word';
                wordElement.textContent = word.text + (word.punctuation || '');
                wordElement.dataset.text = word.text;
                wordElement.dataset.punctuation = word.punctuation;
                wordElement.dataset.original = word.original;
                wordElement.draggable = true;
                
                // Add drag start event
                wordElement.addEventListener('dragstart', function(e) {
                    e.dataTransfer.setData('text/plain', wordElement.dataset.original);
                    setTimeout(() => {
                        wordElement.classList.add('dragging');
                    }, 0);
                });
                
                // Add drag end event
                wordElement.addEventListener('dragend', function() {
                    wordElement.classList.remove('dragging');
                });
                
                // Add click event for mobile
                wordElement.addEventListener('click', function() {
                    // If this word is in the scrambled area, move it to the workspace
                    if (wordElement.parentElement === scrambledElement) {
                        workspaceElement.appendChild(wordElement);
                    } else {
                        // If it's in the workspace, move it back to scrambled
                        scrambledElement.appendChild(wordElement);
                    }
                });
                
                scrambledElement.appendChild(wordElement);
            });
            
            // Setup the workspace for dropping words
            workspaceElement.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });
            
            workspaceElement.addEventListener('drop', function(e) {
                e.preventDefault();
                const data = e.dataTransfer.getData('text/plain');
                const draggedElement = document.querySelector(`.word-order-word[data-original="${data}"]`);
                if (draggedElement) {
                    workspaceElement.appendChild(draggedElement);
                }
            });
            
            // Setup the scrambled area to allow dropping back
            scrambledElement.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });
            
            scrambledElement.addEventListener('drop', function(e) {
                e.preventDefault();
                const data = e.dataTransfer.getData('text/plain');
                const draggedElement = document.querySelector(`.word-order-word[data-original="${data}"]`);
                if (draggedElement) {
                    scrambledElement.appendChild(draggedElement);
                }
            });
        }
        
        function checkAnswer() {
            // Get the words in the workspace
            const workspaceWords = Array.from(workspaceElement.querySelectorAll('.word-order-word'));
            
            // Build the user's sentence
            const userSentence = workspaceWords.map(word => word.dataset.original).join(' ');
            
            // Compare with the correct sentence
            if (userSentence === currentSentence.dutch) {
                // Correct answer
                feedbackElement.innerHTML = `<span class="correct-answer">Correct! Well done!</span>`;
                currentScore += 10;
                scoreElement.textContent = `Score: ${currentScore}`;
                
                // Remove from difficult sentences if present
                difficultSentences = difficultSentences.filter(s => s.dutch !== currentSentence.dutch);
                
                // Save progress
                localStorage.setItem('difficultSentences', JSON.stringify(difficultSentences));
                
                // Disable input temporarily and show next button
                workspaceElement.classList.add('disabled');
                scrambledElement.classList.add('disabled');
                
                // Move to next sentence after a short delay
                setTimeout(nextSentence, 1500);
            } else {
                // Incorrect answer
                feedbackElement.innerHTML = `<span class="incorrect-answer">Not quite right. Try again!</span>`;
                
                // Add to difficult sentences if not already there
                if (!difficultSentences.some(s => s.dutch === currentSentence.dutch)) {
                    difficultSentences.push(currentSentence);
                }
                
                // Save progress
                localStorage.setItem('difficultSentences', JSON.stringify(difficultSentences));
            }
        }
        
        function nextSentence() {
            currentSentenceIndex++;
            
            if (currentSentenceIndex < sentences.length) {
                currentSentence = sentences[currentSentenceIndex];
                displaySentence(currentSentence);
                
                // Re-enable inputs
                workspaceElement.classList.remove('disabled');
                scrambledElement.classList.remove('disabled');
            } else {
                // End of exercise
                workspaceElement.innerHTML = '';
                scrambledElement.innerHTML = '';
                feedbackElement.innerHTML = `
                    <span class="exercise-complete">Exercise Complete!</span>
                    <p>Final Score: ${currentScore}</p>
                    <p>Great job practicing your Dutch word order!</p>
                `;
                
                checkButton.disabled = true;
                skipButton.disabled = true;
            }
        }
    }
});