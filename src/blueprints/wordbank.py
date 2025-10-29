from flask import Blueprint, jsonify, request, session
import logging
from .auth import login_required
from ..utils import open_md_file, save_file
from ..gcs_utils import gcs_client

wordbank_bp = Blueprint('wordbank', __name__)


@wordbank_bp.route('/add_word', methods=['POST'])
@login_required
def add_word():
    """Add a word to the user's wordbank.md file."""
    try:
        username = session.get('username')
        if not username:
            logging.error("No user logged in for add_word request")
            return jsonify({'success': False, 'error': 'User not authenticated'}), 401

        data = request.get_json()
        word = data.get('word')
        if not word:
            return jsonify({'success': False, 'error': 'No word provided'}), 400

        # Load existing wordbank content
        content = open_md_file('wordbank.md', username, 'word bank') or ''

        # Append new word
        new_content = content + f"- {word}\n"

        # Save updated content
        try:
            save_file('wordbank.md', new_content, username, 'word bank')
            logging.info(f"Word added to wordbank for user {username}: {word}")
            return jsonify({'success': True}), 200
        except Exception as e:
            logging.error(
                f"Error saving wordbank.md for user {username}: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500
    except Exception as e:
        logging.error(
            f"Error processing add_word request for {username}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@wordbank_bp.route('/')
@login_required
def get_wordbank():
    """Retrieve the content of the user's wordbank_organized.md file."""
    try:
        username = session.get('username')
        if not username:
            logging.error("No user logged in for get_wordbank request")
            return jsonify({'error': 'User not authenticated'}), 401

        content = open_md_file('wordbank_organized.md', username, 'word bank')
        if content is None:
            logging.warning(
                f"Wordbank file not found for user {username}: wordbank_organized.md")
            return jsonify({'error': 'Wordbank file not found'}), 404

        logging.info(f"Wordbank file opened successfully for user {username}")
        return jsonify({'content': content}), 200
    except Exception as e:
        logging.error(
            f"Error processing get_wordbank request for {username}: {str(e)}")
        return jsonify({'error': str(e)}), 500


@wordbank_bp.route('/save_word', methods=['POST'])
@login_required
def save_word():
    """Save a word with Dutch, English, and difficulty to wordbank_saved.md."""
    try:
        username = session.get('username')
        if not username:
            logging.error("No user logged in for save_word request")
            return jsonify({'error': 'User not authenticated'}), 401

        data = request.get_json()
        dutch = data.get('dutch')
        english = data.get('english')
        difficulty = data.get('difficulty')

        if not dutch or not english or not difficulty:
            return jsonify({'error': 'Invalid word data'}), 400

        # Load existing saved wordbank content
        content = open_md_file('wordbank_saved.md',
                               username, 'word bank') or ''

        # Append new word entry
        new_entry = f"- **{dutch}** {difficulty} *{english}*\n"
        new_content = content + new_entry

        # Save updated content
        try:
            save_file('wordbank_saved.md', new_content, username, 'word bank')
            logging.info(
                f"Word '{dutch}' saved successfully for user {username}")
            return jsonify({'message': 'Word saved successfully'}), 200
        except Exception as e:
            logging.error(
                f"Error saving wordbank_saved.md for user {username}: {str(e)}")
            return jsonify({'error': str(e)}), 500
    except Exception as e:
        logging.error(
            f"Error processing save_word request for {username}: {str(e)}")
        return jsonify({'error': str(e)}), 500


@wordbank_bp.route('/saved')
@login_required
def get_saved_wordbank():
    """Retrieve the content of the user's wordbank_saved.md file."""
    try:
        username = session.get('username')
        if not username:
            logging.error("No user logged in for get_saved_wordbank request")
            return jsonify({'error': 'User not authenticated'}), 401

        content = open_md_file('wordbank_saved.md', username, 'word bank')
        if content is None:
            logging.warning(
                f"Saved wordbank file not found for user {username}: wordbank_saved.md")
            return jsonify({'error': 'Saved wordbank file not found'}), 404

        logging.info(
            f"Saved wordbank file opened successfully for user {username}")
        return jsonify({'content': content}), 200
    except Exception as e:
        logging.error(
            f"Error processing get_saved_wordbank request for {username}: {str(e)}")
        return jsonify({'error': str(e)}), 500
