from flask import Blueprint, render_template, jsonify, request, session
from src.utils import open_md_file, list_md_files, list_user_folders, get_user_folder_dir, save_file
from .auth import login_required
import logging
import re
import json
import random
from ..gcs_utils import gcs_client

practice_bp = Blueprint('practice', __name__)


@practice_bp.route('/')
@login_required
def practice():
    """Render the practice page."""
    logging.debug("Rendering practice page")
    return render_template('practice.html')


@practice_bp.route('/load_text')
@login_required
def load_text():
    """Load and process markdown table from a file in a user folder."""
    username = session.get('username')
    filename = request.args.get('filename')
    folder = request.args.get('folder', '')

    if not filename:
        return jsonify({'error': 'No filename provided'}), 400

    try:
        content = open_md_file(filename, username, folder)
        if content is None:
            return jsonify({'error': f"File '{filename}' not found"}), 404

        # Parse markdown table to extract Target Language and Native Language sentences
        sentences = parse_markdown_table(content)

        # Extract keywords from Target Language sentences
        target_lang_text = ' '.join([s['target_lang'] for s in sentences])
        keywords = extract_keywords(target_lang_text)

        # Structure response
        response = {
            # List of {'target_lang': ..., 'native_lang': ...}
            'sentences': sentences,
            'keywords': keywords,
            'content': content
        }
        logging.info(
            f"Loaded text for practice: {filename} in folder {folder or 'root'} for user {username}")
        return jsonify(response)
    except Exception as e:
        logging.error(
            f"Error loading text {filename} in folder {folder} for user {username}: {str(e)}")
        return jsonify({'error': str(e)}), 500


@practice_bp.route('/highlight_keywords', methods=['POST'])
@login_required
def highlight_keywords():
    """Highlight keywords in the provided Target Language sentence."""
    data = request.get_json()
    sentence = data.get('sentence', '')
    keywords = data.get('keywords', [])

    if not sentence or not keywords:
        return jsonify({'error': 'Sentence and keywords are required'}), 400

    highlighted = sentence
    for keyword in keywords:
        highlighted = re.sub(r'\b' + re.escape(keyword) + r'\b',
                             f'<strong>{keyword}</strong>', highlighted, flags=re.IGNORECASE)

    return jsonify({'highlighted': highlighted})


@practice_bp.route('/cloze_test')
@login_required
def cloze_test():
    """Generate a cloze test for a random Target Language sentence."""
    username = session.get('username')
    filename = request.args.get('filename')
    folder = request.args.get('folder', '')

    if not filename:
        return jsonify({'error': 'No filename provided'}), 400

    try:
        content = open_md_file(filename, username, folder)
        if content is None:
            return jsonify({'error': f"File '{filename}' not found"}), 404

        sentences = parse_markdown_table(content)
        if not sentences:
            return jsonify({'error': 'No sentences found'}), 400

        selected_sentence = random.choice(sentences)
        target_lang_sentence = selected_sentence['target_lang']
        words = target_lang_sentence.split()
        if len(words) < 3:
            return jsonify({'error': 'Sentence too short for cloze test'}), 400

        # Randomly select a word to hide
        hide_index = random.randint(0, len(words) - 1)
        correct_word = words[hide_index]
        words[hide_index] = '_____'
        cloze_sentence = ' '.join(words)

        return jsonify({
            'sentence': cloze_sentence,
            'correct_word': correct_word,
            'original': target_lang_sentence,
            'native_lang': selected_sentence['native_lang']
        })
    except Exception as e:
        logging.error(
            f"Error generating cloze test for user {username}: {str(e)}")
        return jsonify({'error': str(e)}), 500


@practice_bp.route('/progress', methods=['POST'])
@login_required
def save_progress():
    """Save practice progress for a file."""
    username = session.get('username')
    data = request.get_json()
    filename = data.get('filename')
    folder = data.get('folder', '')
    # e.g., {'sentence_1': true, 'sentence_2': false}
    progress = data.get('progress', {})

    if not filename:
        return jsonify({'error': 'No filename provided'}), 400
    if not progress:
        return jsonify({'error': 'No progress data provided'}), 400

    try:
        progress_filename = f"{filename}_progress.json"
        save_file(progress_filename, json.dumps(
            progress, indent=4), username, folder)
        logging.info(
            f"Progress saved for {filename} in folder {folder or 'root'} for user {username}")
        return jsonify({'success': True})
    except Exception as e:
        logging.error(f"Error saving progress for user {username}: {str(e)}")
        return jsonify({'error': str(e)}), 500


@practice_bp.route('/progress')
@login_required
def load_progress():
    """Load practice progress for a file."""
    username = session.get('username')
    filename = request.args.get('filename')
    folder = request.args.get('folder', '')

    if not filename:
        return jsonify({'error': 'No filename provided'}), 400

    try:
        progress_filename = f"{filename}_progress.json"
        content = open_md_file(progress_filename, username, folder)
        if content is None:
            return jsonify({'progress': {}})
        progress = json.loads(content)
        return jsonify({'progress': progress})
    except Exception as e:
        logging.error(f"Error loading progress for user {username}: {str(e)}")
        # Return empty progress instead of 500
        return jsonify({'progress': {}})


def parse_markdown_table(content):
    """Parse markdown table into a list of {'target_lang': ..., 'native_lang': ...} using basic string manipulation."""
    sentences = []
    lines = content.splitlines()
    in_table = False
    header_processed = False

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Detect table start
        if line.startswith('|') and 'Target Language' in line and 'Native Language' in line:
            in_table = True
            header_processed = False
            continue

        # Process table rows
        if in_table and line.startswith('|'):
            if not header_processed and '---' in line:
                header_processed = True
                continue

            # Split row into columns
            columns = [col.strip() for col in line.strip('|').split('|')]
            if len(columns) >= 2:
                target_lang = columns[0]
                native_lang = columns[1]
                # Split into sentences using a simple regex
                target_lang_sentences = re.split(
                    r'(?<=[.!?])\s+', target_lang.strip())
                native_lang_sentences = re.split(
                    r'(?<=[.!?])\s+', native_lang.strip())
                # Pair sentences (handle mismatched lengths)
                max_len = max(len(target_lang_sentences),
                              len(native_lang_sentences))
                target_lang_sentences.extend(
                    [''] * (max_len - len(target_lang_sentences)))
                native_lang_sentences.extend(
                    [''] * (max_len - len(native_lang_sentences)))
                for t, n in zip(target_lang_sentences, native_lang_sentences):
                    if t or n:  # Only include non-empty pairs
                        sentences.append(
                            {'target_lang': t.strip(), 'native_lang': n.strip()})

    if not sentences:
        logging.warning(
            "No valid table or sentences found in markdown content")

    return sentences


def extract_keywords(text):
    """Extract keywords from Target Language text."""
    words = text.split()
    common_keywords = ['Inge', 'Paula', 'Alex', 'Den Haag',
                       'Rotterdam', 'Frankrijk', 'China', 'Marktstraat']
    keywords = [
        word for word in words if word in common_keywords or word.istitle()]
    return list(set(keywords))  # Remove duplicates


@practice_bp.route('/vocabulary', methods=['POST'])
@login_required
def vocabulary():
    """Provide definitions and examples for selected words (placeholder)."""
    data = request.get_json()
    word = data.get('word', '')
    if not word:
        return jsonify({'error': 'No word provided'}), 400
    return jsonify({
        'word': word,
        'definition': f"Definition of {word} (placeholder)",
        'example': f"Example sentence with {word} (placeholder)"
    })


@practice_bp.route('/translate', methods=['POST'])
@login_required
def translate():
    """Return Native Language translation for a Target Language sentence."""
    data = request.get_json()
    sentence = data.get('sentence', '')
    username = session.get('username')
    filename = data.get('filename')
    folder = data.get('folder', '')

    if not sentence or not filename:
        return jsonify({'error': 'Sentence and filename are required'}), 400

    try:
        content = open_md_file(filename, username, folder)
        if content is None:
            return jsonify({'error': f"File '{filename}' not found"}), 404
        sentences = parse_markdown_table(content)
        for s in sentences:
            if s['target_lang'] == sentence:
                return jsonify({
                    'sentence': sentence,
                    'translation': s['native_lang']
                })
        return jsonify({'error': 'Sentence not found'}), 404
    except Exception as e:
        logging.error(
            f"Error translating sentence for user {username}: {str(e)}")
        return jsonify({'error': str(e)}), 500


@practice_bp.route('/quiz', methods=['GET'])
@login_required
def quiz():
    """Generate a multiple-choice quiz question (placeholder)."""
    username = session.get('username')
    filename = request.args.get('filename')
    folder = request.args.get('folder', '')

    if not filename:
        return jsonify({'error': 'No filename provided'}), 400

    try:
        content = open_md_file(filename, username, folder)
        if content is None:
            return jsonify({'error': f"File '{filename}' not found"}), 404
        sentences = parse_markdown_table(content)
        if not sentences:
            return jsonify({'error': 'No sentences found'}), 400

        # Select a random sentence
        selected = random.choice(sentences)
        question = selected['target_lang']
        correct_answer = selected['native_lang']

        # Generate distractors (placeholder: use other Native Language translations)
        distractors = [s['native_lang'] for s in random.sample(
            sentences, min(3, len(sentences))) if s['native_lang'] != correct_answer]
        while len(distractors) < 3:
            distractors.append("Incorrect option")
        distractors = distractors[:3]

        # Shuffle answers
        answers = [correct_answer] + distractors
        random.shuffle(answers)

        return jsonify({
            'question': question,
            'answers': answers,
            'correct_answer': correct_answer
        })
    except Exception as e:
        logging.error(f"Error generating quiz for user {username}: {str(e)}")
        return jsonify({'error': str(e)}), 500


@practice_bp.route('/folders')
@login_required
def list_folders():
    """List available folders for the user."""
    username = session.get('username')
    try:
        folders = list_user_folders(username)
        logging.info(f"Listed folders for user {username}: {folders}")
        return jsonify(folders)
    except Exception as e:
        logging.error(f"Error listing folders for user {username}: {str(e)}")
        return jsonify({'error': str(e)}), 500


@practice_bp.route('/files')
@login_required
def list_files():
    """List markdown files in the specified folder."""
    username = session.get('username')
    folder = request.args.get('folder', '')
    try:
        files = list_md_files(username, folder)
        logging.info(
            f"Listed files in folder {folder or 'root'} for user {username}: {files}")
        return jsonify(files)
    except Exception as e:
        logging.error(f"Error listing files for user {username}: {str(e)}")
        return jsonify({'error': str(e)}), 500


@practice_bp.route('/save_text', methods=['POST'])
@login_required
def save_text():
    """Save text content as a markdown file in the user's practice folder."""
    username = session.get('username')
    data = request.get_json()
    content = data.get('content', '')
    filename = data.get('filename', '')
    folder = data.get('folder', '')

    # Validate inputs
    if not content or not filename:
        logging.error(f"Missing content or filename for user {username}")
        return jsonify({'error': 'Content and filename are required'}), 400

    # Sanitize filename to prevent path traversal and ensure .md extension
    filename = re.sub(r'[^\w\-]', '', filename)
    if not filename.endswith('.md'):
        filename += '.md'

    try:
        save_file(filename, content, username, folder)
        logging.info(
            f"Saved markdown file {filename} in folder {folder or 'root'} for user {username}")
        return jsonify({'success': True, 'filename': filename})
    except Exception as e:
        logging.error(
            f"Error saving markdown file for user {username}: {str(e)}")
        return jsonify({'error': str(e)}), 500
