from flask import Blueprint, render_template, jsonify, request, session, abort
from src.utils import save_file, open_md_file, ensure_published_dir, PUBLISH_DIR_LOCAL, PUBLISH_DIR_GCS
from src.models import User
from .auth import login_required
from src.gcs_utils import gcs_client
import os
import logging
import uuid
import glob
import json
from datetime import datetime

public_bp = Blueprint('public', __name__)


@public_bp.route('/publish', methods=['POST'])
@login_required
def publish_file():
    username = session.get('username')
    user = User.query.filter_by(username=username).first()

    if user.user_type != 'premium':
        logging.warning(
            f"User {username} attempted to publish without premium status")
        return jsonify({'success': False, 'error': 'Premium account required to publish', 'upgrade_required': True}), 403

    data = request.get_json()
    filename = data.get('filename')
    content = data.get('content')
    folder = data.get('folder', '')
    display_filename = data.get('display_filename')
    display_username = data.get('display_username')
    tags = data.get('tags', [])  # Get tags from payload

    if not filename:
        return jsonify({'success': False, 'error': 'Original filename is required'}), 400
    if not display_filename:
        return jsonify({'success': False, 'error': 'Display filename is required'}), 400
    if not display_username:
        return jsonify({'success': False, 'error': 'Display username is required'}), 400

    try:
        open_md_file(filename, username, folder)
        ensure_published_dir()

        public_id = str(uuid.uuid4())
        public_filename = f"{public_id}.md"
        metadata_filename = f"{public_id}.meta"
        permissions_filename = f"{public_id}.permissions.json"
        comments_filename = f"{public_id}.comments.json"

        if gcs_client.enabled:
            public_path = f"{PUBLISH_DIR_GCS}/{public_filename}"
            metadata_path = f"{PUBLISH_DIR_GCS}/{metadata_filename}"
            permissions_path = f"{PUBLISH_DIR_GCS}/{permissions_filename}"
            comments_path = f"{PUBLISH_DIR_GCS}/{comments_filename}"
            gcs_client.write_file(public_path, content)
            gcs_client.write_file(metadata_path, json.dumps({
                'display_filename': display_filename,
                'display_username': display_username,
                'owner_username': username,
                'tags': tags  # Store tags in metadata
            }))
            gcs_client.write_file(permissions_path, json.dumps([]))
            gcs_client.write_file(comments_path, json.dumps([]))
        else:
            public_path = os.path.join(PUBLISH_DIR_LOCAL, public_filename)
            metadata_path = os.path.join(PUBLISH_DIR_LOCAL, metadata_filename)
            permissions_path = os.path.join(
                PUBLISH_DIR_LOCAL, permissions_filename)
            comments_path = os.path.join(PUBLISH_DIR_LOCAL, comments_filename)
            os.makedirs(PUBLISH_DIR_LOCAL, exist_ok=True)
            with open(public_path, 'w', encoding='utf-8') as f:
                f.write(content)
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump({
                    'display_filename': display_filename,
                    'display_username': display_username,
                    'owner_username': username,
                    'tags': tags  # Store tags in metadata
                }, f)
            with open(permissions_path, 'w', encoding='utf-8') as f:
                json.dump([], f)
            with open(comments_path, 'w', encoding='utf-8') as f:
                json.dump([], f)

        public_url = f"/public/view/{public_id}"
        logging.info(
            f"File {filename} published by user {username} as {public_id} with display name {display_filename} by {display_username}, tags: {tags}")
        return jsonify({'success': True, 'public_url': public_url})
    except FileNotFoundError:
        logging.error(
            f"File {filename} not found for user {username} in folder {folder}")
        return jsonify({'success': False, 'error': 'File not found'}), 404
    except Exception as e:
        logging.error(
            f"Error publishing file {filename} for user {username}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@public_bp.route('/edit/<public_id>', methods=['PUT'])
@login_required
def edit_file(public_id):
    username = session.get('username')
    data = request.get_json()
    content = data.get('content')
    tags = data.get('tags', [])  # Get tags from payload
    if not content:
        return jsonify({'success': False, 'error': 'Content is required'}), 400

    try:
        metadata_path = f"{PUBLISH_DIR_GCS}/{public_id}.meta" if gcs_client.enabled else os.path.join(
            PUBLISH_DIR_LOCAL, f"{public_id}.meta")
        permissions_path = f"{PUBLISH_DIR_GCS}/{public_id}.permissions.json" if gcs_client.enabled else os.path.join(
            PUBLISH_DIR_LOCAL, f"{public_id}.permissions.json")

        # Read metadata
        if gcs_client.enabled:
            metadata_content = gcs_client.read_file(metadata_path)
            permissions_content = gcs_client.read_file(permissions_path)
        else:
            with open(metadata_path, 'r', encoding='utf-8') as f:
                metadata_content = f.read()
            with open(permissions_path, 'r', encoding='utf-8') as f:
                permissions_content = f.read()

        metadata = json.loads(metadata_content)
        permitted_users = json.loads(
            permissions_content) if permissions_content else []
        owner_username = metadata.get('owner_username')

        # Check if user is owner or has edit permission
        if username != owner_username and username not in permitted_users:
            logging.warning(
                f"User {username} attempted to edit file {public_id} without permission")
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403

        # Update file content
        public_path = f"{PUBLISH_DIR_GCS}/{public_id}.md" if gcs_client.enabled else os.path.join(
            PUBLISH_DIR_LOCAL, f"{public_id}.md")
        if gcs_client.enabled:
            gcs_client.write_file(public_path, content)
            # Update metadata with new tags
            metadata['tags'] = tags
            gcs_client.write_file(metadata_path, json.dumps(metadata))
        else:
            with open(public_path, 'w', encoding='utf-8') as f:
                f.write(content)
            # Update metadata with new tags
            metadata['tags'] = tags
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f)

        logging.info(
            f"File {public_id} edited by user {username}, updated tags: {tags}")
        return jsonify({'success': True})
    except Exception as e:
        logging.error(f"Error editing file {public_id}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@public_bp.route('/unpublish/<public_id>', methods=['DELETE'])
@login_required
def unpublish_file(public_id):
    username = session.get('username')

    try:
        public_filename = f"{public_id}.md"
        metadata_filename = f"{public_id}.meta"
        permissions_filename = f"{public_id}.permissions.json"
        comments_filename = f"{public_id}.comments.json"

        if gcs_client.enabled:
            public_path = f"{PUBLISH_DIR_GCS}/{public_filename}"
            metadata_path = f"{PUBLISH_DIR_GCS}/{metadata_filename}"
            permissions_path = f"{PUBLISH_DIR_GCS}/{permissions_filename}"
            comments_path = f"{PUBLISH_DIR_GCS}/{comments_filename}"
            public_blob = gcs_client.bucket.blob(public_path)
            metadata_blob = gcs_client.bucket.blob(metadata_path)
            permissions_blob = gcs_client.bucket.blob(permissions_path)
            comments_blob = gcs_client.bucket.blob(comments_path)

            if not public_blob.exists():
                logging.error(f"Public file {public_id} not found in GCS")
                return jsonify({'success': False, 'error': 'File not found'}), 404

            metadata_content = gcs_client.read_file(metadata_path)
            if metadata_content:
                metadata = json.loads(metadata_content)
                owner_username = metadata.get('owner_username', 'Unknown')
                if owner_username != username:
                    logging.warning(
                        f"User {username} attempted to unpublish file {public_id} owned by {owner_username}")
                    return jsonify({'success': False, 'error': 'You are not authorized to unpublish this file'}), 403

            public_blob.delete()
            if metadata_blob.exists():
                metadata_blob.delete()
            if permissions_blob.exists():
                permissions_blob.delete()
            if comments_blob.exists():
                comments_blob.delete()
        else:
            public_path = os.path.join(PUBLISH_DIR_LOCAL, public_filename)
            metadata_path = os.path.join(PUBLISH_DIR_LOCAL, metadata_filename)
            permissions_path = os.path.join(
                PUBLISH_DIR_LOCAL, permissions_filename)
            comments_path = os.path.join(PUBLISH_DIR_LOCAL, comments_filename)

            if not os.path.exists(public_path):
                logging.error(f"Public file {public_id} not found")
                return jsonify({'success': False, 'error': 'File not found'}), 404

            if os.path.exists(metadata_path):
                with open(metadata_path, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
                    owner_username = metadata.get('owner_username', 'Unknown')
                    if owner_username != username:
                        logging.warning(
                            f"User {username} attempted to unpublish file {public_id} owned by {owner_username}")
                        return jsonify({'success': False, 'error': 'You are not authorized to unpublish this file'}), 403

            os.remove(public_path)
            if os.path.exists(metadata_path):
                os.remove(metadata_path)
            if os.path.exists(permissions_path):
                os.remove(permissions_path)
            if os.path.exists(comments_path):
                os.remove(comments_path)

        logging.info(f"File {public_id} unpublished by user {username}")
        return jsonify({'success': True, 'message': 'File unpublished successfully'})
    except Exception as e:
        logging.error(
            f"Error unpublishing file {public_id} for user {username}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@public_bp.route('/clear_public_files', methods=['DELETE'])
@login_required
def clear_public_files():
    username = session.get('username')
    user = User.query.filter_by(username=username).first()

    if user.user_type != 'admin':
        logging.warning(
            f"User {username} attempted to clear public files without admin status")
        return jsonify({'success': False, 'error': 'Admin access required to clear public files'}), 403

    try:
        if gcs_client.enabled:
            blobs = gcs_client.client.list_blobs(
                gcs_client.bucket, prefix=f"{PUBLISH_DIR_GCS}/")
            for blob in blobs:
                if blob.name.endswith(('.md', '.meta', '.permissions.json', '.comments.json')):
                    blob.delete()
        else:
            for ext in ('*.md', '*.meta', '*.permissions.json', '*.comments.json'):
                for file_path in glob.glob(os.path.join(PUBLISH_DIR_LOCAL, ext)):
                    os.remove(file_path)

        logging.info(f"All public files cleared by admin {username}")
        return jsonify({'success': True, 'message': 'All public files cleared successfully'})
    except Exception as e:
        logging.error(
            f"Error clearing public files by user {username}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@public_bp.route('/view')
def list_public_files():
    try:
        ensure_published_dir()
        files = []
        if gcs_client.enabled:
            blobs = gcs_client.client.list_blobs(
                gcs_client.bucket, prefix=f"{PUBLISH_DIR_GCS}/")
            md_files = {os.path.splitext(os.path.basename(blob.name))[
                0] for blob in blobs if blob.name.endswith('.md')}
            for public_id in md_files:
                metadata_path = f"{PUBLISH_DIR_GCS}/{public_id}.meta"
                public_path = f"{PUBLISH_DIR_GCS}/{public_id}.md"
                display_filename = public_id
                display_username = 'Unknown'
                tags = []
                content = gcs_client.read_file(public_path) or ''
                metadata_content = gcs_client.read_file(metadata_path)
                if metadata_content:
                    try:
                        metadata = json.loads(metadata_content)
                        display_filename = metadata.get(
                            'display_filename', public_id)
                        display_username = metadata.get(
                            'display_username', 'Unknown')
                        tags = metadata.get('tags', [])
                    except json.JSONDecodeError:
                        logging.error(
                            f"Invalid metadata JSON for {metadata_path}")
                files.append({
                    'public_id': public_id,
                    'display_filename': display_filename,
                    'display_username': display_username,
                    'tags': tags,
                    'content': content  # Include content for search
                })
        else:
            for file_path in glob.glob(os.path.join(PUBLISH_DIR_LOCAL, '*.md')):
                public_id = os.path.splitext(os.path.basename(file_path))[0]
                metadata_path = os.path.join(
                    PUBLISH_DIR_LOCAL, f"{public_id}.meta")
                display_filename = public_id
                display_username = 'Unknown'
                tags = []
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                if os.path.exists(metadata_path):
                    with open(metadata_path, 'r', encoding='utf-8') as f:
                        metadata = json.load(f)
                        display_filename = metadata.get(
                            'display_filename', public_id)
                        display_username = metadata.get(
                            'display_username', 'Unknown')
                        tags = metadata.get('tags', [])
                files.append({
                    'public_id': public_id,
                    'display_filename': display_filename,
                    'display_username': display_username,
                    'tags': tags,
                    'content': content  # Include content for search
                })

        current_username = session.get('username')
        is_authenticated = current_username is not None
        is_admin = False
        if current_username:
            user = User.query.filter_by(username=current_username).first()
            is_admin = user.user_type == 'admin' if user else False

        logging.info(f"Listed {len(files)} public files")
        return render_template(
            'public_file.html',
            files=files,
            content='',
            display_filename='',
            display_username='',
            is_admin=is_admin,
            is_authenticated=is_authenticated,
            is_owner=False,
            can_edit=False
        )
    except Exception as e:
        logging.error(f"Error listing public files: {str(e)}")
        abort(500)


@public_bp.route('/view/<public_id>/metadata', methods=['GET'])
@login_required
def get_metadata(public_id):
    try:
        metadata_path = f"{PUBLISH_DIR_GCS}/{public_id}.meta" if gcs_client.enabled else os.path.join(
            PUBLISH_DIR_LOCAL, f"{public_id}.meta")

        # Read metadata
        if gcs_client.enabled:
            metadata_content = gcs_client.read_file(metadata_path)
        else:
            if not os.path.exists(metadata_path):
                return jsonify({'success': False, 'error': 'Metadata not found'}), 404
            with open(metadata_path, 'r', encoding='utf-8') as f:
                metadata_content = f.read()

        metadata = json.loads(metadata_content)
        return jsonify({'success': True, 'tags': metadata.get('tags', [])})
    except Exception as e:
        logging.error(
            f"Error fetching metadata for file {public_id}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@public_bp.route('/view/<public_id>')
def view_public_file(public_id):
    try:
        public_filename = f"{public_id}.md"
        metadata_filename = f"{public_id}.meta"
        permissions_filename = f"{public_id}.permissions.json"

        # Read content
        if gcs_client.enabled:
            public_path = f"{PUBLISH_DIR_GCS}/{public_filename}"
            metadata_path = f"{PUBLISH_DIR_GCS}/{metadata_filename}"
            permissions_path = f"{PUBLISH_DIR_GCS}/{permissions_filename}"
            content = gcs_client.read_file(public_path)
            if content is None:
                logging.error(f"Public file {public_id} not found in GCS")
                abort(404)
            metadata_content = gcs_client.read_file(metadata_path)
            permissions_content = gcs_client.read_file(permissions_path)
        else:
            public_path = os.path.join(PUBLISH_DIR_LOCAL, public_filename)
            metadata_path = os.path.join(PUBLISH_DIR_LOCAL, metadata_filename)
            permissions_path = os.path.join(
                PUBLISH_DIR_LOCAL, permissions_filename)
            if not os.path.exists(public_path):
                logging.error(f"Public file {public_id} not found")
                abort(404)
            with open(public_path, 'r', encoding='utf-8') as f:
                content = f.read()
            metadata_content = None
            if os.path.exists(metadata_path):
                with open(metadata_path, 'r', encoding='utf-8') as f:
                    metadata_content = f.read()
            permissions_content = None
            if os.path.exists(permissions_path):
                with open(permissions_path, 'r', encoding='utf-8') as f:
                    permissions_content = f.read()

        display_filename = public_id
        display_username = 'Unknown'
        owner_username = 'Unknown'
        if metadata_content:
            metadata = json.loads(metadata_content)
            display_filename = metadata.get('display_filename', public_id)
            display_username = metadata.get('display_username', 'Unknown')
            owner_username = metadata.get('owner_username', 'Unknown')

        current_username = session.get('username')
        is_owner = current_username == owner_username
        is_authenticated = current_username is not None
        can_edit = is_owner
        if current_username and permissions_content:
            permitted_users = json.loads(
                permissions_content) if permissions_content else []
            can_edit = is_owner or current_username in permitted_users

        is_admin = False
        if current_username:
            user = User.query.filter_by(username=current_username).first()
            is_admin = user.user_type == 'admin' if user else False

        escaped_content = content.replace('`', '\\`').replace('\n', '\\n')

        return render_template(
            'public_file.html',
            files=None,
            content=escaped_content,
            display_filename=display_filename,
            display_username=display_username,
            public_id=public_id,
            is_owner=is_owner,
            is_admin=is_admin,
            is_authenticated=is_authenticated,
            can_edit=can_edit
        )
    except Exception as e:
        logging.error(f"Error viewing public file {public_id}: {str(e)}")
        abort(500)


@public_bp.route('/comments/<public_id>', methods=['GET'])
def get_comments(public_id):
    try:
        comments_path = f"{PUBLISH_DIR_GCS}/{public_id}.comments.json" if gcs_client.enabled else os.path.join(
            PUBLISH_DIR_LOCAL, f"{public_id}.comments.json")

        if gcs_client.enabled:
            comments_content = gcs_client.read_file(comments_path)
        else:
            if not os.path.exists(comments_path):
                return jsonify({'success': True, 'comments': []})
            with open(comments_path, 'r', encoding='utf-8') as f:
                comments_content = f.read()

        comments = json.loads(comments_content) if comments_content else []
        return jsonify({'success': True, 'comments': comments})
    except Exception as e:
        logging.error(
            f"Error fetching comments for file {public_id}: {str(e)}")
        # Return empty list on error
        return jsonify({'success': True, 'comments': []})


@public_bp.route('/comment/<public_id>', methods=['POST'])
@login_required
def add_comment(public_id):
    username = session.get('username')
    data = request.get_json()
    comment_text = data.get('comment')
    if not comment_text:
        return jsonify({'success': False, 'error': 'Comment is required'}), 400

    try:
        comments_path = f"{PUBLISH_DIR_GCS}/{public_id}.comments.json" if gcs_client.enabled else os.path.join(
            PUBLISH_DIR_LOCAL, f"{public_id}.comments.json")

        # Read existing comments
        if gcs_client.enabled:
            comments_content = gcs_client.read_file(comments_path)
        else:
            comments_content = None
            if os.path.exists(comments_path):
                with open(comments_path, 'r', encoding='utf-8') as f:
                    comments_content = f.read()

        comments = json.loads(comments_content) if comments_content else []

        # Add new comment
        comments.append({
            'username': username,
            'text': comment_text,
            'created_at': datetime.utcnow().isoformat()
        })

        # Write back
        if gcs_client.enabled:
            gcs_client.write_file(comments_path, json.dumps(comments))
        else:
            with open(comments_path, 'w', encoding='utf-8') as f:
                json.dump(comments, f)

        logging.info(f"Comment added to file {public_id} by user {username}")
        return jsonify({'success': True})
    except Exception as e:
        logging.error(f"Error adding comment to file {public_id}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@public_bp.route('/permissions/<public_id>', methods=['GET'])
@login_required
def get_permissions(public_id):
    username = session.get('username')
    try:
        metadata_path = f"{PUBLISH_DIR_GCS}/{public_id}.meta" if gcs_client.enabled else os.path.join(
            PUBLISH_DIR_LOCAL, f"{public_id}.meta")
        permissions_path = f"{PUBLISH_DIR_GCS}/{public_id}.permissions.json" if gcs_client.enabled else os.path.join(
            PUBLISH_DIR_LOCAL, f"{public_id}.permissions.json")

        # Check ownership
        if gcs_client.enabled:
            metadata_content = gcs_client.read_file(metadata_path)
        else:
            with open(metadata_path, 'r', encoding='utf-8') as f:
                metadata_content = f.read()

        metadata = json.loads(metadata_content)
        if metadata.get('owner_username') != username:
            logging.warning(
                f"User {username} attempted to access permissions for file {public_id} without ownership")
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403

        # Read permissions
        if gcs_client.enabled:
            permissions_content = gcs_client.read_file(permissions_path)
        else:
            if not os.path.exists(permissions_path):
                return jsonify({'success': True, 'permitted_users': []})
            with open(permissions_path, 'r', encoding='utf-8') as f:
                permissions_content = f.read()

        permitted_users = json.loads(
            permissions_content) if permissions_content else []
        return jsonify({'success': True, 'permitted_users': permitted_users})
    except Exception as e:
        logging.error(
            f"Error fetching permissions for file {public_id}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@public_bp.route('/permissions/<public_id>', methods=['POST'])
@login_required
def add_permission(public_id):
    username = session.get('username')
    data = request.get_json()
    target_username = data.get('username')
    if not target_username:
        return jsonify({'success': False, 'error': 'Username is required'}), 400

    try:
        metadata_path = f"{PUBLISH_DIR_GCS}/{public_id}.meta" if gcs_client.enabled else os.path.join(
            PUBLISH_DIR_LOCAL, f"{public_id}.meta")
        permissions_path = f"{PUBLISH_DIR_GCS}/{public_id}.permissions.json" if gcs_client.enabled else os.path.join(
            PUBLISH_DIR_LOCAL, f"{public_id}.permissions.json")

        # Check ownership
        if gcs_client.enabled:
            metadata_content = gcs_client.read_file(metadata_path)
        else:
            with open(metadata_path, 'r', encoding='utf-8') as f:
                metadata_content = f.read()

        metadata = json.loads(metadata_content)
        if metadata.get('owner_username') != username:
            logging.warning(
                f"User {username} attempted to add permission for file {public_id} without ownership")
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403

        # Check if target user exists
        target_user = User.query.filter_by(username=target_username).first()
        if not target_user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        # Read existing permissions
        if gcs_client.enabled:
            permissions_content = gcs_client.read_file(permissions_path)
        else:
            permissions_content = None
            if os.path.exists(permissions_path):
                with open(permissions_path, 'r', encoding='utf-8') as f:
                    permissions_content = f.read()

        permitted_users = json.loads(
            permissions_content) if permissions_content else []

        # Check if permission already exists
        if target_username in permitted_users:
            return jsonify({'success': False, 'error': 'User already has edit permission'}), 400

        # Add new permission
        permitted_users.append(target_username)

        # Write back
        if gcs_client.enabled:
            gcs_client.write_file(
                permissions_path, json.dumps(permitted_users))
        else:
            with open(permissions_path, 'w', encoding='utf-8') as f:
                json.dump(permitted_users, f)

        logging.info(
            f"Edit permission granted to {target_username} for file {public_id} by {username}")
        return jsonify({'success': True})
    except Exception as e:
        logging.error(
            f"Error adding permission for file {public_id}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@public_bp.route('/permissions/<public_id>', methods=['DELETE'])
@login_required
def remove_permission(public_id):
    username = session.get('username')
    data = request.get_json()
    target_username = data.get('username')
    if not target_username:
        return jsonify({'success': False, 'error': 'Username is required'}), 400

    try:
        metadata_path = f"{PUBLISH_DIR_GCS}/{public_id}.meta" if gcs_client.enabled else os.path.join(
            PUBLISH_DIR_LOCAL, f"{public_id}.meta")
        permissions_path = f"{PUBLISH_DIR_GCS}/{public_id}.permissions.json" if gcs_client.enabled else os.path.join(
            PUBLISH_DIR_LOCAL, f"{public_id}.permissions.json")

        # Check ownership
        if gcs_client.enabled:
            metadata_content = gcs_client.read_file(metadata_path)
        else:
            with open(metadata_path, 'r', encoding='utf-8') as f:
                metadata_content = f.read()

        metadata = json.loads(metadata_content)
        if metadata.get('owner_username') != username:
            logging.warning(
                f"User {username} attempted to remove permission for file {public_id} without ownership")
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403

        # Read existing permissions
        if gcs_client.enabled:
            permissions_content = gcs_client.read_file(permissions_path)
        else:
            if not os.path.exists(permissions_path):
                return jsonify({'success': False, 'error': 'Permission not found'}), 404
            with open(permissions_path, 'r', encoding='utf-8') as f:
                permissions_content = f.read()

        permitted_users = json.loads(
            permissions_content) if permissions_content else []

        # Check if permission exists
        if target_username not in permitted_users:
            return jsonify({'success': False, 'error': 'Permission not found'}), 404

        # Remove permission
        permitted_users.remove(target_username)

        # Write back
        if gcs_client.enabled:
            gcs_client.write_file(
                permissions_path, json.dumps(permitted_users))
        else:
            with open(permissions_path, 'w', encoding='utf-8') as f:
                json.dump(permitted_users, f)

        logging.info(
            f"Edit permission removed for {target_username} for file {public_id} by {username}")
        return jsonify({'success': True})
    except Exception as e:
        logging.error(
            f"Error removing permission for file {public_id}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@public_bp.route('/cv')
def cv():
    try:
        logging.info("Rendering CV page")
        return render_template('cv.html')
    except Exception as e:
        logging.error(f"Error rendering CV page: {str(e)}")
        abort(500)
