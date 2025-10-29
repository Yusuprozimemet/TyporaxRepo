from flask import Blueprint, jsonify, request, url_for, session, redirect
from werkzeug.utils import secure_filename
from src.models import User
import os
import logging
from .auth import login_required
from ..utils import get_user_artifacts_dir, get_user_folder_dir, ensure_user_artifacts_dir
from ..gcs_utils import gcs_client

files_bp = Blueprint('files', __name__)


@files_bp.route('/artifacts/<username>/<path:filename>')
@login_required
def serve_artifact(username, filename):
    """Serve a file from GCS or local filesystem."""
    if session.get('username') != username:
        logging.warning(
            f"Unauthorized access attempt by {session.get('username')} to {username}'s artifacts")
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    if gcs_client.enabled:
        # Serve from GCS using a presigned URL
        gcs_path = os.path.join('artifacts', username,
                                filename).replace(os.sep, '/')
        url = gcs_client.generate_presigned_url(gcs_path, expiration=3600)
        if not url:
            logging.error(
                f"Failed to generate presigned URL for GCS file: {gcs_path}")
            return jsonify({'success': False, 'error': 'File not found'}), 404
        logging.info(
            f"Redirecting to presigned URL for GCS file: {gcs_path} for user {username}")
        return redirect(url)  # Redirect to presigned URL
    else:
        # Serve from local filesystem
        user_artifacts_dir = get_user_artifacts_dir(username)
        file_path = os.path.join(user_artifacts_dir, filename)
        if not os.path.exists(file_path):
            logging.error(f"Local file not found: {file_path}")
            return jsonify({'success': False, 'error': 'File not found'}), 404
        from flask import send_file
        logging.info(f"Serving local file: {file_path} for user {username}")
        return send_file(file_path)


ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def allowed_file(filename):
    """Check if the file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@files_bp.route('/upload_image', methods=['POST'])
@login_required
def upload_image():
    """Upload an image to GCS or local filesystem, restricted to premium users."""
    # Apply rate limiting for file uploads
    limiter = current_app.limiter
    try:
        limiter.limit("10 per minute, 50 per hour")(lambda: None)()
    except Exception:
        return jsonify({'success': False, 'error': 'Too many upload requests. Please try again later.'}), 429
    
    username = session.get('username')
    user = User.query.filter_by(username=username).first()
    if not user:
        logging.error(f"User {username} not found")
        return jsonify({'success': False, 'error': 'User not found'}), 404
    if user.user_type != 'premium':
        logging.warning(f"User {username} is not premium, cannot upload image")
        return jsonify({
            'success': False,
            'error': 'Only premium users can upload images. Please upgrade to premium.',
            'upgrade_required': True
        }), 403

    if 'image' not in request.files:
        logging.warning("No file part in image upload request")
        return jsonify({'success': False, 'error': 'No file part'}), 400
    file = request.files['image']
    logging.debug(
        f"Received file: {file.filename}, size: {file.content_length}")
    if file.filename == '':
        logging.warning("No selected file for image upload")
        return jsonify({'success': False, 'error': 'No selected file'}), 400
    if not allowed_file(file.filename):
        logging.warning(f"Invalid file type for {file.filename}")
        return jsonify({'success': False, 'error': 'Invalid file type'}), 400

    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    if file_size > MAX_FILE_SIZE:
        logging.warning(f"File {file.filename} exceeds size limit")
        return jsonify({'success': False, 'error': 'File too large'}), 400
    file.seek(0)

    filename = secure_filename(file.filename)
    folder = request.form.get('folder', '')
    relative_path = os.path.join(folder, filename).replace(
        os.sep, '/') if folder else filename

    if gcs_client.enabled:
        # Upload to GCS
        gcs_path = os.path.join('artifacts', username,
                                relative_path).replace(os.sep, '/')
        try:
            # Save to temporary file for GCS upload
            temp_path = os.path.join('temp', filename)
            os.makedirs(os.path.dirname(temp_path), exist_ok=True)
            file.save(temp_path)
            gcs_client.upload_file(temp_path, gcs_path)
            os.remove(temp_path)
            # Return short URL
            image_url = url_for(
                'files.serve_artifact', username=username, filename=relative_path, _external=True)
            logging.info(
                f"Image uploaded to GCS: {gcs_path} for user {username}")
            return jsonify({'success': True, 'url': image_url})
        except Exception as e:
            logging.error(f"Error uploading image to GCS {gcs_path}: {str(e)}")
            return jsonify({'success': False, 'error': 'Failed to upload file'}), 500
    else:
        # Save to local filesystem
        user_upload_folder = get_user_folder_dir(username, folder)
        try:
            os.makedirs(user_upload_folder, exist_ok=True)
        except PermissionError as e:
            logging.error(
                f"Permission denied creating directory {user_upload_folder}: {str(e)}")
            return jsonify({'success': False, 'error': 'Permission denied'}), 500
        except Exception as e:
            logging.error(
                f"Error creating directory {user_upload_folder}: {str(e)}")
            return jsonify({'success': False, 'error': 'Directory creation failed'}), 500
        file_path = os.path.join(user_upload_folder, filename)
        try:
            file.save(file_path)
            image_url = url_for(
                'files.serve_artifact', username=username, filename=relative_path, _external=True)
            logging.info(
                f"Image uploaded locally: {file_path} for user {username}")
            return jsonify({'success': True, 'url': image_url})
        except Exception as e:
            logging.error(f"Error saving file locally {file_path}: {str(e)}")
            return jsonify({'success': False, 'error': 'Failed to save file'}), 500


@files_bp.route('/rename', methods=['POST'])
@login_required
def rename_file():
    """Rename a file in GCS or local filesystem, restricted to premium users."""
    username = session.get('username')
    user = User.query.filter_by(username=username).first()
    if not user:
        logging.error(f"User {username} not found")
        return jsonify({'success': False, 'error': 'User not found'}), 404
    if user.user_type != 'premium':
        logging.warning(f"User {username} is not premium, cannot rename file")
        return jsonify({
            'success': False,
            'error': 'Only premium users can rename files. Please upgrade to premium.',
            'upgrade_required': True
        }), 403

    data = request.get_json()
    current_filename = data.get('currentFilename')
    new_filename = data.get('newFilename')
    folder = data.get('folder', '')
    relative_current_path = os.path.join(folder, current_filename).replace(
        os.sep, '/') if folder else current_filename
    relative_new_path = os.path.join(folder, new_filename).replace(
        os.sep, '/') if folder else new_filename

    if gcs_client.enabled:
        # Rename in GCS by copying and deleting
        current_gcs_path = os.path.join(
            'artifacts', username, relative_current_path).replace(os.sep, '/')
        new_gcs_path = os.path.join(
            'artifacts', username, relative_new_path).replace(os.sep, '/')
        try:
            bucket = gcs_client.bucket
            blob = bucket.blob(current_gcs_path)
            if not blob.exists():
                logging.error(f"GCS file not found: {current_gcs_path}")
                return jsonify({'success': False, 'error': 'File not found'}), 404
            bucket.copy_blob(blob, bucket, new_gcs_path)
            blob.delete()
            logging.info(
                f"File renamed in GCS from {current_gcs_path} to {new_gcs_path} for user {username}")
            return jsonify({'success': True})
        except Exception as e:
            logging.error(
                f"Error renaming file in GCS from {current_gcs_path} to {new_gcs_path}: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500
    else:
        # Rename locally
        user_artifacts_dir = get_user_folder_dir(username, folder)
        ensure_user_artifacts_dir(username)
        current_path = os.path.join(user_artifacts_dir, current_filename)
        new_path = os.path.join(user_artifacts_dir, new_filename)
        try:
            if not os.path.exists(current_path):
                logging.error(f"Local file not found: {current_path}")
                return jsonify({'success': False, 'error': 'File not found'}), 404
            os.rename(current_path, new_path)
            logging.info(
                f"File renamed locally from {current_filename} to {new_filename} in folder {folder} for user {username}")
            return jsonify({'success': True})
        except Exception as e:
            logging.error(
                f"Error renaming file locally from {current_filename} to {new_filename}: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500


@files_bp.route('/delete', methods=['POST'])
@login_required
def delete_file():
    """Delete a file from GCS or local filesystem, restricted to premium users."""
    username = session.get('username')
    user = User.query.filter_by(username=username).first()
    if not user:
        logging.error(f"User {username} not found")
        return jsonify({'success': False, 'error': 'User not found'}), 404
    if user.user_type != 'premium':
        logging.warning(f"User {username} is not premium, cannot delete file")
        return jsonify({
            'success': False,
            'error': 'Only premium users can delete files. Please upgrade to premium.',
            'upgrade_required': True
        }), 403

    data = request.get_json()
    filename = data.get('filename')
    folder = data.get('folder', '')
    relative_path = os.path.join(folder, filename).replace(
        os.sep, '/') if folder else filename
    logging.debug(
        f'Request to delete file: {relative_path} for user {username}')

    if not filename:
        logging.warning("No file selected for deletion")
        return jsonify({'success': False, 'error': 'No file selected'}), 400

    if gcs_client.enabled:
        # Delete from GCS
        gcs_path = os.path.join('artifacts', username,
                                relative_path).replace(os.sep, '/')
        try:
            blob = gcs_client.bucket.blob(gcs_path)
            if not blob.exists():
                logging.error(f"GCS file not found: {gcs_path}")
                return jsonify({'success': False, 'error': 'File not found'}), 404
            blob.delete()
            logging.info(
                f"File deleted from GCS: {gcs_path} for user {username}")
            return jsonify({'success': True})
        except Exception as e:
            logging.error(
                f"Error deleting file from GCS: {gcs_path}: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500
    else:
        # Delete locally
        user_artifacts_dir = get_user_folder_dir(username, folder)
        ensure_user_artifacts_dir(username)
        file_path = os.path.join(user_artifacts_dir, filename)
        if not os.path.exists(file_path):
            logging.error(f"Local file not found: {file_path}")
            return jsonify({'success': False, 'error': 'File not found'}), 404
        try:
            os.remove(file_path)
            logging.info(
                f"File deleted locally: {file_path} for user {username}")
            return jsonify({'success': True})
        except Exception as e:
            logging.error(
                f"Error deleting file locally: {file_path}: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500
