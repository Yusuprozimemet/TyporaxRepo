// audio.js - Enhanced Audio Player with Draggable Modal, Persistent Position, Rewind 2s Button and Playback Speed Control

// Immediately-invoked function expression to avoid polluting global namespace
(function () {
  // Create and inject CSS styles (unchanged)
  function injectStyles() {
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      
      
      /* Modal Styling */
      .audio-modal {
        display: none;
        position: fixed;
        z-index: 1000;
        pointer-events: none; /* Make the background of modal non-interactive */
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: transparent; /* Make background transparent instead of semi-opaque */
        overflow: auto;
      }
      
      .audio-modal-content {
        pointer-events: auto; /* Restore pointer events for the modal content */
        background-color: var(--menu-bg);
        padding: 25px;
        border-radius: 12px;
        width: 90%;
        max-width: 550px;
        box-shadow: 0 8px 25px var(--header-shadow);
        border: 1px solid var(--menu-border);
        position: absolute;
        cursor: move;
        transition: background-color 0.3s ease, border-color 0.3s ease;
      }
      
      .audio-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        user-select: none;
      }
      
      .audio-modal-title {
        font-size: 22px;
        font-weight: 600;
        color: var(--text-color);
        margin: 0;
        transition: color 0.3s ease;
      }
      
      .audio-toggle-button {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: var(--menu-item-color);
        height: 36px;
        width: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s ease, color 0.3s ease;
      }
      
      .audio-toggle-button:hover {
        background-color: var(--menu-item-hover-bg);
        color: var(--menu-item-hover-color);
      }
      
      .audio-close-button {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: var(--menu-item-color);
        height: 36px;
        width: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s ease, color 0.3s ease;
      }
      
      .audio-close-button:hover {
        background-color: var(--menu-item-hover-bg);
        color: var(--menu-item-hover-color);
      }
      
      .audio-list {
        max-height: 350px;
        overflow-y: auto;
        margin-top: 10px;
        border-radius: 8px;
        border: 1px solid var(--file-item-border);
        background-color: var(--sidebar-bg);
        display: block;
        transition: border-color 0.3s ease, background-color 0.3s ease;
      }
      
      .audio-list.hidden {
        display: none;
      }
      
      .audio-list-empty {
        padding: 20px;
        text-align: center;
        color: var(--header-tagline);
        font-style: italic;
        transition: color 0.3s ease;
      }
      
      .audio-item {
        display: flex;
        align-items: center;
        padding: 12px 15px;
        border-bottom: 1px solid var(--file-item-border);
        cursor: pointer;
        transition: all 0.2s ease, background-color 0.3s ease, border-color 0.3s ease;
      }
      
      .audio-item:last-child {
        border-bottom: none;
      }
      
      .audio-item:hover {
        background-color: var(--file-item-hover-bg);
      }
      
      .audio-item-icon {
        width: 36px;
        height: 36px;
        background-color: #e6f2ff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 15px;
        color: #3498db;
        transition: all 0.2s ease;
      }
      
      [data-theme="dark"] .audio-item-icon {
        background-color: #373e47;
      }
      
      .audio-item-details {
        flex-grow: 1;
      }
      
      .audio-item-title {
        font-weight: 500;
        color: var(--editor-text-color);
        margin-bottom: 3px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 350px;
        transition: color 0.3s ease;
      }
      
      .audio-item-duration {
        font-size: 12px;
        color: var(--menu-item-color);
        transition: color 0.3s ease;
      }
      
      .audio-item.playing {
        background-color: #e0f0ff;
      }
      
      [data-theme="dark"] .audio-item.playing {
        background-color: #444d56;
      }
      
      .audio-item.playing .audio-item-icon {
        background-color: #3498db;
        color: white;
      }
      
      .audio-player-container {
        margin-top: 20px;
        border-top: 1px solid var(--footer-border);
        padding-top: 20px;
        transition: border-color 0.3s ease;
      }
      
      .audio-player-wrapper {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .audio-player-controls {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .audio-control-button {
        background: none;
        border: none;
        height: 40px;
        width: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: var(--menu-item-color);
        transition: all 0.2s ease, color 0.3s ease;
      }
      
      .audio-control-button:hover {
        background-color: var(--menu-item-hover-bg);
        color: var(--menu-item-hover-color);
      }
      
      .audio-play-button {
        background-color: #3498db;
        color: white;
      }
      
      .audio-play-button:hover {
        background-color: #2980b9;
      }
      
      .audio-player-progress {
        flex-grow: 1;
        margin: 0 10px;
      }
      
      .audio-progress-bar {
        width: 100%;
        height: 6px;
        background-color: var(--search-input-border);
        border-radius: 3px;
        overflow: hidden;
        cursor: pointer;
        transition: background-color 0.3s ease;
      }
      
      .audio-progress-fill {
        height: 100%;
        background-color: #3498db;
        width: 0;
        transition: width 0.1s linear;
      }
      
      .audio-time-display {
        font-size: 12px;
        color: var(--menu-item-color);
        min-width: 80px;
        text-align: right;
        transition: color 0.3s ease;
      }
      
      .audio-volume-container {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-left: 10px;
      }
      
      .audio-volume-slider {
        width: 80px;
        cursor: pointer;
      }
      
      .audio-now-playing {
        margin-top: 15px;
        font-size: 14px;
        color: var(--menu-item-color);
        transition: color 0.3s ease;
      }
      
      .audio-now-playing-title {
        font-weight: 500;
        color: var(--editor-text-color);
        transition: color 0.3s ease;
      }
      
      /* Speed control styling */
      .audio-speed-container {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 15px;
      }
      
      .audio-speed-icon {
        color: var(--menu-item-color);
        font-size: 14px;
        transition: color 0.3s ease;
      }
      
      .audio-speed-slider {
        flex-grow: 1;
        cursor: pointer;
      }
      
      .audio-speed-value {
        font-size: 14px;
        color: var(--menu-item-color);
        min-width: 48px;
        text-align: right;
        font-weight: 500;
        transition: color 0.3s ease;
      }
      
      .audio-speed-presets {
        display: flex;
        margin-top: 8px;
        gap: 8px;
      }
      
      .audio-speed-preset {
        background-color: var(--sidebar-bg);
        border: 1px solid var(--file-item-border);
        border-radius: 12px;
        padding: 4px 8px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        color: var(--menu-item-color);
      }
      
      .audio-speed-preset:hover {
        background-color: var(--file-item-hover-bg);
      }
      
      .audio-speed-preset.active {
        background-color: #3498db;
        color: white;
        border-color: #3498db;
      }
      
      /* Responsive adjustments */
      @media (max-width: 768px) {
        .audio-modal-content {
          width: 95%;
          margin: 10% auto;
          padding: 20px;
        }
        
        .audio-item-title {
          max-width: 200px;
        }
        
        .audio-volume-container {
          display: none;
        }
      }
    `;
    document.head.appendChild(styleEl);
  }

  // Create and inject HTML structure (unchanged)
  function createAudioPlayerStructure() {
    const modalHTML = `
        <div id="audio-modal" class="audio-modal">
          <div id="audio-modal-content" class="audio-modal-content">
            <div class="audio-modal-header">
              <h3 class="audio-modal-title">Audio Library</h3>
              <button id="audio-toggle-button" class="audio-toggle-button">
                <i class="fas fa-chevron-down" id="toggle-icon"></i>
              </button>
              <button class="audio-close-button" onclick="closeAudioModal()">×</button>
            </div>
            <div id="audio-list" class="audio-list"></div>
            <div class="audio-player-container">
              <div class="audio-player-wrapper">
                <div class="audio-player-controls">
                  <button id="audio-rewind-button" class="audio-control-button">
                    <i class="fas fa-backward"></i>
                  </button>
                  <button id="audio-prev-button" class="audio-control-button">
                    <i class="fas fa-step-backward"></i>
                  </button>
                  <button id="audio-play-button" class="audio-control-button audio-play-button">
                    <i class="fas fa-play" id="play-icon"></i>
                  </button>
                  <button id="audio-next-button" class="audio-control-button">
                    <i class="fas fa-step-forward"></i>
                  </button>
                </div>
                <div class="audio-player-progress">
                  <div id="audio-progress-bar" class="audio-progress-bar">
                    <div id="audio-progress-fill" class="audio-progress-fill"></div>
                  </div>
                </div>
                <div id="audio-time-display" class="audio-time-display">0:00 / 0:00</div>
                <div class="audio-volume-container">
                  <i class="fas fa-volume-up" id="volume-icon"></i>
                  <input type="range" id="audio-volume-slider" class="audio-volume-slider" min="0" max="1" step="0.1" value="1">
                </div>
              </div>
              <div id="audio-now-playing" class="audio-now-playing">
                No track selected
              </div>
              <!-- Speed control -->
              <div class="audio-speed-container">
                <i class="fas fa-tachometer-alt audio-speed-icon"></i>
                <input type="range" id="audio-speed-slider" class="audio-speed-slider" min="0.5" max="2" step="0.1" value="1">
                <div id="audio-speed-value" class="audio-speed-value">1.0x</div>
              </div>
              <div class="audio-speed-presets">
                <div class="audio-speed-preset" data-speed="0.5">0.5x</div>
                <div class="audio-speed-preset" data-speed="0.75">0.75x</div>
                <div class="audio-speed-preset active" data-speed="1">1.0x</div>
                <div class="audio-speed-preset" data-speed="1.25">1.25x</div>
                <div class="audio-speed-preset" data-speed="1.5">1.5x</div>
                <div class="audio-speed-preset" data-speed="2">2.0x</div>
              </div>
            </div>
          </div>
        </div>
        <audio id="audio-player"></audio>
    `;

    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
  }

  // Initialize the audio player functionality
  function initAudioPlayer() {
    // Elements
    const audioButton = document.getElementById('audio-button');
    const audioModal = document.getElementById('audio-modal');
    const audioModalContent = document.getElementById('audio-modal-content');
    const audioList = document.getElementById('audio-list');
    const audioPlayer = document.getElementById('audio-player');
    const toggleButton = document.getElementById('audio-toggle-button');
    const toggleIcon = document.getElementById('toggle-icon');
    const playPauseButton = document.getElementById('audio-play-button');
    const playIcon = document.getElementById('play-icon');
    const prevButton = document.getElementById('audio-prev-button');
    const nextButton = document.getElementById('audio-next-button');
    const rewindButton = document.getElementById('audio-rewind-button');
    const progressBar = document.getElementById('audio-progress-bar');
    const progressFill = document.getElementById('audio-progress-fill');
    const timeDisplay = document.getElementById('audio-time-display');
    const volumeSlider = document.getElementById('audio-volume-slider');
    const volumeIcon = document.getElementById('volume-icon');
    const nowPlayingText = document.getElementById('audio-now-playing');
    const header = audioModalContent.querySelector('.audio-modal-header');
    // Speed control elements
    const speedSlider = document.getElementById('audio-speed-slider');
    const speedValue = document.getElementById('audio-speed-value');
    const speedPresets = document.querySelectorAll('.audio-speed-preset');

    // State variables
    let currentAudioItem = null;
    let currentAudioIndex = -1;
    let audioFiles = [];
    let isPlaying = false;
    let isListVisible = true;
    let isDragging = false;
    let currentX = 0;
    let currentY = 0;
    let initialX;
    let initialY;
    let currentSpeed = 1.0;

    // Event listeners
    audioButton.addEventListener('click', openAudioModal);
    toggleButton.addEventListener('click', toggleAudioList);
    playPauseButton.addEventListener('click', togglePlayPause);
    prevButton.addEventListener('click', playPreviousTrack);
    nextButton.addEventListener('click', playNextTrack);
    rewindButton.addEventListener('click', rewindTwoSeconds);
    progressBar.addEventListener('click', seekAudio);
    volumeSlider.addEventListener('input', changeVolume);
    volumeIcon.addEventListener('click', toggleMute);
    // Speed control event listeners
    speedSlider.addEventListener('input', changeSpeed);
    speedPresets.forEach(preset => {
      preset.addEventListener('click', function () {
        const speed = parseFloat(this.dataset.speed);
        setPlaybackSpeed(speed);
        updateSpeedPresetActive(speed);
      });
    });

    // Dragging event listeners
    header.addEventListener('mousedown', startDragging);
    document.addEventListener('mousemove', dragModal);
    document.addEventListener('mouseup', stopDragging);

    // Audio player events
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('ended', onAudioEnded);
    audioPlayer.addEventListener('play', () => {
      playIcon.className = 'fas fa-pause';
      isPlaying = true;
    });
    audioPlayer.addEventListener('pause', () => {
      playIcon.className = 'fas fa-play';
      isPlaying = false;
    });

    // Make functions globally accessible
    window.openAudioModal = openAudioModal;
    window.closeAudioModal = closeAudioModal;

    // Functions
    function openAudioModal() {
      // Check session status
      fetch('/audio/files', { method: 'HEAD' }) // Lightweight request to check access
        .then(response => {
          if (response.status === 403) {
            alert('Please log in to access audio files.');
            window.location.href = '/login';
            return;
          }
          audioModal.style.display = 'block';
          if (currentX === 0 && currentY === 0) {
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const modalWidth = audioModalContent.offsetWidth;
            const modalHeight = audioModalContent.offsetHeight;
            currentX = (windowWidth - modalWidth) / 2;
            currentY = (windowHeight - modalHeight) / 2;
          }
          audioModalContent.style.left = `${currentX}px`;
          audioModalContent.style.top = `${currentY}px`;
          loadAudioFiles();
        })
        .catch(error => {
          console.error('Error checking session:', error);
          alert('Unable to access audio files. Please try again later.');
        });
    }

    function closeAudioModal() {
      audioModal.style.display = 'none';
      currentX = parseInt(audioModalContent.style.left) || 0;
      currentY = parseInt(audioModalContent.style.top) || 0;
    }

    function toggleAudioList() {
      isListVisible = !isListVisible;
      audioList.classList.toggle('hidden', !isListVisible);
      toggleIcon.className = isListVisible ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
    }

    function startDragging(e) {
      isDragging = true;
      initialX = e.clientX - currentX;
      initialY = e.clientY - currentY;
      audioModalContent.style.transition = 'none';
    }

    function dragModal(e) {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        const maxX = window.innerWidth - audioModalContent.offsetWidth;
        const maxY = window.innerHeight - audioModalContent.offsetHeight;
        currentX = Math.max(0, Math.min(currentX, maxX));
        currentY = Math.max(0, Math.min(currentY, maxY));

        audioModalContent.style.left = `${currentX}px`;
        audioModalContent.style.top = `${currentY}px`;
      }
    }

    function stopDragging() {
      isDragging = false;
      audioModalContent.style.transition = 'background-color 0.3s ease, border-color 0.3s ease';
    }

    function rewindTwoSeconds() {
      if (audioPlayer.currentTime > 0) {
        audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 5);
      }
    }

    function loadAudioFiles() {
      fetch('/audio/files')
        .then(response => {
          if (response.status === 403) {
            throw new Error('Session expired or access denied. Please log in again.');
          } else if (!response.ok) {
            throw new Error(`Failed to load audio files (Status: ${response.status})`);
          }
          return response.json();
        })
        .then(files => {
          audioFiles = files;
          renderAudioList(files);
        })
        .catch(error => {
          console.error('Error loading audio files:', error);
          audioList.innerHTML = `
            <div class="audio-list-empty">
              <i class="fas fa-exclamation-circle"></i>
              <p>${error.message}</p>
            </div>
          `;
          if (error.message.includes('Session expired')) {
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
          }
        });
    }

    function renderAudioList(files) {
      audioList.innerHTML = '';

      if (files.length === 0) {
        audioList.innerHTML = `
          <div class="audio-list-empty">
            <p>No audio files available. Contact support to gain access.</p>
          </div>
        `;
        return;
      }

      files.forEach((file, index) => {
        const audioItem = document.createElement('div');
        audioItem.classList.add('audio-item');
        if (currentAudioItem && file === currentAudioItem.dataset.filename) {
          audioItem.classList.add('playing');
        }

        audioItem.dataset.filename = file;
        audioItem.dataset.index = index;

        audioItem.innerHTML = `
          <div class="audio-item-icon">
            <i class="fas fa-music"></i>
          </div>
          <div class="audio-item-details">
            <div class="audio-item-title">${file}</div>
            <div class="audio-item-duration">--:--</div>
          </div>
        `;

        audioItem.addEventListener('click', () => {
          playAudio(file, audioItem, index);
        });

        audioList.appendChild(audioItem);
      });
    }

    function playAudio(filename, audioItem, index) {
      if (currentAudioItem && currentAudioItem !== audioItem) {
        currentAudioItem.classList.remove('playing');
      }

      currentAudioItem = audioItem;
      currentAudioIndex = index;

      fetch(`/audio/play/${filename}`)
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
            return `/audio/play/${filename}`;
          } else {
            throw new Error(`Unexpected Content-Type: ${contentType}`);
          }
        })
        .then(url => {
          audioPlayer.src = url; // Set the URL (presigned or direct)
          audioPlayer.play()
            .then(() => {
              audioItem.classList.add('playing');
              nowPlayingText.innerHTML = `Now playing: <span class="audio-now-playing-title">${filename}</span>`;
            })
            .catch(error => {
              console.error('Error playing audio:', error, audioPlayer.error);
              nowPlayingText.innerHTML = `
                          <span style="color: red;">
                              Error playing "${filename}": ${error.message}
                              ${audioPlayer.error ? `(Code: ${audioPlayer.error.code}, Message: ${audioPlayer.error.message})` : ''}
                          </span>
                      `;
            });
          // Apply the current playback speed to the new track
          audioPlayer.playbackRate = currentSpeed;
        })
        .catch(error => {
          console.error('Error fetching audio URL:', error);
          nowPlayingText.innerHTML = `
                  <span style="color: red;">
                      Error playing "${filename}": 
                      ${error.message.includes('403') ? 'Access denied. Please log in again.' : 'File unavailable.'}
                  </span>
              `;
          if (error.message.includes('403')) {
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
          }
        });
    }

    function togglePlayPause() {
      if (audioPlayer.paused) {
        if (audioPlayer.src) {
          audioPlayer.play()
            .catch(error => {
              console.error('Error playing audio:', error);
            });
        } else if (audioFiles.length > 0) {
          const firstItem = audioList.querySelector('.audio-item');
          if (firstItem) {
            playAudio(
              firstItem.dataset.filename,
              firstItem,
              parseInt(firstItem.dataset.index)
            );
          }
        }
      } else {
        audioPlayer.pause();
      }
    }

    function updateProgress() {
      const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
      progressFill.style.width = `${percent}%`;

      const currentTime = formatTime(audioPlayer.currentTime);
      const duration = formatTime(audioPlayer.duration);
      timeDisplay.textContent = `${currentTime} / ${duration}`;
    }

    function seekAudio(e) {
      const progressBarRect = progressBar.getBoundingClientRect();
      const clickPosition = e.clientX - progressBarRect.left;
      const progressBarWidth = progressBarRect.width;
      const seekPercentage = clickPosition / progressBarWidth;

      if (audioPlayer.duration) {
        audioPlayer.currentTime = seekPercentage * audioPlayer.duration;
      }
    }

    function playNextTrack() {
      if (audioFiles.length === 0 || currentAudioIndex === -1) return;

      let nextIndex = currentAudioIndex + 1;
      if (nextIndex >= audioFiles.length) {
        nextIndex = 0;
      }

      const nextItem = audioList.querySelector(`.audio-item[data-index="${nextIndex}"]`);
      if (nextItem) {
        playAudio(
          audioFiles[nextIndex],
          nextItem,
          nextIndex
        );
      }
    }

    function playPreviousTrack() {
      if (audioFiles.length === 0 || currentAudioIndex === -1) return;

      if (audioPlayer.currentTime > 3) {
        audioPlayer.currentTime = 0;
        return;
      }

      let prevIndex = currentAudioIndex - 1;
      if (prevIndex < 0) {
        prevIndex = audioFiles.length - 1;
      }

      const prevItem = audioList.querySelector(`.audio-item[data-index="${prevIndex}"]`);
      if (prevItem) {
        playAudio(
          audioFiles[prevIndex],
          prevItem,
          prevIndex
        );
      }
    }

    function onAudioEnded() {
      playNextTrack();
    }

    function changeVolume() {
      audioPlayer.volume = volumeSlider.value;
      updateVolumeIcon();
    }

    function toggleMute() {
      audioPlayer.muted = !audioPlayer.muted;
      updateVolumeIcon();
    }

    function updateVolumeIcon() {
      if (audioPlayer.muted || audioPlayer.volume === 0) {
        volumeIcon.className = 'fas fa-volume-mute';
      } else if (audioPlayer.volume < 0.5) {
        volumeIcon.className = 'fas fa-volume-down';
      } else {
        volumeIcon.className = 'fas fa-volume-up';
      }
    }

    // Speed control functions
    function changeSpeed() {
      const speed = parseFloat(speedSlider.value);
      setPlaybackSpeed(speed);
      updateSpeedPresetActive(speed);
    }

    function setPlaybackSpeed(speed) {
      currentSpeed = speed;

      if (audioPlayer) {
        audioPlayer.playbackRate = speed;
      }

      speedSlider.value = speed;
      speedValue.textContent = `${speed.toFixed(1)}x`;
    }

    function updateSpeedPresetActive(speed) {
      speedPresets.forEach(preset => {
        const presetSpeed = parseFloat(preset.dataset.speed);
        if (presetSpeed === speed) {
          preset.classList.add('active');
        } else {
          preset.classList.remove('active');
        }
      });
    }

    function formatTime(seconds) {
      if (isNaN(seconds) || !isFinite(seconds)) return '0:00';

      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // Modify the window click handler to only close if clicking on modal backdrop
    window.addEventListener('click', function (event) {
      // Only close if clicking directly on the modal background (not its children)
      if (event.target === audioModal) {
        closeAudioModal();
      }
    });
  }

  // Initialize everything
  function init() {
    injectStyles();
    createAudioPlayerStructure();
    initAudioPlayer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();