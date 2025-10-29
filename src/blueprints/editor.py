# src/blueprints/editor.py
from flask import Blueprint, render_template, jsonify, request, session
from src.utils import get_user_books, list_md_files, open_md_file, save_file, save_user_books, search_files, list_user_folders
from src.models import User
from .auth import login_required
import logging
import os

editor_bp = Blueprint('editor', __name__)


@editor_bp.route('/')
@login_required
def editor():
    username = session.get('username')
    user = User.query.filter_by(username=username).first()
    if not user:
        logging.error(f"User {username} not found")
        return jsonify({'success': False, 'error': 'User not found'}), 404
    logging.debug(
        f"Rendering editor page for user {username} with user_type {user.user_type}")
    return render_template('editor.html', user_type=user.user_type)


@editor_bp.route('/files')
@login_required
def list_files():
    username = session.get('username')
    folder = request.args.get('folder', '')
    files = list_md_files(username, folder)
    logging.debug(
        f"Listed {len(files)} owned markdown files for user {username} in folder {folder or 'root'}")
    return jsonify(files)


@editor_bp.route('/all_owned_files')
@login_required
def list_all_owned_files():
    """List all markdown files owned by the user across all folders."""
    username = session.get('username')
    folders = list_user_folders(username)
    all_files = []
    try:
        # Include root folder files
        root_files = list_md_files(username, '')
        all_files.extend([{'filename': f, 'folder': ''} for f in root_files])

        # Include files from all subfolders (excluding shared folder for sharing purposes)
        for folder in folders:
            if folder == 'shared':
                continue  # Skip shared folder when listing files to share
            folder_files = list_md_files(username, folder)
            all_files.extend([{'filename': f, 'folder': folder}
                             for f in folder_files])

        logging.debug(
            f"Listed {len(all_files)} owned markdown files for user {username} across all folders")
        return jsonify(all_files)
    except Exception as e:
        logging.error(
            f"Error listing all owned files for {username}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@editor_bp.route('/folders')
@login_required
def list_folders():
    username = session.get('username')
    folders = list_user_folders(username)
    logging.debug(f"Listed {len(folders)} folders for user {username}")
    return jsonify(folders)


@editor_bp.route('/search')
@login_required
def search():
    username = session.get('username')
    keyword = request.args.get('q', '')
    results = search_files(keyword, username)
    logging.debug(
        f"Search for '{keyword}' returned {len(results)} results for user {username}")
    return jsonify(results)


@editor_bp.route('/save', methods=['POST'])
@login_required
def save():
    username = session.get('username')
    user = User.query.filter_by(username=username).first()
    data = request.get_json()
    filename = data.get('filename')
    content = data.get('content')
    folder = data.get('folder', '')

    if not filename.endswith('.md'):
        filename += '.md'

    # Prevent saving to shared folder for non-premium users
    if folder == 'shared' and user.user_type != 'premium':
        logging.warning(
            f"User {username} attempted to save to shared folder without premium status")
        return jsonify({'success': False, 'error': 'Cannot save to shared folder', 'upgrade_required': True}), 403

    try:
        save_file(filename, content, username, folder)
        logging.info(
            f"File saved successfully: {filename} for user {username} in folder {folder or 'root'}")
        return jsonify({'success': True})
    except PermissionError as e:
        logging.warning(
            f"Permission error saving file {filename} for user {username}: {str(e)}")
        return jsonify({'success': False, 'error': str(e), 'upgrade_required': True}), 403
    except Exception as e:
        logging.error(
            f"Error saving file {filename} for user {username}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@editor_bp.route('/open')
@login_required
def open_file():
    username = session.get('username')
    filename = request.args.get('filename')
    folder = request.args.get('folder', '')
    logging.debug(
        f"Opening file: {filename} in folder: '{folder}' for user: {username}")
    try:
        content = open_md_file(filename, username, folder)
        logging.info(
            f"File opened successfully: {filename} in folder: {folder or 'root'} for user: {username}")
        return content
    except FileNotFoundError as e:
        logging.error(
            f"File not found: {filename} in folder: {folder} for user: {username} - {str(e)}")
        return jsonify({'error': f"File '{filename}' not found in folder '{folder or 'root'}'"}), 404
    except Exception as e:
        logging.error(
            f"Error opening file: {filename} in folder: {folder} for user: {username} - {str(e)}")
        return jsonify({'error': str(e)}), 500


@editor_bp.route('/create_folder', methods=['POST'])
@login_required
def create_folder():
    username = session.get('username')
    data = request.get_json()
    folder_name = data.get('folder', '').strip()
    if not folder_name:
        return jsonify({'success': False, 'error': 'Folder name is required'}), 400
    if '/' in folder_name or '\\' in folder_name:
        return jsonify({'success': False, 'error': 'Invalid folder name'}), 400
    try:
        from src.utils import create_user_folder
        create_user_folder(username, folder_name)
        return jsonify({'success': True})
    except Exception as e:
        logging.error(
            f"Error creating folder '{folder_name}' for user '{username}': {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@editor_bp.route('/delete_folder', methods=['POST'])
@login_required
def delete_folder():
    username = session.get('username')
    data = request.get_json()
    folder_name = data.get('folder', '').strip()
    if not folder_name:
        return jsonify({'success': False, 'error': 'Folder name is required'}), 400
    try:
        from src.utils import delete_user_folder
        delete_user_folder(username, folder_name)
        return jsonify({'success': True})
    except FileNotFoundError as e:
        return jsonify({'success': False, 'error': str(e)}), 404
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        logging.error(
            f"Error deleting folder '{folder_name}' for user '{username}': {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@editor_bp.route('/rename_folder', methods=['POST'])
@login_required
def rename_folder():
    username = session.get('username')
    data = request.get_json()
    old_folder = data.get('old_folder', '').strip()
    new_folder = data.get('new_folder', '').strip()
    if not old_folder or not new_folder:
        return jsonify({'success': False, 'error': 'Both old and new folder names are required'}), 400
    if '/' in new_folder or '\\' in new_folder:
        return jsonify({'success': False, 'error': 'Invalid folder name'}), 400
    try:
        from src.utils import rename_user_folder
        rename_user_folder(username, old_folder, new_folder)
        return jsonify({'success': True})
    except FileNotFoundError as e:
        return jsonify({'success': False, 'error': str(e)}), 404
    except FileExistsError as e:
        return jsonify({'success': False, 'error': str(e)}), 409
    except Exception as e:
        logging.error(
            f"Error renaming folder from '{old_folder}' to '{new_folder}' for user '{username}': {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@editor_bp.route('/books')
@login_required
def list_books():
    username = session.get('username')
    try:
        books = get_user_books(username)
        logging.debug(f"Listed {len(books)} books for user {username}")
        return jsonify(books)
    except Exception as e:
        logging.error(f"Error listing books for user {username}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@editor_bp.route('/save_books', methods=['POST'])
@login_required
def save_books():
    username = session.get('username')
    data = request.get_json()
    books = data.get('books', [])
    try:
        save_user_books(username, books)
        logging.info(f"Books saved successfully for user {username}")
        return jsonify({'success': True})
    except PermissionError as e:
        logging.warning(
            f"Permission error saving books for user {username}: {str(e)}")
        return jsonify({'success': False, 'error': str(e), 'upgrade_required': True}), 403
    except Exception as e:
        logging.error(f"Error saving books for user {username}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@editor_bp.route('/publish', methods=['POST'])
@login_required
def publish():
    from .public import publish_file
    return publish_file()
