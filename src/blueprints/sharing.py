# src/blueprints/sharing.py
from flask import Blueprint, jsonify, request, session
from src.utils import open_md_file, list_md_files, get_user_artifacts_dir, save_file
from src.gcs_utils import gcs_client
from src.models import User
from .auth import login_required
import os
import json
import logging
import shutil

sharing_bp = Blueprint('sharing', __name__)


def update_sharing_permissions(username, permissions):
    """Update the sharing permissions for a user."""
    if gcs_client.enabled:
        gcs_path = os.path.join('artifacts', username,
                                'sharing_permissions.json').replace(os.sep, '/')
        try:
            gcs_client.write_file(gcs_path, json.dumps(permissions, indent=4))
            logging.info(f"Updated sharing permissions in GCS for {username}")
        except Exception as e:
            logging.error(
                f"Error updating sharing permissions in GCS for {username}: {str(e)}")
            raise
    else:
        permissions_file = os.path.join(
            get_user_artifacts_dir(username), 'sharing_permissions.json')
        try:
            with open(permissions_file, 'w', encoding='utf-8') as f:
                json.dump(permissions, f, indent=4)
            logging.info(f"Updated sharing permissions for user {username}")
        except Exception as e:
            logging.error(
                f"Error updating sharing permissions for {username}: {str(e)}")
            raise


def get_sharing_permissions(username):
    """Retrieve the sharing permissions for a user."""
    if gcs_client.enabled:
        gcs_path = os.path.join('artifacts', username,
                                'sharing_permissions.json').replace(os.sep, '/')
        content = gcs_client.read_file(gcs_path)
        if content:
            try:
                permissions = json.loads(content)
                logging.debug(
                    f"Retrieved sharing permissions for {username} from GCS: {permissions}")
                return permissions.get('shared_files', {})
            except json.JSONDecodeError as e:
                logging.error(
                    f"Error parsing sharing permissions for {username}: {str(e)}")
        return {}
    permissions_file = os.path.join(
        get_user_artifacts_dir(username), 'sharing_permissions.json')
    try:
        if os.path.exists(permissions_file):
            with open(permissions_file, 'r', encoding='utf-8') as f:
                permissions = json.load(f)
                logging.debug(
                    f"Retrieved sharing permissions for {username}: {permissions}")
                return permissions.get('shared_files', {})
        return {}
    except Exception as e:
        logging.error(
            f"Error reading sharing permissions for {username}: {str(e)}")
        return {}


def copy_file_to_shared_folder(sharer, recipient, filename, folder):
    """Copy a file to the recipient's shared folder with a unique name."""
    unique_filename = f"{filename.rsplit('.md', 1)[0]}_sharedby_{sharer}.md"
    try:
        content = open_md_file(filename, sharer, folder)
        recipient_shared_dir = os.path.join(
            get_user_artifacts_dir(recipient), 'shared')
        if gcs_client.enabled:
            src_path = os.path.join('artifacts', sharer, folder, filename).replace(
                os.sep, '/').lstrip('/')
            dst_path = os.path.join('artifacts', recipient, 'shared', unique_filename).replace(
                os.sep, '/').lstrip('/')
            gcs_client.write_file(dst_path, content)
            logging.info(f"Copied {src_path} to {dst_path} in GCS")
        else:
            save_file(unique_filename, content, recipient, 'shared')
            logging.info(
                f"Copied {filename} to {recipient}'s shared folder as {unique_filename}")
        return unique_filename
    except Exception as e:
        logging.error(
            f"Error copying file {filename} to {recipient}'s shared folder: {str(e)}")
        raise


@sharing_bp.route('/sharing_permissions')
@login_required
def list_sharing_permissions():
    """List all files the user has shared and who they are shared with."""
    username = session.get('username')
    try:
        permissions = get_sharing_permissions(username)
        logging.debug(
            f"Listed sharing permissions for user {username}: {permissions}")
        return jsonify(permissions)
    except Exception as e:
        logging.error(
            f"Error listing sharing permissions for {username}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@sharing_bp.route('/shared_files')
@login_required
def list_shared_files():
    """List all files shared with the user (stored in their shared folder)."""
    username = session.get('username')
    shared_files = []
    try:
        shared_files = list_md_files(username, 'shared')
        shared_files = [{'filename': f, 'owner': f.split('_sharedby_')[1].rsplit(
            '.md')[0] if '_sharedby_' in f else username, 'folder': 'shared'} for f in shared_files if f != '.placeholder']
        logging.debug(
            f"Listed {len(shared_files)} shared files for user {username}")
        return jsonify(shared_files)
    except Exception as e:
        logging.error(f"Error listing shared files for {username}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@sharing_bp.route('/share_file', methods=['POST'])
@login_required
def share_file():
    """Share a file with specified users by copying to their shared folders."""
    username = session.get('username')
    user = User.query.filter_by(username=username).first()
    if not user or user.user_type != 'premium':
        logging.warning(f"User {username} is not premium, cannot share files")
        return jsonify({'success': False, 'error': 'Only premium users can share files', 'upgrade_required': True}), 403

    data = request.get_json()
    filename = data.get('filename')
    folder = data.get('folder', '')
    share_with = data.get('share_with', [])

    if not filename or not share_with:
        return jsonify({'success': False, 'error': 'Filename and users to share with are required'}), 400
    if not filename.endswith('.md'):
        filename += '.md'

    # Verify file exists
    try:
        open_md_file(filename, username, folder)
    except FileNotFoundError:
        logging.error(
            f"File {filename} not found for user {username} in folder {folder}")
        return jsonify({'success': False, 'error': f"File '{filename}' not found"}), 404

    # Verify all target users exist
    for target_user in share_with:
        if not User.query.filter_by(username=target_user).first():
            logging.error(f"Target user {target_user} not found")
            return jsonify({'success': False, 'error': f"User '{target_user}' not found"}), 404

    try:
        permissions = get_sharing_permissions(username)
        for target_user in share_with:
            unique_filename = copy_file_to_shared_folder(
                username, target_user, filename, folder)
            # Store original filename, folder, and unique filename in permissions
            if filename not in permissions:
                permissions[filename] = []
            permissions[filename].append({
                'recipient': target_user,
                'unique_filename': unique_filename,
                'folder': folder
            })
        update_sharing_permissions(username, {'shared_files': permissions})
        logging.info(f"User {username} shared {filename} with {share_with}")
        return jsonify({'success': True})
    except Exception as e:
        logging.error(
            f"Error sharing file {filename} for {username}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@sharing_bp.route('/unshare_file', methods=['POST'])
@login_required
def unshare_file():
    """Remove sharing permissions and delete the file from recipients' shared folders."""
    username = session.get('username')
    user = User.query.filter_by(username=username).first()
    if not user or user.user_type != 'premium':
        logging.warning(
            f"User {username} is not premium, cannot unshare files")
        return jsonify({'success': False, 'error': 'Only premium users can manage sharing', 'upgrade_required': True}), 403

    data = request.get_json()
    filename = data.get('filename')
    folder = data.get('folder', '')
    unshare_with = data.get('unshare_with', [])

    if not filename or not unshare_with:
        return jsonify({'success': False, 'error': 'Filename and users to unshare with are required'}), 400
    if not filename.endswith('.md'):
        filename += '.md'

    try:
        permissions = get_sharing_permissions(username)
        if filename not in permissions:
            return jsonify({'success': False, 'error': f"File '{filename}' is not shared"}), 400

        # Remove files from recipients' shared folders
        updated_permissions = []
        for entry in permissions[filename]:
            if entry['recipient'] not in unshare_with:
                updated_permissions.append(entry)
            else:
                # Delete the file from the recipient's shared folder
                recipient = entry['recipient']
                unique_filename = entry['unique_filename']
                if gcs_client.enabled:
                    gcs_path = os.path.join('artifacts', recipient, 'shared', unique_filename).replace(
                        os.sep, '/').lstrip('/')
                    blob = gcs_client.bucket.blob(gcs_path)
                    if blob.exists():
                        blob.delete()
                        logging.info(
                            f"Deleted {gcs_path} from GCS for user {recipient}")
                else:
                    file_path = os.path.join(get_user_artifacts_dir(
                        recipient), 'shared', unique_filename)
                    if os.path.exists(file_path):
                        os.remove(file_path)
                        logging.info(
                            f"Deleted {file_path} for user {recipient}")

        if updated_permissions:
            permissions[filename] = updated_permissions
        else:
            del permissions[filename]

        update_sharing_permissions(username, {'shared_files': permissions})
        logging.info(
            f"User {username} unshared {filename} with {unshare_with}")
        return jsonify({'success': True})
    except Exception as e:
        logging.error(
            f"Error unsharing file {filename} for {username}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@sharing_bp.route('/open_shared_file')
@login_required
def open_shared_file():
    """Open a file from the user's shared folder."""
    username = session.get('username')
    filename = request.args.get('filename')
    folder = request.args.get('folder', 'shared')

    if not filename:
        return jsonify({'error': 'Filename is required'}), 400
    if not filename.endswith('.md'):
        filename += '.md'

    try:
        content = open_md_file(filename, username, folder)
        logging.info(
            f"User {username} opened shared file {filename} from folder {folder}")
        return content
    except FileNotFoundError:
        logging.error(
            f"Shared file {filename} not found for user {username} in folder {folder}")
        return jsonify({'error': f"File '{filename}' not found in shared folder"}), 404
    except Exception as e:
        logging.error(
            f"Error opening shared file {filename} for {username}: {str(e)}")
        return jsonify({'error': str(e)}), 500
