import os
from flask import Blueprint, request, jsonify, session, current_app
from openai import OpenAI
from pydub import AudioSegment

openai_bp = Blueprint('openai', __name__)


@openai_bp.route('/set_api_key', methods=['POST'])
def set_api_key():
    api_key = request.form.get('api_key')
    if not api_key:
        return jsonify({'error': 'API key is required'}), 400

    # Save the API key in the session
    session['OPENAI_API_KEY'] = api_key
    return jsonify({'message': 'API key saved successfully'}), 200


@openai_bp.route('/transcribe', methods=['POST'])
def transcribe_audio():
    # Retrieve the API key from the session
    api_key = session.get('OPENAI_API_KEY')
    if not api_key:
        return jsonify({'error': 'API key not set'}), 400

    audio_file = request.files.get('audio')
    if not audio_file:
        return jsonify({'error': 'No audio file provided'}), 400

    # Use configured upload folder instead of hardcoded 'uploads'
    upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)
    
    audio_path = os.path.join(upload_folder, audio_file.filename)
    audio_file.save(audio_path)

    # Convert audio to a format supported by Whisper (if needed)
    if not audio_path.endswith(".mp3"):
        converted_audio_path = os.path.splitext(audio_path)[0] + ".mp3"
        sound = AudioSegment.from_file(audio_path)
        sound.export(converted_audio_path, format="mp3")
        os.remove(audio_path)  # Remove original file
        audio_path = converted_audio_path

    try:
        # Initialize OpenAI client with the user's API key
        client = OpenAI(api_key=api_key)
        with open(audio_path, "rb") as f:
            transcription = client.audio.transcriptions.create(
                model="whisper-1", file=f)

        os.remove(audio_path)  # Clean up uploaded files
        return jsonify({'transcription': transcription.text})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@openai_bp.route('/evaluate_speaking', methods=['POST'])
def evaluate_speaking():
    # Retrieve the API key from the session
    api_key = session.get('OPENAI_API_KEY')
    if not api_key:
        return jsonify({'error': 'API key not set'}), 400

    audio_file = request.files.get('audio')
    reference_text = request.form.get('reference_text')
    language = request.form.get('language', 'en-US')

    if not audio_file:
        return jsonify({'error': 'No audio file provided'}), 400
    if not reference_text:
        return jsonify({'error': 'No reference text provided'}), 400

    # Use configured upload folder instead of hardcoded 'uploads'
    upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)

    # Save audio temporarily
    audio_path = os.path.join(upload_folder, audio_file.filename)
    audio_file.save(audio_path)

    # Convert audio to a format supported by Whisper (if needed)
    if not audio_path.endswith(".mp3"):
        converted_audio_path = os.path.splitext(audio_path)[0] + ".mp3"
        sound = AudioSegment.from_file(audio_path)
        sound.export(converted_audio_path, format="mp3")
        os.remove(audio_path)  # Remove original file
        audio_path = converted_audio_path

    try:
        # Initialize OpenAI client with the user's API key
        client = OpenAI(api_key=api_key)

        # First, transcribe the audio
        with open(audio_path, "rb") as f:
            transcription_result = client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                language=language.split(
                    '-')[0] if '-' in language else language
            )

        transcription = transcription_result.text

        # Now evaluate pronunciation using GPT
        # Create a manual evaluation instead of relying on GPT API
        # This avoids potential format issues causing 400 errors

        # Simple word-by-word analysis
        original_words = reference_text.split()
        transcribed_words = transcription.split()

        word_analysis = []

        # Compare words
        for i in range(max(len(original_words), len(transcribed_words))):
            if i < len(original_words) and i < len(transcribed_words):
                # Both words exist
                orig = original_words[i]
                trans = transcribed_words[i]

                if orig.lower() == trans.lower():
                    status = "correct"
                elif _calculate_similarity(orig.lower(), trans.lower()) > 0.7:
                    status = "similar"
                else:
                    status = "incorrect"

                word_analysis.append({
                    "original": orig,
                    "transcribed": trans,
                    "status": status
                })
            elif i < len(original_words):
                # Missing in transcription
                word_analysis.append({
                    "original": original_words[i],
                    "transcribed": "",
                    "status": "incorrect"
                })
            else:
                # Extra in transcription
                word_analysis.append({
                    "original": "",
                    "transcribed": transcribed_words[i],
                    "status": "incorrect"
                })

        # Calculate scores
        correct_count = sum(
            1 for w in word_analysis if w["status"] == "correct")
        similar_count = sum(
            1 for w in word_analysis if w["status"] == "similar")
        total_words = len(word_analysis)

        # Simple scoring algorithm
        accuracy_score = int((correct_count + 0.5 * similar_count) /
                             total_words * 100) if total_words > 0 else 0
        # Simplified fluency calculation
        fluency_score = int(0.8 * accuracy_score + 10)
        # Simplified pronunciation score
        pronunciation_score = int(0.9 * accuracy_score + 5)

        # Prepare feedback based on accuracy
        if accuracy_score >= 90:
            overall = "Excellent pronunciation! Your speech is very clear and accurate."
            suggestions = [
                "Continue practicing with more complex sentences",
                "Work on maintaining natural intonation"
            ]
        elif accuracy_score >= 75:
            overall = "Good pronunciation with minor errors. Keep practicing!"
            suggestions = [
                "Focus on words that were marked as similar or incorrect",
                "Practice speaking at a natural pace"
            ]
        elif accuracy_score >= 50:
            overall = "Fair pronunciation with some errors. More practice will help improve clarity."
            suggestions = [
                "Practice the words that were difficult to pronounce",
                "Try speaking more slowly and clearly",
                "Listen to native speakers pronouncing these words"
            ]
        else:
            overall = "Your pronunciation needs improvement. Regular practice will help significantly."
            suggestions = [
                "Break down words into syllables for easier pronunciation",
                "Start with shorter phrases before attempting longer sentences",
                "Record yourself and compare with native speakers"
            ]

        # Prepare response
        evaluation_data = {
            "transcription": transcription,
            "accuracy_score": accuracy_score,
            "fluency_score": fluency_score,
            "pronunciation_score": pronunciation_score,
            "word_analysis": word_analysis,
            "feedback": {
                "overall": overall,
                "suggestions": suggestions
            }
        }

        # Clean up uploaded files
        os.remove(audio_path)

        return jsonify(evaluation_data)

    except Exception as e:
        # Make sure to clean up even if there's an error
        if os.path.exists(audio_path):
            os.remove(audio_path)
        return jsonify({
            'error': str(e),
            'transcription': 'Error processing your recording: ' + str(e)
        }), 500

# Helper function to calculate word similarity


def _calculate_similarity(s1, s2):
    """Calculate similarity between two strings using Levenshtein distance"""
    if len(s1) == 0 or len(s2) == 0:
        return 0.0

    # Initialize matrix of zeros
    rows = len(s1) + 1
    cols = len(s2) + 1
    distance = [[0 for _ in range(cols)] for _ in range(rows)]

    # Populate matrix
    for i in range(1, rows):
        distance[i][0] = i
    for j in range(1, cols):
        distance[0][j] = j

    for col in range(1, cols):
        for row in range(1, rows):
            if s1[row-1] == s2[col-1]:
                cost = 0
            else:
                cost = 1
            distance[row][col] = min(
                distance[row-1][col] + 1,      # deletion
                distance[row][col-1] + 1,      # insertion
                distance[row-1][col-1] + cost  # substitution
            )

    # Calculate the similarity ratio
    max_len = max(len(s1), len(s2))
    similarity = 1.0 - (distance[rows-1][cols-1] /
                        max_len if max_len > 0 else 0)

    return similarity
