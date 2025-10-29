let sentences = [];
let keywords = [];
let currentFile = '';
let currentFolder = '';
let progress = {};
let studyStats = {
    correctAnswers: 0,
    totalAttempts: 0,
    startTime: null,
    sessionDuration: 0
};
let quizMode = false;
let audioEnabled = true;
// Add a global variable for language preference
let userLanguagePreference = 'en-US'; // Default to a neutral language (e.g., English) until fetched

$(document).ready(function () {
    fetchUserLanguagePreference(); // Fetch language preference on page load
    loadFolders();
    $('#folderSelect').change(loadFiles);
    $('#fileSelect').change(() => $('#loadTextBtn').prop('disabled', !$('#fileSelect').val()));
    $('#loadTextBtn').click(loadText);
    $('#toggleQuizMode').click(toggleQuizMode);
    $('#toggleAudio').click(toggleAudio);
    $('#showStats').click(showStudyStats);
    $('#resetProgress').click(resetProgress);
    
    // Initialize popovers and tooltips
    $('[data-bs-toggle="popover"]').popover();
    $('[data-bs-toggle="tooltip"]').tooltip();
    
    // Load user preferences from localStorage
    loadUserPreferences();
    
    // Start session timer
    startSessionTimer();
    
    // Initialize speech synthesis
    initSpeechSynthesis();
});

function loadUserPreferences() {
    // Load audio preference
    if (localStorage.getItem('audioEnabled') === 'false') {
        audioEnabled = false;
        $('#toggleAudio').text('Enable Audio');
    }
    
    // Load quiz mode
    if (localStorage.getItem('quizMode') === 'true') {
        quizMode = true;
        $('#toggleQuizMode').text('Disable Quiz Mode');
        $('.quiz-info').show();
    }
}

function loadFolders() {
    $.get('/practice/folders', function (data) {
        $('#folderSelect').empty().append('<option value="">Root</option>');
        data.forEach(folder => {
            $('#folderSelect').append(`<option value="${folder}">${folder}</option>`);
        });
    }).fail(() => alert('Error loading folders'));
}

function loadFiles() {
    const folder = $('#folderSelect').val();
    $.get(`/practice/files?folder=${encodeURIComponent(folder)}`, function (data) {
        $('#fileSelect').empty().append('<option value="">Choose a file...</option>');
        data.forEach(file => {
            $('#fileSelect').append(`<option value="${file}">${file}</option>`);
        });
        $('#loadTextBtn').prop('disabled', true);
    }).fail(() => alert('Error loading files'));
}

function loadText() {
    currentFile = $('#fileSelect').val();
    currentFolder = $('#folderSelect').val();
    if (!currentFile) return;

    $.get(`/practice/load_text?filename=${encodeURIComponent(currentFile)}&folder=${encodeURIComponent(currentFolder)}`, function (data) {
        sentences = data.sentences || [];
        keywords = data.keywords || [];
        // Load existing progress if available
        loadProgress();
        renderSentencePractice();
        renderBlanks();
        renderReverseSentences();
        renderSpaced();
        updateProgressBar();
        
        // Show the difficulty level
        determineDifficultyLevel();
    }).fail(() => alert('Error loading text'));
}

function loadProgress() {
    $.get(`/practice/progress?filename=${encodeURIComponent(currentFile)}&folder=${encodeURIComponent(currentFolder)}`, function (data) {
        progress = data.progress || {};
        renderSentencePractice();
        renderBlanks();
        renderReverseSentences();
        updateProgressBar();
    }).fail((xhr, status, error) => {
        console.log(`No progress file found; starting fresh: ${status} - ${error}`);
    });
}

function renderSentencePractice() {
    $('#sentenceList').empty();
    if (sentences.length === 0) {
        $('#sentenceList').append('<p>No sentences available.</p>');
        return;
    }
    sentences.forEach((sentence, index) => {
        const role = inferRole(sentence.target_lang, index);
        const highlighted = highlightKeywords(sentence.target_lang);
        const mastered = progress[`sentence_${index}`] ? '<span class="badge badge-mastered bg-success">Mastered</span>' : '';
        const card = `
            <div class="sentence-card">
                <div>
                    <span class="role-label">${role}</span>
                    <span class="target-lang-sentence">${highlighted}${mastered}</span>
                    <button class="btn btn-sm btn-outline-secondary speak-text ms-2" data-text="${sentence.target_lang.replace(/"/g, '"')}" title="Listen">
                        <i class="fas fa-volume-up"></i>
                    </button>
                </div>
                <div class="native-lang-translation" style="display: none;" id="translation_${index}">${sentence.native_lang}</div>
                <div class="action-buttons">
                    <button class="btn btn-link toggle-translation" aria-expanded="false" aria-controls="translation_${index}" data-index="${index}">Show Translation</button>
                    <button class="btn btn-outline-success mark-mastered" data-index="${index}" ${progress[`sentence_${index}`] ? 'disabled' : ''}>Mark Mastered</button>
                    <button class="btn btn-outline-primary add-to-flashcards" data-index="${index}" title="Add to flashcards for later review">
                        <i class="fas fa-bookmark"></i> Add to Flashcards
                    </button>
                </div>
            </div>`;
        $('#sentenceList').append(card);
    });

    // Event delegation for toggle-translation
    $('#sentenceList').off('click', '.toggle-translation').on('click', '.toggle-translation', function () {
        const $translation = $(this).closest('.sentence-card').find('.native-lang-translation');
        $translation.toggle();
        $(this).text($translation.is(':visible') ? 'Hide Translation' : 'Show Translation');
        $(this).attr('aria-expanded', $translation.is(':visible'));
    });

    // Event delegation for mark-mastered
    $('#sentenceList').off('click', '.mark-mastered').on('click', '.mark-mastered', function () {
        const index = $(this).data('index');
        progress[`sentence_${index}`] = true;
        $(this).prop('disabled', true);
        $(this).closest('.sentence-card').find('.target-lang-sentence').append('<span class="badge badge-mastered bg-success">Mastered</span>');
        saveProgress();
        updateProgressBar();
        updateStudyStats(true);
    });
    
    // Event delegation for speak-text
    $('#sentenceList').off('click', '.speak-text').on('click', '.speak-text', function() {
        if (!audioEnabled) return;
        const text = $(this).data('text');
        speakText(text);
    });
    
    // Event delegation for add-to-flashcards
    $('#sentenceList').off('click', '.add-to-flashcards').on('click', '.add-to-flashcards', function() {
        const index = $(this).data('index');
        addToFlashcards(index);
        $(this).prop('disabled', true).html('<i class="fas fa-bookmark"></i> Added');
    });
}

function renderBlanks() {
    $('#blankList').empty();
    if (sentences.length === 0) {
        $('#blankList').append('<p>No sentences available.</p>');
        return;
    }
    sentences.forEach((sentence, index) => {
        const { modifiedSentence, originalSentence, missingWords } = createBlanks(sentence.target_lang);
        const role = inferRole(sentence.target_lang, index);
        const mastered = progress[`blank_${index}`] ? '<span class="badge badge-mastered bg-success">Mastered</span>' : '';
        const card = `
            <div class="chunk-card">
                <div>
                    <span class="role-label">${role}</span>
                    <span class="chunk-text">${highlightKeywords(modifiedSentence)}${mastered}</span>
                </div>
                <div class="original-sentence" style="display: none;">${highlightKeywords(originalSentence)}</div>
                <div class="action-buttons">
                    <button class="btn btn-link reveal-sentence" aria-expanded="false">Reveal Sentence</button>
                    <button class="btn btn-outline-success mark-blank-mastered" data-index="${index}" ${progress[`blank_${index}`] ? 'disabled' : ''}>Mark Mastered</button>
                    <button class="btn btn-sm btn-outline-secondary speak-text ms-2" data-text="${originalSentence.replace(/"/g, '"')}" title="Listen">
                        <i class="fas fa-volume-up"></i>
                    </button>
                </div>
            </div>`;
        $('#blankList').append(card);
    });

    // Event delegation for reveal-sentence
    $('#blankList').off('click', '.reveal-sentence').on('click', '.reveal-sentence', function () {
        const $card = $(this).closest('.chunk-card');
        const $original = $card.find('.original-sentence');
        const $modified = $card.find('.chunk-text');
        const $hint = $card.find('.missing-words-hint');
        
        $modified.hide();
        $hint.hide();
        $original.show();
        $(this).text('Hide Answer').removeClass('reveal-sentence').addClass('hide-sentence');
        
        if (quizMode) {
            updateStudyStats(false); // Count as incorrect in quiz mode if revealed
        }
    });
    
    // Event delegation for hide-sentence (after revealing)
    $('#blankList').off('click', '.hide-sentence').on('click', '.hide-sentence', function () {
        const $card = $(this).closest('.chunk-card');
        const $original = $card.find('.original-sentence');
        const $modified = $card.find('.chunk-text');
        const $hint = $card.find('.missing-words-hint');
        
        $original.hide();
        $modified.show();
        $hint.show();
        $(this).text('Reveal Sentence').removeClass('hide-sentence').addClass('reveal-sentence');
    });
    
    // Event delegation for mark-blank-mastered
    $('#blankList').off('click', '.mark-blank-mastered').on('click', '.mark-blank-mastered', function () {
        const index = $(this).data('index');
        progress[`blank_${index}`] = true;
        $(this).prop('disabled', true);
        $(this).closest('.chunk-card').find('.chunk-text').append('<span class="badge badge-mastered bg-success">Mastered</span>');
        saveProgress();
        updateProgressBar();
        updateStudyStats(true);
    });
    
    // Event delegation for speak-text
    $('#blankList').off('click', '.speak-text').on('click', '.speak-text', function() {
        if (!audioEnabled) return;
        const text = $(this).data('text');
        speakText(text);
    });
}

function createBlanks(sentence) {
    const words = sentence.split(' ');
    if (words.length < 2) return { modifiedSentence: sentence, originalSentence: sentence, missingWords: [] };

    const numBlanks = Math.min(Math.floor(Math.random() * 2) + 1, words.length); // 1 or 2 blanks
    const indices = [];
    while (indices.length < numBlanks) {
        const index = Math.floor(Math.random() * words.length);
        if (!indices.includes(index)) indices.push(index);
    }

    const modifiedWords = [...words];
    const missingWords = [];
    
    indices.forEach(index => {
        missingWords.push(words[index]);
        modifiedWords[index] = `<span class="blank"></span>`;
    });

    return {
        modifiedSentence: modifiedWords.join(' '),
        originalSentence: sentence,
        missingWords: missingWords
    };
}

function renderReverseSentences() {
    $('#reverseList').empty();
    if (sentences.length === 0) {
        $('#reverseList').append('<p>No sentences available.</p>');
        return;
    }
    sentences.forEach((sentence, index) => {
        const role = inferRole(sentence.target_lang, index);
        const highlighted = highlightKeywords(sentence.target_lang);
        const mastered = progress[`reverse_${index}`] ? '<span class="badge badge-mastered bg-success">Mastered</span>' : '';
        const card = `
            <div class="reverse-card">
                <div>
                    <span class="role-label">${role}</span>
                    <span class="native-lang-text">${sentence.native_lang}${mastered}</span>
                </div>
                <div class="user-answer-container mb-2" style="display: ${quizMode ? 'block' : 'none'}">
                    <input type="text" class="form-control user-answer" placeholder="Type your answer in Target Language..." data-index="${index}">
                    <div class="feedback mt-1" style="display: none;"></div>
                </div>
                <div class="original-sentence" style="display: none;" id="original_${index}">${highlighted}</div>
                <div class="action-buttons">
                    <button class="btn btn-link show-original" aria-expanded="false" aria-controls="original_${index}" data-index="${index}">Show Original</button>
                    <button class="btn btn-outline-success mark-mastered-reverse" data-index="${index}" ${progress[`reverse_${index}`] ? 'disabled' : ''}>Mark Mastered</button>
                    <button class="btn btn-sm btn-outline-secondary speak-text ms-2" data-text="${sentence.target_lang.replace(/"/g, '"')}" title="Listen" style="display: none;">
                        <i class="fas fa-volume-up"></i>
                    </button>
                </div>
            </div>`;
        $('#reverseList').append(card);
    });

    // Event delegation for show-original
    $('#reverseList').off('click', '.show-original').on('click', '.show-original', function () {
        const $card = $(this).closest('.reverse-card');
        const $original = $card.find('.original-sentence');
        const $native_lang = $card.find('.native-lang-text');
        const $speakBtn = $card.find('.speak-text');
        
        $native_lang.hide();
        $original.show();
        $speakBtn.show();
        $(this).text('Hide Original').removeClass('show-original').addClass('hide-original');
        
        if (quizMode) {
            const index = $(this).data('index');
            const userAnswer = $card.find('.user-answer').val().trim();
            if (!userAnswer) {
                updateStudyStats(false); // Count as incorrect in quiz mode if revealed without answering
            }
        }
    });
    
    // Event delegation for hide-original (after revealing)
    $('#reverseList').off('click', '.hide-original').on('click', '.hide-original', function () {
        const $card = $(this).closest('.reverse-card');
        const $original = $card.find('.original-sentence');
        const $native_lang = $card.find('.native-lang-text');
        const $speakBtn = $card.find('.speak-text');
        
        $original.hide();
        $native_lang.show();
        $speakBtn.hide();
        $(this).text('Show Original').removeClass('hide-original').addClass('show-original');
    });

    // Event delegation for mark-mastered-reverse
    $('#reverseList').off('click', '.mark-mastered-reverse').on('click', '.mark-mastered-reverse', function () {
        const index = $(this).data('index');
        progress[`reverse_${index}`] = true;
        $(this).prop('disabled', true);
        $(this).closest('.reverse-card').find('.native-lang-text').append('<span class="badge badge-mastered bg-success">Mastered</span>');
        saveProgress();
        updateProgressBar();
        updateStudyStats(true);
    });
    
    // Event delegation for speak-text
    $('#reverseList').off('click', '.speak-text').on('click', '.speak-text', function() {
        if (!audioEnabled) return;
        const text = $(this).data('text');
        speakText(text);
    });
    
    // Event delegation for user answer check in quiz mode
    $('#reverseList').off('keypress', '.user-answer').on('keypress', '.user-answer', function(e) {
        if (e.which === 13) { // Enter key
            const index = $(this).data('index');
            const userAnswer = $(this).val().trim().toLowerCase();
            const correctAnswer = sentences[index].target_lang.toLowerCase();
            
            const $feedback = $(this).siblings('.feedback');
            const $card = $(this).closest('.reverse-card');
            
            if (userAnswer === correctAnswer) {
                $feedback.html('<span class="text-success">Correct!</span>').show();
                updateStudyStats(true);
                
                // Auto-mark as mastered after 3 correct answers
                const answerKey = `answer_${index}`;
                progress[answerKey] = (progress[answerKey] || 0) + 1;
                
                if (progress[answerKey] >= 3) {
                    progress[`reverse_${index}`] = true;
                    $card.find('.mark-mastered-reverse').prop('disabled', true);
                    $card.find('.native-lang-text').append('<span class="badge badge-mastered bg-success">Mastered</span>');
                }
                
                saveProgress();
                updateProgressBar();
            } else {
                $feedback.html(`<span class="text-danger">Try again or check the answer</span>`).show();
                updateStudyStats(false);
            }
        }
    });
}

function renderSpaced() {
    $('#spacedList').empty();
    if (sentences.length === 0) {
        $('#spacedList').append('<p>No sentences available.</p>');
        return;
    }
    
    // Filter sentences for spaced repetition based on mastery and time
    const spacedSentences = sentences.filter((sentence, index) => {
        // Include if not mastered or due for review
        return !progress[`spaced_${index}_last_review`] || 
               !progress[`sentence_${index}`] ||
               isDueForReview(progress[`spaced_${index}_last_review`], progress[`spaced_${index}_level`] || 0);
    });
    
    if (spacedSentences.length === 0) {
        $('#spacedList').append('<p>All sentences are up to date! Great job!</p>');
        return;
    }
    
    spacedSentences.forEach((sentence, arrayIndex) => {
        const index = sentences.indexOf(sentence);
        const role = inferRole(sentence.target_lang, index);
        const level = progress[`spaced_${index}_level`] || 0;
        const lastReview = progress[`spaced_${index}_last_review`] ? 
                          new Date(progress[`spaced_${index}_last_review`]).toLocaleDateString() : 'Never';
        
        const card = `
            <div class="spaced-card" data-original-index="${index}">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span class="role-label">${role}</span>
                    <div class="spaced-info">
                        <small class="text-muted">Level: ${level}</small>
                        <small class="text-muted ms-2">Last Review: ${lastReview}</small>
                    </div>
                </div>
                <div class="card-body">
                    <div class="target-lang-sentence">${highlightKeywords(sentence.target_lang)}</div>
                    <div class="native-lang-translation mt-2" style="display: none;">${sentence.native_lang}</div>
                </div>
                <div class="card-footer">
                    <button class="btn btn-link toggle-spaced-translation">Show Translation</button>
                    <button class="btn btn-sm btn-outline-secondary speak-text" data-text="${sentence.target_lang.replace(/"/g, '"')}" title="Listen">
                        <i class="fas fa-volume-up"></i>
                    </button>
                    <div class="mt-2 difficulty-rating">
                        <p>How difficult was recalling this?</p>
                        <button class="btn btn-sm btn-outline-danger difficulty-btn" data-difficulty="1">Hard</button>
                        <button class="btn btn-sm btn-outline-warning difficulty-btn" data-difficulty="2">Medium</button>
                        <button class="btn btn-sm btn-outline-success difficulty-btn" data-difficulty="3">Easy</button>
                    </div>
                </div>
            </div>`;
        $('#spacedList').append(card);
    });
    
    // Event delegation for toggle-spaced-translation
    $('#spacedList').off('click', '.toggle-spaced-translation').on('click', '.toggle-spaced-translation', function() {
        const $translation = $(this).closest('.spaced-card').find('.native-lang-translation');
        $translation.toggle();
        $(this).text($translation.is(':visible') ? 'Hide Translation' : 'Show Translation');
    });
    
    // Event delegation for difficulty-btn
    $('#spacedList').off('click', '.difficulty-btn').on('click', '.difficulty-btn', function() {
        const difficulty = parseInt($(this).data('difficulty'));
        const $card = $(this).closest('.spaced-card');
        const originalIndex = parseInt($card.data('original-index'));
        
        // Update the spaced repetition level
        const currentLevel = progress[`spaced_${originalIndex}_level`] || 0;
        let newLevel;
        
        if (difficulty === 1) { // Hard
            newLevel = Math.max(0, currentLevel - 1);
        } else if (difficulty === 2) { // Medium
            newLevel = currentLevel;
        } else { // Easy
            newLevel = currentLevel + 1;
        }
        
        // Update progress
        progress[`spaced_${originalIndex}_level`] = newLevel;
        progress[`spaced_${originalIndex}_last_review`] = new Date().toISOString();
        
        // Remove the card with animation
        $card.fadeOut(400, function() {
            $(this).remove();
            
            // Check if no cards remain
            if ($('#spacedList .spaced-card').length === 0) {
                $('#spacedList').append('<p>All sentences are up to date! Great job!</p>');
            }
        });
        
        saveProgress();
        updateStudyStats(difficulty > 1); // Count as correct if medium or easy
    });
    
    // Event delegation for speak-text
    $('#spacedList').off('click', '.speak-text').on('click', '.speak-text', function() {
        if (!audioEnabled) return;
        const text = $(this).data('text');
        speakText(text);
    });
}

function isDueForReview(lastReviewStr, level) {
    if (!lastReviewStr) return true;
    
    const lastReview = new Date(lastReviewStr);
    const now = new Date();
    const daysDiff = (now - lastReview) / (1000 * 60 * 60 * 24);
    
    // Calculate interval based on level (using a spaced repetition algorithm)
    // Level 0: review daily
    // Level 1: review after 3 days
    // Level 2: review after 7 days
    // Level 3: review after 14 days
    // Level 4: review after 30 days
    // Level 5+: review after 60 days
    const intervals = [1, 3, 7, 14, 30, 60];
    const interval = level < intervals.length ? intervals[level] : intervals[intervals.length - 1];
    
    return daysDiff >= interval;
}

function saveProgress() {
    $.ajax({
        url: '/practice/progress',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            filename: currentFile,
            folder: currentFolder,
            progress: progress
        }),
        success: function(response) {
            console.log('Progress saved successfully');
        },
        error: function(xhr, status, error) {
            console.error(`Error saving progress: ${status} - ${error}`);
            alert('Error saving progress');
        }
    });
}

function inferRole(sentence, index) {
    return `Sentence ${index + 1}`;
}

// Replace the existing highlightKeywords function with this fixed version
function highlightKeywords(sentence) {
    let highlighted = sentence;
    
    // Make sure keywords is an array and not undefined
    if (!Array.isArray(keywords)) {
        return highlighted;
    }
    
    keywords.forEach(keyword => {
        if (!keyword) return; // Skip empty keywords
        
        try {
            // Escape special regex characters in the keyword
            const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // Use a RegExp object with the escaped keyword
            const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'gi');
            highlighted = highlighted.replace(regex, `<span class="keyword">${keyword}</span>`);
        } catch (e) {
            console.error(`Error highlighting keyword "${keyword}": ${e.message}`);
            // Continue with the next keyword if there's an error
        }
    });
    
    return highlighted;
}

function updateProgressBar() {
    if (sentences.length === 0) return;
    
    let masteredCount = 0;
    sentences.forEach((_, index) => {
        if (progress[`sentence_${index}`]) masteredCount++;
        if (progress[`blank_${index}`]) masteredCount++;
        if (progress[`reverse_${index}`]) masteredCount++;
    });
    
    const totalItems = sentences.length * 3; // Three practice modes per sentence
    const percentage = Math.round((masteredCount / totalItems) * 100);
    
    $('#progressBarContainer').show();
    $('#progressBar').css('width', `${percentage}%`).attr('aria-valuenow', percentage);
    $('#progressText').text(`${masteredCount}/${totalItems} (${percentage}%) mastered`);
    
    // Change color based on progress
    if (percentage < 33) {
        $('#progressBar').removeClass('bg-warning bg-success').addClass('bg-danger');
    } else if (percentage < 66) {
        $('#progressBar').removeClass('bg-danger bg-success').addClass('bg-warning');
    } else {
        $('#progressBar').removeClass('bg-danger bg-warning').addClass('bg-success');
    }
    
    // Show confetti when reaching 100%
    if (percentage === 100) {
        showConfetti();
    }
}

function showConfetti() {
    // Simple confetti animation using canvas
    if (!$('#confettiCanvas').length) {
        $('body').append('<canvas id="confettiCanvas" style="position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;"></canvas>');
        
        const canvas = document.getElementById('confettiCanvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');
        const confetti = [];
        
        // Create confetti particles
        for (let i = 0; i < 200; i++) {
            confetti.push({
                x: Math.random() * canvas.width,
                y: -Math.random() * canvas.height,
                size: Math.random() * 10 + 5,
                color: ['#f44336', '#2196f3', '#ffeb3b', '#4caf50', '#9c27b0'][Math.floor(Math.random() * 5)],
                speed: Math.random() * 5 + 1
            });
        }
        
        // Animate confetti
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            let allFallen = true;
            confetti.forEach(particle => {
                ctx.fillStyle = particle.color;
                ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
                particle.y += particle.speed;
                
                if (particle.y < canvas.height) {
                    allFallen = false;
                }
            });
            
            if (!allFallen) {
                requestAnimationFrame(animate);
            } else {
                $('#confettiCanvas').remove();
            }
        }
        
        animate();
    }
}

function toggleQuizMode() {
    quizMode = !quizMode;
    $('#toggleQuizMode').text(quizMode ? 'Disable Quiz Mode' : 'Enable Quiz Mode');
    $('.quiz-info').toggle(quizMode);
    $('.user-answer-container').toggle(quizMode);
    
    // Save preference
    localStorage.setItem('quizMode', quizMode);
    
    // Reset study stats when toggling quiz mode
    resetStudyStats();
}

function toggleAudio() {
    audioEnabled = !audioEnabled;
    $('#toggleAudio').text(audioEnabled ? 'Disable Audio' : 'Enable Audio');
    
    // Save preference
    localStorage.setItem('audioEnabled', audioEnabled);
}

function initSpeechSynthesis() {
    if (!window.speechSynthesis) {
        console.log('Speech synthesis not supported');
        $('#toggleAudio').prop('disabled', true).text('Audio Not Supported');
        return;
    }
}

function fetchUserLanguagePreference() {
    $.get('/profile/get_profile', function(data) {
        // Map language preferences to Web Speech API language codes
        const languageMap = {
            'english': 'en-US',
            'italian': 'it-IT',
            'french': 'fr-FR',
            'german': 'de-DE',
            'chinese': 'zh-CN',
            'spanish': 'es-ES',
            'arabic': 'ar-SA',
            'turkish': 'tr-TR',
            'polish': 'pl-PL',
            'dutch': 'nl-NL' // Added Dutch mapping
        };
        // Normalize case to handle potential mismatches
        const normalizedPreference = data.language_preference ? data.language_preference.toLowerCase() : 'english';
        userLanguagePreference = languageMap[normalizedPreference] || 'en-US';
        console.log(`Language preference set to: ${userLanguagePreference} (from ${data.language_preference})`);
    }).fail(function(xhr, status, error) {
        console.error(`Error fetching user profile from /profile/get_profile: ${status} - ${error}`);
        userLanguagePreference = 'en-US'; // Fallback to neutral default
        console.warn('Failed to fetch language preference, using default: en-US');
    });
}

function speakText(text, lang) {
    if (!window.speechSynthesis) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang || userLanguagePreference; // Use user preference or fallback
    utterance.rate = 0.9; // Slightly slower for learning
    
    // Log the language being used
    console.log(`Speaking in language: ${utterance.lang}`);
    
    window.speechSynthesis.speak(utterance);
}

function addToFlashcards(index) {
    if (!sentences[index]) return;
    
    const flashcards = JSON.parse(localStorage.getItem('flashcards') || '[]');
    
    // Check if already exists
    const exists = flashcards.some(card => 
        card.target_lang === sentences[index].target_lang && 
        card.native_lang === sentences[index].native_lang
    );
    
    if (!exists) {
        flashcards.push({
            target_lang: sentences[index].target_lang,
            native_lang: sentences[index].native_lang,
            added: new Date().toISOString(),
            file: currentFile,
            folder: currentFolder
        });
        
        localStorage.setItem('flashcards', JSON.stringify(flashcards));
        showToast('Added to flashcards!');
        
        // Refresh UI to show the new flashcard
        renderFlashcards();
    } else {
        showToast('Already in flashcards!');
    }
}

function showToast(message) {
    // Create toast if it doesn't exist
    if (!$('#toast-container').length) {
        $('body').append(`
            <div id="toast-container" style="position: fixed; top: 20px; right: 20px; z-index: 9999;"></div>
        `);
    }
    
    const toastId = 'toast-' + Date.now();
    const toast = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <strong class="me-auto">Language Practice</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">${message}</div>
        </div>
    `;
    
    $('#toast-container').append(toast);
    $(`#${toastId}`).toast({delay: 3000}).toast('show');
}

function startSessionTimer() {
    studyStats.startTime = new Date();
    setInterval(updateSessionTime, 1000);
}

function updateSessionTime() {
    if (!studyStats.startTime) return;
    
    const now = new Date();
    studyStats.sessionDuration = Math.floor((now - studyStats.startTime) / 1000); // Duration in seconds
    
    // Update UI if necessary
    $('#sessionTime').text(formatDuration(studyStats.sessionDuration));
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    seconds %= 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updateStudyStats(correct) {
    studyStats.totalAttempts++;
    if (correct) {
        studyStats.correctAnswers++;
    }
    
    // Update accuracy display
    const accuracy = studyStats.totalAttempts > 0 
        ? Math.round((studyStats.correctAnswers / studyStats.totalAttempts) * 100)
        : 0;
    $('#accuracyRate').text(`${accuracy}%`);
    $('#correctAnswers').text(studyStats.correctAnswers);
    $('#totalAttempts').text(studyStats.totalAttempts);
}

function showStudyStats() {
    const accuracy = studyStats.totalAttempts > 0 
        ? Math.round((studyStats.correctAnswers / studyStats.totalAttempts) * 100)
        : 0;
    
    const statsMessage = `
        <h4>Study Statistics</h4>
        <p><strong>Correct Answers:</strong> ${studyStats.correctAnswers}</p>
        <p><strong>Total Attempts:</strong> ${studyStats.totalAttempts}</p>
        <p><strong>Accuracy:</strong> ${accuracy}%</p>
        <p><strong>Session Duration:</strong> ${formatDuration(studyStats.sessionDuration)}</p>
    `;
    
    // Show stats in a modal (assuming Bootstrap modal)
    if (!$('#statsModal').length) {
        $('body').append(`
            <div class="modal fade" id="statsModal" tabindex="-1" aria-labelledby="statsModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="statsModalLabel">Study Statistics</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">${statsMessage}</div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `);
    } else {
        $('#statsModal .modal-body').html(statsMessage);
    }
    
    $('#statsModal').modal('show');
}

function resetStudyStats() {
    studyStats.correctAnswers = 0;
    studyStats.totalAttempts = 0;
    studyStats.startTime = new Date();
    studyStats.sessionDuration = 0;
    
    // Update UI
    $('#accuracyRate').text('0%');
    $('#correctAnswers').text('0');
    $('#totalAttempts').text('0');
    $('#sessionTime').text('00:00:00');
}

function resetProgress() {
    if (confirm('Are you sure you want to reset your progress for this file?')) {
        progress = {};
        saveProgress();
        
        // Reset UI
        renderSentencePractice();
        renderBlanks();
        renderReverseSentences();
        renderSpaced();
        updateProgressBar();
        resetStudyStats();
        
        showToast('Progress reset successfully!');
    }
}

function determineDifficultyLevel() {
    if (!sentences || sentences.length === 0) return;
    
    const avgSentenceLength = sentences.reduce((sum, s) => sum + (s.target_lang ? s.target_lang.split(' ').length : 0), 0) / sentences.length;
    const uniqueWords = new Set(safeJoin(sentences).split(' ')).size;
    
    let difficulty = 'Beginner';
    if (avgSentenceLength > 10 || uniqueWords > 100) {
        difficulty = 'Advanced';
    } else if (avgSentenceLength > 5 || uniqueWords > 50) {
        difficulty = 'Intermediate';
    }
    
    $('#difficultyLevel').text(`Difficulty: ${difficulty}`);
}

// Add this function to parse Markdown tables
function parseMarkdownTable(markdownText) {
    const lines = markdownText.trim().split('\n');
    
    // Skip the header and separator rows (first two lines)
    const dataLines = lines.slice(2);
    
    const sentences = [];
    dataLines.forEach(line => {
        // Split by pipe character and trim whitespace
        const columns = line.split('|').map(col => col.trim());
        
        // The first and last elements are empty because of the table format
        if (columns.length >= 3 && columns[1] && columns[2]) {
            sentences.push({
                target_lang: columns[1],
                native_lang: columns[2]
            });
        }
    });
    
    return {
        sentences: sentences,
        keywords: [] // You can add keywords if needed
    };
}

// Add a button and textarea to load tables directly
$(document).ready(function() {
    // Add these lines to the existing $(document).ready function
    $('#practiceContainer').prepend(`
        <div class="card mb-4">
            <div class="card-header">
                <h5>Load from Markdown Table</h5>
            </div>
            <div class="card-body">
                <textarea id="markdownInput" class="form-control mb-2" 
                    rows="5" placeholder="Paste your Markdown table here (with Target Language and Native Language columns)..."></textarea>
                <button id="parseTableBtn" class="btn btn-primary">Load Table</button>
            </div>
        </div>
    `);
    
    // Add event listener for the new button
    $('#parseTableBtn').click(function() {
        const markdownText = $('#markdownInput').val();
        if (!markdownText) {
            alert('Please paste a Markdown table first');
            return;
        }
        
        const data = parseMarkdownTable(markdownText);
        
        // Populate the global variables directly
        sentences = data.sentences;
        keywords = data.keywords;
        currentFile = 'custom-markdown';
        currentFolder = 'custom';
        
        // Reset progress for this custom content
        progress = {};
        
        // Update the UI
        renderSentencePractice();
        renderBlanks();
        renderReverseSentences();
        renderSpaced();
        updateProgressBar();
        
        // Show success message
        showToast('Successfully loaded ' + sentences.length + ' sentences!');
    });
});

// Also add a safe version of the join helper function (used in determineDifficultyLevel)
function safeJoin(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return '';
    
    // Safely extract the target_lang property from each object
    const targetLangTexts = arr.map(item => item && item.target_lang ? item.target_lang : '').filter(Boolean);
    return targetLangTexts.join(' ');
}