from flask import Blueprint, jsonify, current_app
import logging
from src.utils import open_md_file

dailyword_bp = Blueprint('dailyword', __name__)


@dailyword_bp.route('/get_all_words')
def get_all_words():
    try:
        # Read wordbank_saved.md using open_md_file (supports both local and GCS)
        content = open_md_file('wordbank_saved.md', '', 'word bank')
        if content is None:
            logging.warning("Wordbank file not found: wordbank_saved.md")
            return jsonify({'error': 'Wordbank file not found'}), 404

        # Split content into lines
        lines = content.splitlines()

        # Filter out empty lines
        words = [line.strip() for line in lines if line.strip()]

        if not words:
            logging.warning("No words found in wordbank_saved.md")
            return jsonify({'error': 'No words in wordbank'}), 404

        # Parse each word
        word_list = []
        for word in words:
            try:
                # Extract Dutch word (between ** and **)
                dutch = word.split('**')[1]

                # Extract English (between * and * or * and ; or empty)
                english_part = word.split('*')[1] if '*' in word else ''
                if ';' in english_part:
                    english = english_part.split(';')[0].strip()
                elif english_part:
                    english = english_part.strip()
                else:
                    english = ''

                word_list.append({
                    'dutch': dutch,
                    'english': english
                })
            except (IndexError, ValueError):
                logging.warning(f"Skipping invalid word format: {word}")
                continue

        if not word_list:
            logging.warning("No valid words parsed from wordbank_saved.md")
            return jsonify({'error': 'No valid words in wordbank'}), 404

        logging.info(f"Fetched {len(word_list)} words from wordbank")
        return jsonify({'words': word_list})

    except Exception as e:
        logging.error(f"Error processing get_all_words request: {str(e)}")
        return jsonify({'error': str(e)}), 500
