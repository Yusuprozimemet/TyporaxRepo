// simplified-speechsetup.js

/**
 * Manages the speech setup modal for configuring OpenAI API key and practice language.
 * Handles modal interactions, settings storage, and API communication.
 */
class SpeechSetup {
    constructor() {
      // Default configuration
      this.selectedLanguage = 'nl-NL'; // Default to Dutch
      this.modalId = 'speech-modal';
  
      // DOM elements
      this.elements = {
        speechSetupButton: document.getElementById('speech-setup'),
        modal: null, // Will be created
      };
  
      // Bind methods
      this.openModal = this.openModal.bind(this);
      this.closeModal = this.closeModal.bind(this);
      this.saveSettings = this.saveSettings.bind(this);
      this.handleOutsideClick = this.handleOutsideClick.bind(this);
  
      // Initialize
      this.init();
    }
  
    /**
     * Initializes the modal and event listeners.
     */
    init() {
      this.createModal();
      this.appendStyles();
      this.initializeEvents();
    }
  
    /**
     * Creates and appends the modal HTML to the document body.
     */
    createModal() {
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.id = this.modalId;
      modal.innerHTML = `
        <div class="modal-content">
          <span class="close">&times;</span>
          <h2>Speech Setup</h2>
          <h3>Enter your OpenAI API key (charges apply per OpenAI regulations)</h3>
          
          <div class="form-group">
            <label for="openai-api-key">OpenAI API Key:</label>
            <input
              type="password"
              id="openai-api-key"
              placeholder="Enter your OpenAI API key"
              autocomplete="off"
            >
          </div>
          
          <div class="form-group">
            <label for="language-select">Practice Language:</label>
            <select id="language-select">
              <option value="nl-NL">Dutch</option>
              <option value="en-US">English (US)</option>
            </select>
          </div>
          
          <button id="save-settings">Save Settings</button>
        </div>
      `;
      document.body.appendChild(modal);
      this.elements.modal = modal;
    }
  
    /**
     * Appends CSS styles to the document head.
     */
    appendStyles() {
      const style = document.createElement('style');
      style.textContent = `
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
          background-color: var(--menu-bg, #ffffff);
          color: var(--text-color, #333333);
          margin: 10% auto;
          padding: 20px;
          border-radius: 6px;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
          border: 1px solid var(--menu-border, #e1e4e8);
        }
  
        .close {
          color: var(--menu-item-color, #6a737d);
          float: right;
          font-size: 24px;
          font-weight: bold;
          cursor: pointer;
        }
  
        .close:hover {
          color: var(--menu-item-hover-color, #24292e);
        }
  
        .form-group {
          margin-bottom: 15px;
        }
  
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }
  
        .form-group input,
        .form-group select {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid var(--search-input-border, #d1d5da);
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
        }
  
        button {
          background-color: #4CAF50;
          color: #ffffff;
          padding: 8px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s;
        }
  
        button:hover {
          background-color: #45a049;
        }
  
        h2 {
          margin: 0 0 15px;
          font-size: 20px;
        }
  
        [data-theme="dark"] .modal-content {
          background-color: var(--editor-bg, #252932);
          color: var(--text-color, #c6cdd4);
        }
  
        [data-theme="dark"] .form-group input,
        [data-theme="dark"] .form-group select {
          background-color: var(--search-input-bg, #2d333b);
          border-color: var(--search-input-border, #373e47);
          color: var(--text-color, #c6cdd4);
        }
      `;
      document.head.appendChild(style);
    }
  
    /**
     * Initializes event listeners for modal interactions.
     */
    initializeEvents() {
      this.elements.speechSetupButton.addEventListener('click', this.openModal);
      this.elements.modal.querySelector('.close').addEventListener('click', this.closeModal);
      this.elements.modal.querySelector('#save-settings').addEventListener('click', this.saveSettings);
      window.addEventListener('click', this.handleOutsideClick);
    }
  
    /**
     * Opens the modal and populates saved settings.
     */
    openModal() {
      this.elements.modal.style.display = 'block';
  
      // Populate saved settings
      const savedApiKey = localStorage.getItem('openai_api_key');
      if (savedApiKey) {
        this.elements.modal.querySelector('#openai-api-key').value = savedApiKey;
      }
  
      const savedLanguage = localStorage.getItem('practice_language');
      if (savedLanguage) {
        this.elements.modal.querySelector('#language-select').value = savedLanguage;
      }
    }
  
    /**
     * Closes the modal.
     */
    closeModal() {
      this.elements.modal.style.display = 'none';
    }
  
    /**
     * Handles clicks outside the modal to close it.
     * @param {Event} event - The click event.
     */
    handleOutsideClick(event) {
      if (event.target === this.elements.modal) {
        this.closeModal();
      }
    }
  
    /**
     * Saves the API key and language settings.
     */
    async saveSettings() {
      const apiKey = this.elements.modal.querySelector('#openai-api-key').value;
      this.selectedLanguage = this.elements.modal.querySelector('#language-select').value;
  
      if (!apiKey) {
        this.showToast('Please enter your OpenAI API key');
        return;
      }
  
      // Save to local storage
      localStorage.setItem('openai_api_key', apiKey);
      localStorage.setItem('practice_language', this.selectedLanguage);
  
      try {
        const response = await fetch('/openai/set_api_key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `api_key=${encodeURIComponent(apiKey)}`,
        });
  
        const data = await response.json();
  
        if (data.error) {
          this.showToast(`Error: ${data.error}`);
        } else {
          this.showToast('Settings saved successfully!');
          this.closeModal();
        }
      } catch (error) {
        console.error('Error saving API key:', error);
        this.showToast('Error saving API key. Please try again.');
      }
    }
  
    /**
     * Displays a toast notification (assumes a showToast function exists).
     * @param {string} message - The message to display.
     */
    showToast(message) {
      // Placeholder for toast notification (implement as needed)
      console.log('Toast:', message);
      // Example: Could integrate with a toast library or custom implementation
      alert(message); // Temporary fallback
    }
  }
  
  /**
   * Initializes the SpeechSetup when the DOM is fully loaded.
   */
  document.addEventListener('DOMContentLoaded', () => {
    new SpeechSetup();
  });