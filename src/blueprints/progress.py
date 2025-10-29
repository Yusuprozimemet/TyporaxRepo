from flask import Blueprint, jsonify, request, session
import json
import logging
import random
import re
import difflib
from .auth import login_required
from ..utils import get_user_artifacts_dir, open_md_file, save_file
from ..gcs_utils import gcs_client

progress_bp = Blueprint('progress', __name__)


def get_progress_file(username):
    """Helper function to get the progress file path for a specific user."""
    return f"learning_progress.json"


def load_progress(username):
    """Loads learning progress from the JSON file for a specific user."""
    try:
        content = open_md_file(get_progress_file(username), username, '')
        if content is None:
            logging.warning(
                f"Progress file not found for user {username}. Returning empty progress.")
            return {}
        return json.loads(content)
    except json.JSONDecodeError:
        logging.error(
            f"Error decoding JSON from progress file for user {username}.")
        return {}
    except Exception as e:
        logging.error(f"Error loading progress for user {username}: {str(e)}")
        return {}


def save_progress(username, progress_data):
    """Saves learning progress to the JSON file for a specific user."""
    try:
        save_file(get_progress_file(username), json.dumps(
            progress_data, indent=4), username, '')
        logging.info(
            f"Learning progress saved successfully for user {username}.")
    except Exception as e:
        logging.error(
            f"Error saving learning progress for user {username}: {str(e)}")
        raise


@progress_bp.route('/<folder>/<lesson_name>', methods=['GET'])
@login_required
def get_lesson_progress(folder, lesson_name):
    """Retrieve progress for a specific lesson."""
    username = session.get('username')
    if not username:
        logging.error("No username found in session")
        return jsonify({'error': 'User not authenticated'}), 401
    try:
        progress = load_progress(username)
        # Store progress with folder prefix
        lesson_key = f"{folder}/{lesson_name}"
        lesson_progress = progress.get(lesson_key, {'tests': []})
        logging.debug(
            f"Retrieved progress for lesson '{lesson_key}' for user {username}.")
        return jsonify(lesson_progress)
    except Exception as e:
        logging.error(
            f"Error retrieving progress for lesson '{lesson_key}' for user {username}: {str(e)}")
        return jsonify({'error': str(e)}), 500


@progress_bp.route('/all', methods=['GET'])
@login_required
def get_all_progress():
    """Retrieve all progress for the user."""
    username = session.get('username')
    if not username:
        logging.error("No username found in session")
        return jsonify({'error': 'User not authenticated'}), 401
    try:
        progress = load_progress(username)
        logging.debug(f"Retrieved all progress for user {username}.")
        return jsonify(progress)
    except Exception as e:
        logging.error(
            f"Error retrieving all progress for user {username}: {str(e)}")
        return jsonify({'error': str(e)}), 500


@progress_bp.route('/<folder>/<lesson_name>', methods=['POST'])
@login_required
def save_lesson_progress(folder, lesson_name):
    """Save progress for a specific lesson."""
    username = session.get('username')
    if not username:
        logging.error("No username found in session")
        return jsonify({'error': 'User not authenticated'}), 401
    data = request.get_json()
    if not data or 'test' not in data:
        return jsonify({'error': 'No test data provided'}), 400

    try:
        progress = load_progress(username)
        # Store progress with folder prefix
        lesson_key = f"{folder}/{lesson_name}"
        if lesson_key not in progress:
            progress[lesson_key] = {'tests': []}

        progress[lesson_key]['tests'].append(data['test'])
        save_progress(username, progress)
        logging.info(
            f"Test result saved for lesson '{lesson_key}' for user {username}.")
        return jsonify({'message': f'Test result saved for lesson {lesson_name}'}), 200
    except Exception as e:
        logging.error(
            f"Error saving lesson progress for lesson '{lesson_key}' for user {username}: {str(e)}")
        return jsonify({'error': str(e)}), 500


def evaluate_answer(user_answer, correct_answer):
    """Evaluate an answer with partial scoring based on word correctness and order."""
    if not user_answer:
        return 0, "No answer provided"

    # Handle exact match case
    if user_answer.lower() == correct_answer.lower():
        return 10, "Perfect!"

    # Clean up answers for comparison
    user_words = re.findall(r'\b\w+\b', user_answer.lower())
    correct_words = re.findall(r'\b\w+\b', correct_answer.lower())

    # Count correctly spelled words that appear in the answer
    correct_word_count = 0
    feedback_details = []

    # Check which words are present in the answer
    for word in correct_words:
        if word in user_words:
            correct_word_count += 1
            user_words.remove(word)  # Remove to prevent double counting
        else:
            # Look for close matches to catch spelling errors
            close_matches = difflib.get_close_matches(
                word, user_words, n=1, cutoff=0.8)
            if close_matches:
                correct_word_count += 0.5  # Partial credit for close matches
                feedback_details.append(
                    f"'{close_matches[0]}' should be '{word}'")
                # Remove to prevent double counting
                user_words.remove(close_matches[0])
            else:
                feedback_details.append(f"Missing word: '{word}'")

    # Check for extra words in user answer
    for word in user_words:
        feedback_details.append(f"Extra word: '{word}'")

    # Calculate score based on word accuracy (max 8 points)
    word_score = min(8, round((correct_word_count / len(correct_words)) * 8))

    # Check word order using sequence matcher (max 2 points)
    order_score = 0
    if word_score > 0:
        seq_matcher = difflib.SequenceMatcher(None,
                                              user_answer.lower(),
                                              correct_answer.lower())
        ratio = seq_matcher.ratio()
        order_score = round(ratio * 2)  # Up to 2 points for correct order

    total_score = word_score + order_score

    # Generate feedback
    if total_score >= 9:
        feedback = "Almost perfect! Minor issues with spelling or word order."
    elif total_score >= 7:
        feedback = "Good attempt! Most words correct but some issues."
    elif total_score >= 5:
        feedback = "Partial credit. Some correct words but needs improvement."
    elif total_score > 0:
        feedback = "Few correct words but significant errors."
    else:
        feedback = "Completely incorrect answer."

    # Add specific feedback if available
    if feedback_details:
        # Limit to 3 specific issues
        feedback += " " + " ".join(feedback_details[:3])
        if len(feedback_details) > 3:
            feedback += " and other issues."

    return total_score, feedback


@progress_bp.route('/evaluate_test/<folder>/<lesson_name>', methods=['POST'])
@login_required
def evaluate_test(folder, lesson_name):
    """Evaluate a submitted test and return scores and feedback."""
    username = session.get('username')
    if not username:
        logging.error("No username found in session")
        return jsonify({'error': 'User not authenticated'}), 401

    data = request.get_json()
    if not data or 'test' not in data:
        return jsonify({'error': 'No test data provided'}), 400

    try:
        test_data = data['test']
        total_points = 0
        total_possible = 0

        # Evaluate each answer
        for question in test_data['questions']:
            user_answer = question.get('user_answer', '')
            correct_answer = question.get('dutch', '')
            max_points = question.get('max_points', 10)

            # Evaluate the answer to get points and feedback
            points, feedback = evaluate_answer(user_answer, correct_answer)

            # Update question with evaluation results
            question['points'] = points
            question['feedback'] = feedback
            question['max_points'] = max_points

            total_points += points
            total_possible += max_points

        # Calculate overall score as percentage
        test_data['score'] = round(
            (total_points / total_possible) * 100) if total_possible > 0 else 0
        test_data['total_points'] = total_possible

        logging.info(
            f"Test evaluated for user {username}, lesson '{lesson_name}': Score {test_data['score']}%")
        return jsonify(test_data)
    except Exception as e:
        logging.error(
            f"Error evaluating test for lesson '{lesson_name}' for user {username}: {str(e)}")
        return jsonify({'error': str(e)}), 500


@progress_bp.route('/generate_test/<folder>/<lesson_name>', methods=['GET'])
@login_required
def generate_test(folder, lesson_name):
    """Generate a test with sentences from a lesson file."""
    username = session.get('username')
    if not username:
        logging.error("No username found in session")
        return jsonify({'error': 'User not authenticated'}), 401

    logging.info(
        f"Generating test for user: {username}, folder: {folder}, lesson: {lesson_name}")
    try:
        lesson_content = open_md_file(lesson_name, username, folder)
        if lesson_content is None:
            logging.error(
                f"Lesson file '{lesson_name}' not found in folder '{folder}' for user {username}")
            return jsonify({'error': 'Lesson file not found'}), 404

        sentences = []
        table_section = re.search(
            r'\| Dutch \| English \|\n\|[-| ]+\|[-| ]+\|\n(.*?)(?=\n\n|\Z)', lesson_content, re.DOTALL)
        if not table_section:
            logging.error(
                f"No valid table found in lesson file '{lesson_name}'")
            return jsonify({'questions': []}), 200

        logging.info(f"Table section found:\n{table_section.group(1)}")
        table_rows = table_section.group(1).strip().split('\n')
        logging.info(f"Found {len(table_rows)} table rows")

        for row in table_rows:
            columns = [col.strip() for col in row.split('|')[1:3]]
            if len(columns) != 2:
                logging.warning(f"Invalid row format: {row}")
                continue
            dutch, english = columns
            dutch_sentences = [s.strip()
                               for s in re.split(r'[.!?]+', dutch) if s.strip()]
            english_sentences = [s.strip() for s in re.split(
                r'[.!?]+', english) if s.strip()]
            for i in range(min(len(dutch_sentences), len(english_sentences))):
                sentences.append(
                    {'dutch': dutch_sentences[i], 'english': english_sentences[i]})

        logging.info(f"Extracted {len(sentences)} sentence pairs")

        if len(sentences) > 10:
            selected_sentences = random.sample(sentences, 10)
        else:
            selected_sentences = sentences

        test_data = {'questions': selected_sentences}
        logging.info(
            f"Generated test with {len(selected_sentences)} sentences for lesson '{lesson_name}'")
        return jsonify(test_data)
    except Exception as e:
        logging.error(
            f"Error generating test for lesson '{lesson_name}' in folder '{folder}': {str(e)}")
        return jsonify({'error': 'Failed to generate test'}), 500
