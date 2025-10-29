from flask import Blueprint, jsonify, request, session
from src.utils import open_md_file, save_file
from .auth import login_required
import logging
import json
from ..gcs_utils import gcs_client

typo_bp = Blueprint('typo', __name__)


@typo_bp.route('/wordbank/save_typo', methods=['POST'])
@login_required
def save_typo():
    """
    Save an incorrectly typed word to typo.json for the logged-in user.
    Expects JSON payload with userAnswer, correctAnswer, english, and timestamp.
    """
    try:
        # Ensure user is logged in
        username = session.get('username')
        if not username:
            logging.error("No user logged in for save_typo request")
            return jsonify({'error': 'User not authenticated'}), 401

        # Get JSON data from request
        data = request.get_json()
        if not data:
            logging.error("No JSON data provided in save_typo request")
            return jsonify({'error': 'No data provided'}), 400

        # Validate required fields
        required_fields = ['userAnswer',
                           'correctAnswer', 'english', 'timestamp']
        if not all(field in data for field in required_fields):
            missing = [field for field in required_fields if field not in data]
            logging.error(f"Missing fields in save_typo request: {missing}")
            return jsonify({'error': f'Missing fields: {missing}'}), 400

        # Prepare typo entry
        typo_entry = {
            'userAnswer': data['userAnswer'],
            'correctAnswer': data['correctAnswer'],
            'english': data['english'],
            'timestamp': data['timestamp']
        }

        # Load existing typos or initialize empty list
        typos = []
        try:
            content = open_md_file('typo.json', username, '')
            if content:
                typos = json.loads(content)
                if not isinstance(typos, list):
                    logging.warning(
                        f"Invalid typo.json format for {username}, resetting to empty list")
                    typos = []
        except json.JSONDecodeError:
            logging.error(
                f"Corrupted typo.json content for {username}, resetting to empty list")
            typos = []
        except Exception as e:
            logging.error(f"Error loading typo.json for {username}: {str(e)}")
            typos = []

        # Append new typo entry
        typos.append(typo_entry)

        # Save updated typos to typo.json
        try:
            save_file('typo.json', json.dumps(typos, indent=4), username, '')
            logging.info(f"Saved typo for user {username}: {typo_entry}")
            return jsonify({'success': True}), 200
        except Exception as e:
            logging.error(f"Error saving typo.json for {username}: {str(e)}")
            return jsonify({'error': 'Failed to save typo'}), 500

    except Exception as e:
        logging.error(
            f"Unexpected error in save_typo for {username}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@typo_bp.route('/wordbank/get_typos', methods=['GET'])
@login_required
def get_typos():
    """
    Fetch the list of typos for the logged-in user from typo.json.
    Returns a JSON array of typo entries.
    """
    try:
        # Ensure user is logged in
        username = session.get('username')
        if not username:
            logging.error("No user logged in for get_typos request")
            return jsonify({'error': 'User not authenticated'}), 401

        # Load typos
        typos = []
        try:
            content = open_md_file('typo.json', username, '')
            if content:
                typos = json.loads(content)
                if not isinstance(typos, list):
                    logging.warning(
                        f"Invalid typo.json format for {username}, returning empty list")
                    typos = []
        except json.JSONDecodeError:
            logging.error(
                f"Corrupted typo.json content for {username}, returning empty list")
            typos = []
        except Exception as e:
            logging.error(f"Error loading typo.json for {username}: {str(e)}")
            typos = []

        # Transform typos into wordbank-compatible format
        typo_words = [
            {
                'dutch': typo['correctAnswer'],
                'english': typo['english'],
                'difficulty': '🟥'  # Default difficulty for typos, adjust if needed
            }
            for typo in typos
        ]

        logging.info(f"Fetched {len(typo_words)} typos for user {username}")
        return jsonify({'typos': typo_words}), 200

    except Exception as e:
        logging.error(
            f"Unexpected error in get_typos for {username}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500
