document.addEventListener('DOMContentLoaded', function () {
    fetchAllWords();

    function fetchAllWords() {
        fetch('/dailyword/get_all_words', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`HTTP ${response.status}: ${text}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    console.error('Error fetching words:', data.error);
                    return;
                }

                const words = data.words;
                if (!words || words.length === 0) {
                    console.error('No words available');
                    return;
                }

                // Create daily word element
                let currentIndex = 0;
                const dailyWordDiv = document.createElement('div');
                dailyWordDiv.className = 'daily-word';

                function updateWord() {
                    const word = words[currentIndex];
                    const englishPart = word.english ? `(${word.english})` : '';
                    dailyWordDiv.innerHTML = `
                    <span class="dutch-word">${word.dutch}</span>
                    <span class="english-word">${englishPart}</span>
                `;
                    currentIndex = (currentIndex + 1) % words.length; // Loop back to start
                }

                // Initial display
                updateWord();

                // Update every 2 seconds
                setInterval(updateWord, 3000);

                // Insert between logo-container and nav-links
                const header = document.querySelector('header');
                const navLinks = document.querySelector('.nav-links');
                header.insertBefore(dailyWordDiv, navLinks);
            })
            .catch(error => {
                console.error('Error fetching words:', error);
            });
    }
});