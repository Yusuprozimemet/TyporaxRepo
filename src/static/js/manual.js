// This script handles the manual modal functionality

// Function to open the manual modal
function openManual() {
    // Create modal container if it doesn't exist
    let modalContainer = document.getElementById('manual-modal-container');

    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'manual-modal-container';
        modalContainer.className = 'modal-container';
        document.body.appendChild(modalContainer);

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';

        // Add close button
        const closeButton = document.createElement('span');
        closeButton.className = 'modal-close';
        closeButton.innerHTML = '&times;';
        closeButton.onclick = closeManual;

        // Create the manual content
        const manualContent = document.createElement('div');
        manualContent.className = 'manual-content';

        // Add manual content sections
        manualContent.innerHTML = `
            <h2>
                This app is currently in the development phase.
                If you have any questions, please feel free to contact the developer at typorax@gmail.com.
            </h2>
            <h1>Application User Manual</h1>

            <section class="manual-section">
                <h2>Toggle Editor and Preview Modes 📝 / 👁️</h2>
                <p>
                    You can easily switch between editing your content and viewing a nicely formatted preview:
                </p>
                <ul>
                    <li>
                        <span class="icon">📝</span>
                        <strong>Editor Mode:</strong> Click the <span class="icon">📝</span> icon to enter Editor mode. This allows you to write, edit, or update your content directly.
                    </li>
                    <li>
                        <span class="icon">👁️</span>
                        <strong>Preview Mode:</strong> Click the <span class="icon">👁️</span> icon to switch to Preview mode. This lets you see a clean, nicely formatted version of your content—just like your users will!
                    </li>
                </ul>
                <p>
                    Toggle between these modes anytime to ensure your work looks just the way you want.
                </p>
            </section>

            <section class="manual-section">
                <h2>Keyboard Shortcuts Magic ✨</h2>
                <p>
                    Ready to conjure up some file management magic? Here's a spellbook of keyboard shortcuts that will turn your typing into an effortless dance:
                </p>
                
                <ul class="shortcut-list">
                    <li><strong>Create a New File</strong>: Press <kbd>Ctrl</kbd> + <kbd>Q</kbd>  
                    <span class="magic-text">✨ <strong>Voila!</strong> A new blank canvas appears!</span></li>
                    
                    <li><strong>Save Your Work</strong>: Hit <kbd>Ctrl</kbd> + <kbd>S</kbd>  
                    <span class="magic-text">💾 <strong>Saved!</strong> Your masterpiece is now safely stored.</span></li>
                    
                    <li><strong>Delete a File</strong>: Simply press <kbd>Ctrl</kbd> + <kbd>D</kbd>  
                    <span class="magic-text">🚮 <strong>Gone!</strong> The unwanted file disappears into the void.</span></li>
                    
                    <li><strong>Open an Existing File</strong>: Press <kbd>Ctrl</kbd> + <kbd>O</kbd>  
                    <span class="magic-text">📂 <strong>Unveiled!</strong> Your document is now open and ready.</span></li>
                    
                    <li><strong>Rename a File</strong>: Tap <kbd>Ctrl</kbd> + <kbd>R</kbd>  
                    <span class="magic-text">📝 <strong>Revised!</strong> Time for a new name.</span></li>
                    
                    <li><strong>Copy a File</strong>: Use <kbd>Ctrl</kbd> + <kbd>X</kbd>  
                    <span class="magic-text">📋 <strong>Copied!</strong> The file is now in your clipboard (cut version).</span></li>
                    
                    <li><strong>Copy Text</strong>: Just <kbd>Ctrl</kbd> + <kbd>C</kbd>  
                    <span class="magic-text">📋 <strong>Copied!</strong> The text is ready to be pasted.</span></li>
                    
                    <li><strong>Paste Text</strong>: Hit <kbd>Ctrl</kbd> + <kbd>V</kbd>  
                    <span class="magic-text">🖋️ <strong>Pasted!</strong> Your text magically appears where you want it.</span></li>
                </ul>
            </section>

            <section class="manual-section">
                <h2>Word Management</h2>
                <h3>Word Banks</h3>
                <ul>
                    <li><strong>wordbank.md</strong>: Your repository for all new words.</li>
                    <li><strong>wordbank_organized.md</strong>: A structured word list used for the practice session.</li>
                    <li><strong>wordbank_saved.md</strong>: A collection of difficult words saved during the practice session.</li>
                </ul>

                <h3>Features</h3>
                <ul>
                    <li><strong><i class="fas fa-bookmark"></i> New</strong>: Add new words to the wordbank.md file.</li>
                    <li><strong>Organization</strong>: Manually organize your words or use AI assistance to save them in wordbank_organized.md.</li>
                    <li><strong>Save Difficult Words</strong>: Click the <i class="fas fa-bookmark"></i> during the practice session to add challenging words to wordbank_saved.md. You can also manually organize the content of this file.</li>
                    <li><strong>Practice Activities</strong>: Engage in <i class="fas fa-puzzle-piece"></i> Matching, <i class="fas fa-pencil-alt"></i> Fill Blanks, and <i class="fas fa-sort-alpha-down"></i> Word Order exercises using your wordbank_saved.md file.</li>
                </ul>
            </section>
            `;


        // Assemble modal
        modalContent.appendChild(closeButton);
        modalContent.appendChild(manualContent);
        modalContainer.appendChild(modalContent);

        // Add CSS for modal that respects the theme variables
        const modalStyle = document.createElement('style');
        modalStyle.textContent = `
            .modal-container {
                display: none;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                overflow: auto;
                background-color: rgba(0, 0, 0, 0.5);
                animation: fadeIn 0.3s;
            }
            
            .modal-content {
                position: relative;
                background-color: var(--modal-bg);
                color: var(--text-color);
                margin: 5% auto;
                padding: 20px;
                border-radius: 10px;
                border: 1px solid var(--modal-border);
                box-shadow: 0 5px 15px var(--header-shadow);
                width: 80%;
                max-width: 800px;
                max-height: 85vh;
                overflow-y: auto;
                animation: slideIn 0.4s;
                font-family: 'Poppins', sans-serif;
            }
            
            .modal-close {
                color: var(--menu-item-color);
                float: right;
                font-size: 28px;
                font-weight: bold;
                cursor: pointer;
                transition: color 0.2s;
            }
            
            .modal-close:hover {
                color: var(--menu-item-hover-color);
            }
            
            .manual-content {
                padding: 10px;
                color: var(--text-color);
            }
            
            .manual-content h1 {
                color: var(--fancy-button-text);
                text-align: center;
                margin-bottom: 30px;
                font-size: 2em;
                font-weight: 600;
            }
            
            .manual-section {
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 1px solid var(--file-item-border);
            }
            
            .manual-section h2 {
                color: var(--fancy-button-text);
                margin-bottom: 15px;
                font-size: 1.5em;
                font-weight: 500;
            }
            
            .manual-section h3 {
                color: var(--fancy-button-text);
                margin: 20px 0 10px;
                font-size: 1.2em;
                font-weight: 500;
            }
            
            .shortcut-list li, .format-list li {
                margin-bottom: 15px;
                line-height: 1.5;
            }
            
            kbd {
                background-color: var(--button-bg);
                border: 1px solid var(--search-input-border);
                border-radius: 3px;
                box-shadow: 0 1px 0 rgba(0,0,0,0.1);
                color: var(--fancy-button-text);
                display: inline-block;
                font-size: 0.85em;
                font-family: monospace;
                line-height: 1;
                padding: 2px 5px;
                margin: 0 2px;
            }
            
            .magic-text {
                display: block;
                margin-left: 20px;
                margin-top: 5px;
                color: var(--switch-active);
            }
            
            code {
                background: var(--button-bg);
                padding: 2px 4px;
                border-radius: 3px;
                font-family: monospace;
                color: var(--fancy-button-text);
            }
            
            .manual-content ul {
                padding-left: 20px;
            }
            
            .manual-content li {
                margin-bottom: 8px;
            }
            
            /* Modal animations */
            @keyframes fadeIn {
                from {opacity: 0;}
                to {opacity: 1;}
            }
            
            @keyframes slideIn {
                from {transform: translateY(-50px); opacity: 0;}
                to {transform: translateY(0); opacity: 1;}
            }
            
            /* Ensure the modal follows the dark/light theme */
            .modal-container {
                -ms-overflow-style: none;
                scrollbar-width: none;
            }
            
            .modal-container::-webkit-scrollbar {
                display: none;
            }
            
            .modal-content {
                -ms-overflow-style: none;
                scrollbar-width: none;
            }
            
            .modal-content::-webkit-scrollbar {
                display: none;
            }
        `;
        document.head.appendChild(modalStyle);
    }

    // Show the modal
    modalContainer.style.display = 'block';

    // Add event listener to close when clicking outside the modal
    window.onclick = function (event) {
        if (event.target == modalContainer) {
            closeManual();
        }
    };

    // Add escape key to close modal
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            closeManual();
        }
    });
}

// Function to close the manual modal
function closeManual() {
    const modalContainer = document.getElementById('manual-modal-container');
    if (modalContainer) {
        modalContainer.style.display = 'none';
    }
}

// Ensure the button is properly connected to the openManual function
document.addEventListener('DOMContentLoaded', function () {
    const manualButton = document.querySelector('.manual');
    if (manualButton) {
        manualButton.onclick = openManual;
    }
});