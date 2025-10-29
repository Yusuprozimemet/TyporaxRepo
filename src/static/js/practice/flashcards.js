$(document).ready(function () {
    renderFlashcards();
    // Bind navigation, delete, and download buttons
    $('#flashcardList').on('click', '.flip-btn', flipCard);
    $('#flashcardList').on('click', '.delete-btn', deleteCard);
    $('#flashcardList').on('click', '.download-btn', downloadFlashcards);
    $('#prevCard').click(prevCard);
    $('#nextCard').click(nextCard);
});

let currentCardIndex = 0;
let isDutchSide = true;

function renderFlashcards() {
    const flashcards = JSON.parse(localStorage.getItem('flashcards') || '[]');
    const $flashcardList = $('#flashcardList');
    $flashcardList.empty();

    if (flashcards.length === 0) {
        $flashcardList.append('<p class="text-muted">No flashcards available. Add some from the Sentences tab!</p>');
        $('#prevCard').prop('disabled', true);
        $('#nextCard').prop('disabled', true);
        return;
    }

    // Enable navigation buttons based on number of cards
    $('#prevCard').prop('disabled', flashcards.length <= 1);
    $('#nextCard').prop('disabled', flashcards.length <= 1);

    // Show the current card
    currentCardIndex = Math.min(currentCardIndex, flashcards.length - 1);
    const card = flashcards[currentCardIndex];
    isDutchSide = true; // Start with Dutch side

    const cardHtml = `
        <div class="mb-3">
            <button class="btn btn-sm btn-success download-btn">
                <i class="fas fa-download"></i> Download Flashcards
            </button>
        </div>
        <div class="card flashcard-card" data-index="${currentCardIndex}">
            <div class="card-body">
                <h5 class="card-title">${isDutchSide ? 'Dutch' : 'English'}</h5>
                <p class="card-text flashcard-text">${isDutchSide ? card.dutch : card.english}</p>
                <small class="text-muted">Added: ${new Date(card.added).toLocaleString()}</small><br>
                <small class="text-muted">File: ${card.file}, Folder: ${card.folder || 'Root'}</small>
            </div>
            <div class="card-footer d-flex justify-content-between">
                <button class="btn btn-sm btn-primary flip-btn">
                    <i class="fas fa-sync-alt"></i> Flip Card
                </button>
                <button class="btn btn-sm btn-danger delete-btn">
                    <i class="fas fa-trash-alt"></i> Delete
                </button>
            </div>
        </div>
        <div class="mt-3 d-flex justify-content-between">
            <button id="prevCard" class="btn btn-secondary" ${currentCardIndex === 0 ? 'disabled' : ''}>
                <i class="fas fa-arrow-left"></i> Previous
            </button>
            <button id="nextCard" class="btn btn-secondary" ${currentCardIndex === flashcards.length - 1 ? 'disabled' : ''}>
                <i class="fas fa-arrow-right"></i> Next
            </button>
        </div>
    `;
    $flashcardList.append(cardHtml);
}

function flipCard() {
    const flashcards = JSON.parse(localStorage.getItem('flashcards') || '[]');
    if (flashcards.length === 0) return;

    const card = flashcards[currentCardIndex];
    isDutchSide = !isDutchSide;

    const $card = $(`.flashcard-card[data-index="${currentCardIndex}"]`);
    $card.find('.card-title').text(isDutchSide ? 'Dutch' : 'English');
    $card.find('.flashcard-text').text(isDutchSide ? card.dutch : card.english);
}

function deleteCard() {
    if (!confirm('Are you sure you want to delete this flashcard?')) return;

    const flashcards = JSON.parse(localStorage.getItem('flashcards') || '[]');
    if (flashcards.length === 0) return;

    // Remove the card at current index
    flashcards.splice(currentCardIndex, 1);
    localStorage.setItem('flashcards', JSON.stringify(flashcards));

    // Adjust index if necessary
    if (currentCardIndex >= flashcards.length && flashcards.length > 0) {
        currentCardIndex--;
    }

    renderFlashcards();
}

function downloadFlashcards() {
    const flashcards = JSON.parse(localStorage.getItem('flashcards') || '[]');
    if (flashcards.length === 0) {
        alert('No flashcards to download!');
        return;
    }

    // Create JSON string
    const jsonString = JSON.stringify(flashcards, null, 2);
    
    // Create a Blob with the JSON data
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Create a temporary URL for the Blob
    const url = URL.createObjectURL(blob);
    
    // Create a temporary anchor element to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flashcards.json';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function prevCard() {
    if (currentCardIndex > 0) {
        currentCardIndex--;
        renderFlashcards();
    }
}

function nextCard() {
    const flashcards = JSON.parse(localStorage.getItem('flashcards') || '[]');
    if (currentCardIndex < flashcards.length - 1) {
        currentCardIndex++;
        renderFlashcards();
    }
}