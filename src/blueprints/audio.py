from flask import Blueprint, jsonify, render_template, request, session, send_from_directory
from src.utils import list_audio_files, get_audio_file
from .auth import login_required
import os
import logging
from ..gcs_utils import gcs_client

audio_bp = Blueprint('audio', __name__)


@audio_bp.route('/')
@login_required
def audio_page():
    """Render a page for audio file management (optional)."""
    logging.debug("Rendering audio page")
    return render_template('audio.html')


@audio_bp.route('/files')
@login_required
def list_audio_files_route():
    """List all MP3 files the user is allowed to access."""
    username = session.get('username')

    # Get the list of accessible audio files
    audio_files = list_audio_files(username)

    # Filter for MP3 files
    mp3_files = [f for f in audio_files if f.lower().endswith('.mp3')]
    logging.debug(f"Listed {len(mp3_files)} MP3 files for user {username}")
    return jsonify(mp3_files)


@audio_bp.route('/play/<filename>')
@login_required
def play_audio(filename):
    """Serve an MP3 file for playback or return a presigned URL for GCS."""
    username = session.get('username')

    # Ensure the file is an MP3
    if not filename.lower().endswith('.mp3'):
        logging.error(
            f"Invalid file type requested: {filename} by user {username}")
        return jsonify({'success': False, 'error': 'Only MP3 files are supported'}), 400

    try:
        if gcs_client.enabled:
            # For GCS, generate a presigned URL for direct streaming
            allowed_files = gcs_client.get_audio_permissions(username)
            if filename not in allowed_files:
                logging.error(
                    f"User {username} does not have access to audio file: {filename}")
                return jsonify({'success': False, 'error': 'Access denied'}), 403

            gcs_path = os.path.join(
                'artifacts', 'audio', filename).replace(os.sep, '/')
            url = gcs_client.generate_presigned_url(
                gcs_path, expiration=3600)  # 1-hour URL
            if url:
                logging.info(
                    f"Generated presigned URL for audio file: {filename} for user {username}")
                return jsonify({'success': True, 'url': url})
            logging.error(
                f"Failed to generate presigned URL for {filename} for user {username}")
            return jsonify({'success': False, 'error': 'Failed to generate URL'}), 500

        # Local filesystem: serve the file directly
        audio_file_path = get_audio_file(username, filename)
        audio_dir = os.path.dirname(audio_file_path)  # artifacts/audio
        logging.info(f"Serving audio file: {filename} for user {username}")
        return send_from_directory(audio_dir, filename, mimetype='audio/mpeg')
    except ValueError as e:
        logging.error(
            f"Access denied: {filename} for user {username}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 403
    except FileNotFoundError:
        logging.error(f"Audio file not found: {filename} for user {username}")
        return jsonify({'success': False, 'error': 'File not found'}), 404
    except Exception as e:
        logging.error(
            f"Error serving audio file {filename} for user {username}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@audio_bp.route('/search')
@login_required
def search_audio():
    """Search for MP3 files by keyword in the filename."""
    username = session.get('username')
    keyword = request.args.get('q', '').lower()

    # Get the list of accessible audio files
    audio_files = list_audio_files(username)

    # Filter for MP3 files matching the keyword
    matching_files = [f for f in audio_files
                      if f.lower().endswith('.mp3') and keyword in f.lower()]
    logging.debug(
        f"Search for '{keyword}' returned {len(matching_files)} audio files for user {username}")
    return jsonify(matching_files)
