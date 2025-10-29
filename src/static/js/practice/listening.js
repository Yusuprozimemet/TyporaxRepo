document.addEventListener('DOMContentLoaded', function () {
    // Initialize audio context
    let audioContext;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.error('Web Audio API is not supported in this browser', e);
    }

    // Global variables
    let currentAudioFiles = [];
    let audioElement = null;
    let isPlaying = false;
    let currentDuration = 0;
    let updateTimer;

    // Get DOM elements
    const listeningListEl = document.getElementById('listeningList');
    const loadTextBtn = document.getElementById('loadTextBtn');

    // Event listeners
    document.getElementById('listening-tab').addEventListener('click', initializeListeningPractice);
    loadTextBtn.addEventListener('click', loadAudioFiles);

    // Initialize listening practice tab
    function initializeListeningPractice() {
        if (currentAudioFiles.length === 0) {
            loadAudioFiles();
        }
    }

    // Format time in MM:SS format
    function formatTime(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }

    // Load audio files from the server
    function loadAudioFiles() {
        fetch('/audio/files')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch audio files');
                }
                return response.json();
            })
            .then(files => {
                currentAudioFiles = files;
                if (currentAudioFiles.length > 0) {
                    setupListeningInterface();
                    // Update difficulty based on number of files
                    updateDifficulty(currentAudioFiles.length);
                } else {
                    listeningListEl.innerHTML = '<div class="alert alert-warning">No audio files found. Free version does not support audio player.</div>';
                }
            })
            .catch(error => {
                console.error('Error loading audio files:', error);
                listeningListEl.innerHTML = `<div class="alert alert-danger">Error loading audio files: ${error.message}</div>`;
            });
    }

    // Update difficulty level display
    function updateDifficulty(numFiles) {
        const difficultyLevelEl = document.getElementById('difficultyLevel');

        let level = 'Easy';
        if (numFiles > 20) {
            level = 'Hard';
        } else if (numFiles > 10) {
            level = 'Medium';
        }

        difficultyLevelEl.textContent = `Difficulty: ${level} (${numFiles} files)`;
    }

    // Set up listening practice interface
    function setupListeningInterface() {
        if (currentAudioFiles.length === 0) return;

        // Create audio player UI with file selector
        const playerHtml = `
            <div class="card mb-4 audio-card" style="background: var(--audio-card-bg); border-color: var(--audio-card-border);">
                <div class="card-body">
                    <h5 class="card-title" style="color: var(--body-color);">Audio Selection</h5>
                    <div class="mb-3">
                        <label for="audioFileSelect" class="form-label" style="color: var(--body-color);">Select an audio file:</label>
                        <select id="audioFileSelect" class="form-select" style="background: var(--form-bg); border-color: var(--form-border); color: var(--body-color);">
                            <option value="">-- Select an audio file --</option>
                            ${currentAudioFiles.map(file => `<option value="${file}">${file.replace('.mp3', '')}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div id="audioPlayer" class="audio-player mb-3" style="display: none; background: var(--audio-player-bg);">
                        <div class="player-controls d-flex align-items-center mb-3">
                            <button id="backwardBtn" class="btn me-2" style="background: var(--secondary-bg); color: var(--body-color);" title="Go back 3 seconds">
                                <i class="fas fa-backward"></i>
                            </button>
                            <button id="playPauseBtn" class="btn me-2" style="background: var(--audio-button-bg); color: var(--audio-button-text);">
                                <i class="fas fa-play"></i> Play
                            </button>
                            <button id="stopBtn" class="btn me-2" style="background: var(--secondary-bg); color: var(--body-color);">
                                <i class="fas fa-stop"></i> Stop
                            </button>
                            <button id="replayBtn" class="btn me-2" style="background: var(--secondary-bg); color: var(--body-color);">
                                <i class="fas fa-redo"></i> Replay
                            </button>
                            <div class="volume-container ms-2 d-flex align-items-center">
                                <i class="fas fa-volume-up me-2" style="color: var(--body-color);"></i>
                                <input type="range" id="volumeSlider" class="form-range" min="0" max="1" step="0.1" value="0.7" style="width: 100px; accent-color: var(--audio-volume-slider);">
                            </div>
                        </div>
                        <!-- Progress bar and time display -->
                        <div class="progress mb-3" id="progressBarContainer" style="height: 20px; cursor: pointer; background: var(--audio-progress-bg);">
                            <div class="progress-bar" id="progressBar" role="progressbar" style="background: var(--audio-progress-fill);" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                        <div class="time-display d-flex justify-content-between mb-3" style="color: var(--audio-time-text);">
                            <span id="currentTime">00:00</span>
                            <span id="duration">00:00</span>
                        </div>
                        <div class="card mb-4" style="background: var(--audio-card-bg); border-color: var(--audio-card-border);">
                            <div class="card-body">
                                <h5 class="card-title" style="color: var(--body-color);">Transcription Input</h5>
                                <div class="mb-3">
                                    <label for="transcriptionInput" class="form-label" style="color: var(--body-color);">Type what you hear:</label>
                                    <textarea id="transcriptionInput" class="form-control" rows="5" placeholder="Enter words here..." style="background: var(--form-bg); border-color: var(--form-border); color: var(--body-color);"></textarea>
                                </div>
                                <button id="saveBtn" class="btn me-2" style="background: var(--success-color); color: var(--audio-button-text);">
                                    <i class="fas fa-save"></i> Save
                                </button>
                                <button id="downloadBtn" class="btn" style="background: var(--audio-button-bg); color: var(--audio-button-text);">
                                    <i class="fas fa-download"></i> Download
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        listeningListEl.innerHTML = playerHtml;

        // Initialize audio element
        audioElement = new Audio();
        audioElement.preload = 'metadata';

        // Get DOM elements
        const audioFileSelect = document.getElementById('audioFileSelect');
        const audioPlayer = document.getElementById('audioPlayer');
        const playPauseBtn = document.getElementById('playPauseBtn');
        const stopBtn = document.getElementById('stopBtn');
        const replayBtn = document.getElementById('replayBtn');
        const backwardBtn = document.getElementById('backwardBtn');
        const volumeSlider = document.getElementById('volumeSlider');
        const progressBar = document.getElementById('progressBar');
        const progressBarContainer = document.getElementById('progressBarContainer');
        const currentTimeEl = document.getElementById('currentTime');
        const durationEl = document.getElementById('duration');
        const saveBtn = document.getElementById('saveBtn');
        const downloadBtn = document.getElementById('downloadBtn');
        const transcriptionInput = document.getElementById('transcriptionInput');

        // Add event listeners
        audioFileSelect.addEventListener('change', handleFileSelection);
        playPauseBtn.addEventListener('click', togglePlayPause);
        stopBtn.addEventListener('click', stopAudio);
        replayBtn.addEventListener('click', replayAudio);
        backwardBtn.addEventListener('click', skipBackward);
        volumeSlider.addEventListener('input', adjustVolume);
        saveBtn.addEventListener('click', saveTranscription);
        downloadBtn.addEventListener('click', downloadAllTranscriptions);

        // Add event listener for the progress bar click
        progressBarContainer.addEventListener('click', function (e) {
            if (audioElement.duration) {
                const rect = progressBarContainer.getBoundingClientRect();
                const position = (e.clientX - rect.left) / rect.width;
                audioElement.currentTime = position * audioElement.duration;
                updateProgress();
            }
        });

        // Audio events
        audioElement.addEventListener('loadedmetadata', function () {
            currentDuration = audioElement.duration;
            durationEl.textContent = formatTime(currentDuration);
        });

        audioElement.addEventListener('timeupdate', updateProgress);

        audioElement.addEventListener('ended', function () {
            isPlaying = false;
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Play';
            progressBar.style.width = '100%';
        });

        function saveTranscription() {
            const content = transcriptionInput.value.trim();
            const selectedFile = audioFileSelect.value;

            if (!content) {
                alert('Please enter some text to save.');
                return;
            }

            if (!selectedFile) {
                alert('Please select an audio file.');
                return;
            }

            // Use the audio file name (without .mp3) as the base for the markdown filename
            const filename = selectedFile.replace('.mp3', '');

            // Send the transcription to the server
            fetch('/practice/save_text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: content,
                    filename: filename,
                    folder: 'practice' // Save in the 'practice' folder
                })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert(`Transcription saved as ${data.filename} in practice folder!`);
                        transcriptionInput.value = ''; // Clear the input
                    } else {
                        alert(`Error: ${data.error}`);
                    }
                })
                .catch(error => {
                    console.error('Error saving transcription:', error);
                    alert('Failed to save transcription. Please try again.');
                });
        }

        function downloadAllTranscriptions() {
            // Fetch the list of .md files in the practice folder
            fetch('/practice/files?folder=practice')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to fetch file list');
                    }
                    return response.json();
                })
                .then(files => {
                    if (files.length === 0) {
                        alert('No transcriptions found in the practice folder.');
                        return;
                    }

                    // Create a new JSZip instance
                    const zip = new JSZip();

                    // Fetch content for each file
                    const fetchPromises = files.map(file => {
                        return fetch(`/practice/load_text?filename=${encodeURIComponent(file)}&folder=practice`)
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error(`Failed to fetch content for ${file}`);
                                }
                                return response.json();
                            })
                            .then(data => {
                                if (data.content) {
                                    zip.file(file, data.content);
                                } else {
                                    console.warn(`No content found for ${file}`);
                                }
                            });
                    });

                    // Wait for all file contents to be fetched
                    Promise.all(fetchPromises)
                        .then(() => {
                            // Generate the ZIP file
                            zip.generateAsync({ type: 'blob' })
                                .then(blob => {
                                    // Save the ZIP file
                                    saveAs(blob, 'transcriptions.zip');
                                });
                        })
                        .catch(error => {
                            console.error('Error creating ZIP file:', error);
                            alert('Failed to create ZIP file. Please try again.');
                        });
                })
                .catch(error => {
                    console.error('Error fetching file list:', error);
                    alert('Failed to fetch transcriptions. Please try again.');
                });
        }

        // Update play/pause button icon on toggle
        function togglePlayPause() {
            if (isPlaying) {
                audioElement.pause();
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Play';
            } else {
                audioElement.play();
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
            }
            isPlaying = !isPlaying;
        }
    }
    // Skip backward 3 seconds
    function skipBackward() {
        if (audioElement && audioElement.duration) {
            audioElement.currentTime = Math.max(0, audioElement.currentTime - 3);
            updateProgress();
        }
    }

    // Handle file selection
    function handleFileSelection() {
        const audioFileSelect = document.getElementById('audioFileSelect');
        const audioPlayer = document.getElementById('audioPlayer');

        const selectedFile = audioFileSelect.value;

        if (selectedFile) {
            // Reset player state
            stopAudio();
            audioPlayer.style.display = 'block';

            // Fetch audio file or presigned URL
            fetch(`/audio/play/${selectedFile}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to fetch audio (Status: ${response.status})`);
                    }
                    const contentType = response.headers.get('Content-Type');
                    if (contentType.includes('application/json')) {
                        // GCS environment: expect JSON with presigned URL
                        return response.json().then(data => {
                            if (!data.success) {
                                throw new Error(data.error || 'Failed to get audio URL');
                            }
                            return data.url;
                        });
                    } else if (contentType.includes('audio/mpeg')) {
                        // Local environment: use the endpoint URL directly
                        return `/audio/play/${selectedFile}`;
                    } else {
                        throw new Error(`Unexpected Content-Type: ${contentType}`);
                    }
                })
                .then(url => {
                    audioElement.src = url; // Set the URL (presigned or direct)
                    audioElement.load(); // Ensure audio is loaded
                    audioPlayer.style.display = 'block';
                })
                .catch(error => {
                    console.error('Error loading audio file:', error);
                    listeningListEl.innerHTML = `<div class="alert alert-danger">Error loading ${selectedFile}: ${error.message}</div>`;
                    audioPlayer.style.display = 'none';
                    if (error.message.includes('403')) {
                        setTimeout(() => {
                            window.location.href = '/login';
                        }, 2000);
                    }
                });
        } else {
            audioPlayer.style.display = 'none';
        }
    }


    // Stop audio playback
    function stopAudio() {
        const playPauseBtn = document.getElementById('playPauseBtn');
        const progressBar = document.getElementById('progressBar');
        const currentTimeEl = document.getElementById('currentTime');

        audioElement.pause();
        audioElement.currentTime = 0;
        isPlaying = false;
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Play'; // Changed to Font Awesome
        progressBar.style.width = '0%';
        currentTimeEl.textContent = '00:00';
        clearInterval(updateTimer);
    }

    // Replay audio
    function replayAudio() {
        stopAudio();
        setTimeout(() => {
            togglePlayPause();
        }, 100);
    }

    // Adjust volume
    function adjustVolume() {
        const volumeSlider = document.getElementById('volumeSlider');
        audioElement.volume = volumeSlider.value;
    }

    // Update progress bar
    function updateProgress() {
        const progressBar = document.getElementById('progressBar');
        const currentTimeEl = document.getElementById('currentTime');

        if (audioElement.duration) {
            const progress = (audioElement.currentTime / audioElement.duration) * 100;
            progressBar.style.width = `${progress}%`;
            currentTimeEl.textContent = formatTime(audioElement.currentTime);
        }
    }

    // Handle tab activation
    const listeningTab = document.getElementById('listening-tab');
    listeningTab.addEventListener('shown.bs.tab', function (e) {
        if (audioElement) {
            audioElement.pause();
            isPlaying = false;
            if (document.getElementById('playPauseBtn')) {
                document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i> Play'; // Changed to Font Awesome
            }
            clearInterval(updateTimer);
        }
    });
});
