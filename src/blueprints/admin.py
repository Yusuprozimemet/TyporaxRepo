from flask import Blueprint, render_template, request, flash, redirect, url_for, session, jsonify
from src.database import db
from src.models import User
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from datetime import datetime
import logging
from src.utils import create_zip_from_folder, create_zip_from_files, list_user_folders, list_md_files, ARTIFACTS_DIR
from src.gcs_utils import gcs_client
from flask import send_file
import os
import tempfile
import json
import uuid

admin_bp = Blueprint('admin', __name__)

# Notifications file path
NOTIFICATIONS_FILE = os.path.join(ARTIFACTS_DIR, 'notifications.json')

# Helper functions for notifications


def read_notifications():
    """Read notifications from notifications.json, supporting both local and GCS storage."""
    if gcs_client.enabled:
        try:
            content = gcs_client.read_file('artifacts/notifications.json')
            if content:
                return json.loads(content)
            return []
        except Exception as e:
            logging.error(f"Error reading notifications from GCS: {str(e)}")
            return []
    try:
        if os.path.exists(NOTIFICATIONS_FILE):
            with open(NOTIFICATIONS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []
    except Exception as e:
        logging.error(f"Error reading notifications from local file: {str(e)}")
        return []


def write_notification(notification):
    try:
        notifications = read_notifications()
        # Assign a unique id if not already present
        if 'id' not in notification:
            notification['id'] = str(uuid.uuid4().int >> 64)  # Store as string
        notifications.append(notification)
        content = json.dumps(notifications, indent=2)
        if gcs_client.enabled:
            gcs_client.write_file('artifacts/notifications.json', content)
        else:
            with open(NOTIFICATIONS_FILE, 'w', encoding='utf-8') as f:
                json.dump(notifications, f, indent=2)
        logging.info(f"Notification added: {notification['details']}")
    except Exception as e:
        logging.error(f"Error writing notification: {str(e)}")
        raise


# Admin login required decorator
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session or 'is_admin' not in session or not session['is_admin']:
            flash('Admin access required.')
            return redirect(url_for('admin.admin_login'))
        return f(*args, **kwargs)
    return decorated_function


@admin_bp.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        logging.debug(f"Admin login attempt: username={username}")

        user = User.query.filter_by(
            username=username, user_type='admin').first()
        if user and check_password_hash(user.password, password):
            session['user_id'] = user.id
            session['is_admin'] = True
            return redirect(url_for('admin.dashboard'))
        else:
            flash('Invalid admin credentials.')
            return redirect(url_for('admin.admin_login'))

    return render_template('admin_login.html')


@admin_bp.route('/admin/logout', methods=['GET'])
@admin_required
def admin_logout():
    try:
        session.pop('user_id', None)
        session.pop('is_admin', None)
        logging.info("Admin logged out successfully")
        flash('You have been logged out.')
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({'message': 'Logged out successfully'}), 200
        return redirect(url_for('admin.admin_login'))
    except Exception as e:
        logging.error(f"Error during admin logout: {str(e)}")
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({'message': f'Error during logout: {str(e)}'}), 500
        return redirect(url_for('admin.admin_login'))


@admin_bp.route('/admin/dashboard')
@admin_required
def dashboard():
    users = User.query.all()
    return render_template('admin.html', users=users)


@admin_bp.route('/admin/user/<int:user_id>', methods=['GET'])
@admin_required
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify({
        'id': user.id,
        'email': user.email,
        'username': user.username,
        'user_type': user.user_type,
        'subscription_start_date': user.subscription_start_date.strftime('%Y-%m-%d') if user.subscription_start_date else None,
        'next_billing_date': user.next_billing_date.strftime('%Y-%m-%d') if user.next_billing_date else None,
        'is_canceled': user.is_canceled,
        'profile_picture': user.profile_picture,
        'theme_preference': user.theme_preference,
        'language_preference': user.language_preference
    })


@admin_bp.route('/admin/user/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()

    try:
        # Track changes for notification
        changes = []
        if user.email != data.get('email', user.email):
            changes.append(
                f"Email changed from '{user.email}' to '{data.get('email')}'")
        if user.username != data.get('username', user.username):
            changes.append(
                f"Username changed from '{user.username}' to '{data.get('username')}'")
        if user.user_type != data.get('user_type', user.user_type):
            changes.append(
                f"User type changed from '{user.user_type}' to '{data.get('user_type')}'")
        if 'password' in data and data['password']:
            changes.append("Password updated")
        if user.profile_picture != data.get('profile_picture', user.profile_picture):
            changes.append(
                f"Profile picture changed to '{data.get('profile_picture')}'")
        if user.theme_preference != data.get('theme_preference', user.theme_preference):
            changes.append(
                f"Theme preference changed from '{user.theme_preference}' to '{data.get('theme_preference')}'")
        if user.language_preference != data.get('language_preference', user.language_preference):
            changes.append(
                f"Language preference changed from '{user.language_preference}' to '{data.get('language_preference')}'")
        if user.user_type == 'premium':
            if user.subscription_start_date != (datetime.strptime(data.get('subscription_start_date'), '%Y-%m-%d') if data.get('subscription_start_date') else None):
                changes.append(
                    f"Subscription start date changed to '{data.get('subscription_start_date')}'")
            if user.next_billing_date != (datetime.strptime(data.get('next_billing_date'), '%Y-%m-%d') if data.get('next_billing_date') else None):
                changes.append(
                    f"Next billing date changed to '{data.get('next_billing_date')}'")
            if user.is_canceled != data.get('is_canceled', user.is_canceled):
                changes.append(
                    f"Subscription canceled status changed to '{data.get('is_canceled')}'")

        # Update user fields
        user.email = data.get('email', user.email)
        user.username = data.get('username', user.username)

        user_type = data.get('user_type', user.user_type)
        if user_type not in ['normal', 'premium', 'admin']:
            return jsonify({'message': 'Invalid user type.'}), 400
        user.user_type = user_type

        subscription_start_date = data.get('subscription_start_date')
        next_billing_date = data.get('next_billing_date')
        is_canceled = data.get('is_canceled', user.is_canceled)

        if user_type == 'premium':
            if subscription_start_date:
                try:
                    user.subscription_start_date = datetime.strptime(
                        subscription_start_date, '%Y-%m-%d')
                except ValueError:
                    return jsonify({'message': 'Invalid subscription start date format. Use YYYY-MM-DD.'}), 400
            else:
                user.subscription_start_date = None

            if next_billing_date:
                try:
                    user.next_billing_date = datetime.strptime(
                        next_billing_date, '%Y-%m-%d')
                except ValueError:
                    return jsonify({'message': 'Invalid next billing date format. Use YYYY-MM-DD.'}), 400
            else:
                user.next_billing_date = None

            user.is_canceled = is_canceled
        else:
            user.subscription_start_date = None
            user.next_billing_date = None
            user.is_canceled = False

        if 'password' in data and data['password']:
            user.password = generate_password_hash(data['password'])

        user.profile_picture = data.get(
            'profile_picture', user.profile_picture)

        theme_preference = data.get('theme_preference', user.theme_preference)
        if theme_preference not in ['light', 'dark']:
            return jsonify({'message': 'Invalid theme preference.'}), 400
        user.theme_preference = theme_preference

        language_preference = data.get(
            'language_preference', user.language_preference)
        if language_preference not in ['dutch', 'english', 'italian', 'french', 'german', 'chinese', 'spanish', 'arabic', 'turkish', 'polish']:
            return jsonify({'message': 'Invalid language preference.'}), 400
        user.language_preference = language_preference

        db.session.commit()

        # Log notification if changes were made
        if changes:
            admin_user = User.query.get(session.get('user_id'))
            notification = {
                'user_id': user_id,
                'username': user.username,
                'action': 'updated',
                'details': '; '.join(changes),
                'timestamp': datetime.utcnow().isoformat(),
                'admin_username': admin_user.username if admin_user else 'Unknown'
            }
            write_notification(notification)

        logging.info(f"User {user_id} updated successfully")
        return jsonify({'message': 'User updated successfully.'}), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error updating user {user_id}: {str(e)}")
        return jsonify({'message': f'Error updating user: {str(e)}'}), 400


@admin_bp.route('/admin/user/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    if user.user_type == 'admin':
        return jsonify({'message': 'Cannot delete admin user.'}), 400
    try:
        db.session.delete(user)
        db.session.commit()

        # Log notification for user deletion
        admin_user = User.query.get(session.get('user_id'))
        notification = {
            'user_id': user_id,
            'username': user.username,
            'action': 'deleted',
            'details': f"User '{user.username}' was deleted",
            'timestamp': datetime.utcnow().isoformat(),
            'admin_username': admin_user.username if admin_user else 'Unknown'
        }
        write_notification(notification)

        logging.info(f"User {user_id} deleted successfully")
        return jsonify({'message': 'User deleted successfully.'}), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error deleting user {user_id}: {str(e)}")
        return jsonify({'message': 'Error deleting user.'}), 400


@admin_bp.route('/admin/user/create', methods=['POST'])
@admin_required
def create_user():
    data = request.get_json()

    try:
        email = data.get('email')
        username = data.get('username')
        password = data.get('password')
        user_type = data.get('user_type', 'normal')

        if not email or not username or not password:
            return jsonify({'message': 'Email, username, and password are required.'}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({'message': 'Email already exists.'}), 400
        if User.query.filter_by(username=username).first():
            return jsonify({'message': 'Username already exists.'}), 400

        if user_type not in ['normal', 'premium', 'admin']:
            return jsonify({'message': 'Invalid user type.'}), 400

        user = User(
            email=email,
            username=username,
            password=generate_password_hash(password),
            user_type=user_type,
            theme_preference=data.get('theme_preference', 'light'),
            language_preference=data.get('language_preference', 'dutch'),
            profile_picture=data.get('profile_picture')
        )

        if user_type == 'premium':
            subscription_start_date = data.get('subscription_start_date')
            next_billing_date = data.get('next_billing_date')
            is_canceled = data.get('is_canceled', False)

            if subscription_start_date:
                try:
                    user.subscription_start_date = datetime.strptime(
                        subscription_start_date, '%Y-%m-%d')
                except ValueError:
                    return jsonify({'message': 'Invalid subscription start date format. Use YYYY-MM-DD.'}), 400

            if next_billing_date:
                try:
                    user.next_billing_date = datetime.strptime(
                        next_billing_date, '%Y-%m-%d')
                except ValueError:
                    return jsonify({'message': 'Invalid next billing date format. Use YYYY-MM-DD.'}), 400

            user.is_canceled = is_canceled

        db.session.add(user)
        db.session.commit()

        # Log notification for user creation
        admin_user = User.query.get(session.get('user_id'))
        notification = {
            'user_id': user.id,
            'username': user.username,
            'action': 'created',
            'details': f"User created with email '{email}', user type '{user_type}'",
            'timestamp': datetime.utcnow().isoformat(),
            'admin_username': admin_user.username if admin_user else 'Unknown'
        }
        write_notification(notification)

        logging.info(f"User {username} created successfully")
        return jsonify({'message': 'User created successfully.'}), 201
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error creating user: {str(e)}")
        return jsonify({'message': f'Error creating user: {str(e)}'}), 400


@admin_bp.route('/admin/notifications', methods=['GET'])
@admin_required
def get_notifications():
    try:
        notifications = read_notifications()
        # Sort by timestamp descending
        notifications.sort(key=lambda x: x['timestamp'], reverse=True)
        return jsonify(notifications), 200
    except Exception as e:
        logging.error(f"Error retrieving notifications: {str(e)}")
        return jsonify({'message': f'Error retrieving notifications: {str(e)}'}), 500


@admin_bp.route('/admin/notification/<notification_id>', methods=['DELETE'])
@admin_required
def delete_notification(notification_id):
    try:
        # Treat notification_id as a string
        notifications = read_notifications()
        # Compare IDs as strings
        new_notifications = [n for n in notifications if str(
            n.get('id')) != notification_id]
        if len(new_notifications) == len(notifications):
            return jsonify({'message': 'Notification not found.'}), 404

        content = json.dumps(new_notifications, indent=2)
        if gcs_client.enabled:
            gcs_client.write_file('artifacts/notifications.json', content)
        else:
            with open(NOTIFICATIONS_FILE, 'w', encoding='utf-8') as f:
                f.write(content)

        return jsonify({'message': 'Notification deleted.'}), 200
    except Exception as e:
        logging.error(f"Error deleting notification: {str(e)}")
        return jsonify({'message': f'Error deleting notification: {str(e)}'}), 500


@admin_bp.route('/admin/users', methods=['GET'])
@admin_required
def get_users():
    try:
        users = User.query.all()
        user_list = [{'id': user.id, 'username': user.username}
                     for user in users]
        logging.info(f"Retrieved {len(user_list)} users for admin")
        return jsonify(user_list), 200
    except Exception as e:
        logging.error(f"Error retrieving users: {str(e)}")
        return jsonify({'message': f'Error retrieving users: {str(e)}'}), 500


@admin_bp.route('/admin/folders/<username>', methods=['GET'])
@admin_required
def get_user_folders(username):
    try:
        user = User.query.filter_by(username=username).first()
        if not user:
            logging.error(f"User {username} not found")
            return jsonify({'message': 'User not found'}), 404

        folders = list_user_folders(username)
        logging.info(f"Retrieved {len(folders)} folders for user {username}")
        return jsonify({'folders': folders}), 200
    except Exception as e:
        logging.error(
            f"Error retrieving folders for user {username}: {str(e)}")
        return jsonify({'message': f'Error retrieving folders: {str(e)}'}), 500


@admin_bp.route('/admin/files/<username>', methods=['GET'])
@admin_required
def get_user_files(username):
    try:
        user = User.query.filter_by(username=username).first()
        if not user:
            logging.error(f"User {username} not found")
            return jsonify({'message': 'User not found'}), 404

        folder = request.args.get('folder', '')
        files = list_md_files(username, folder)
        logging.info(
            f"Retrieved {len(files)} files for user {username} in folder '{folder or 'root'}'")
        return jsonify({'files': files}), 200
    except Exception as e:
        logging.error(
            f"Error retrieving files for user {username} in folder {folder}: {str(e)}")
        return jsonify({'message': f'Error retrieving files: {str(e)}'}), 500


@admin_bp.route('/download_folder', methods=['POST'])
@admin_required
def download_folder():
    try:
        data = request.get_json()
        username = data.get('username')
        folder = data.get('folder', '')

        if not username:
            logging.error("Username is required for folder download")
            return jsonify({'message': 'Username is required'}), 400

        user = User.query.filter_by(username=username).first()
        if not user:
            logging.error(f"User {username} not found")
            return jsonify({'message': 'User not found'}), 404

        # Create a temporary ZIP file
        temp_dir = tempfile.gettempdir()
        zip_filename = f"{username}_{folder or 'root'}_files.zip"
        zip_path = os.path.join(temp_dir, zip_filename)

        # Create ZIP file for the folder
        create_zip_from_folder(username, folder, zip_path)
        logging.info(
            f"ZIP file created for folder '{folder or 'root'}' for user {username} at {zip_path}")

        # Send the file as a download
        return send_file(
            zip_path,
            as_attachment=True,
            download_name=zip_filename,
            mimetype='application/zip'
        )
    except FileNotFoundError as e:
        logging.error(f"Folder download error: {str(e)}")
        return jsonify({'message': str(e)}), 404
    except Exception as e:
        logging.error(
            f"Error downloading folder for user {username}: {str(e)}")
        return jsonify({'message': f'Error downloading folder: {str(e)}'}), 500
    finally:
        if 'zip_path' in locals() and os.path.exists(zip_path):
            try:
                os.remove(zip_path)
                logging.debug(f"Cleaned up temporary file: {zip_path}")
            except Exception as e:
                logging.error(
                    f"Error cleaning up temporary file {zip_path}: {str(e)}")


@admin_bp.route('/download_files', methods=['POST'])
@admin_required
def download_files():
    try:
        data = request.get_json()
        username = data.get('username')
        folder = data.get('folder', '')
        files = data.get('files', [])

        if not username:
            logging.error("Username is required for file download")
            return jsonify({'message': 'Username is required'}), 400
        if not files:
            logging.error("At least one file must be specified for download")
            return jsonify({'message': 'At least one file must be specified'}), 400

        user = User.query.filter_by(username=username).first()
        if not user:
            logging.error(f"User {username} not found")
            return jsonify({'message': 'User not found'}), 404

        if not all(file.endswith('.md') for file in files):
            logging.error("Only .md files can be downloaded")
            return jsonify({'message': 'Only .md files can be downloaded'}), 400

        temp_dir = tempfile.gettempdir()
        zip_filename = f"{username}_{folder or 'root'}_selected_files.zip"
        zip_path = os.path.join(temp_dir, zip_filename)

        create_zip_from_files(username, folder, files, zip_path)
        logging.info(
            f"ZIP file created for {len(files)} files in folder '{folder or 'root'}' for user {username} at {zip_path}")

        return send_file(
            zip_path,
            as_attachment=True,
            download_name=zip_filename,
            mimetype='application/zip'
        )
    except FileNotFoundError as e:
        logging.error(f"File download error: {str(e)}")
        return jsonify({'message': str(e)}), 404
    except Exception as e:
        logging.error(f"Error downloading files for user {username}: {str(e)}")
        return jsonify({'message': f'Error downloading files: {str(e)}'}), 500
    finally:
        if 'zip_path' in locals() and os.path.exists(zip_path):
            try:
                os.remove(zip_path)
                logging.debug(f"Cleaned up temporary file: {zip_path}")
            except Exception as e:
                logging.error(
                    f"Error cleaning up temporary file {zip_path}: {str(e)}")


@admin_bp.route('/admin/download-db')
@admin_required
def download_db():
    from flask import current_app
    basedir = os.path.abspath(os.path.dirname(current_app.root_path))
    db_path = os.path.join(basedir, 'users.db')
    logging.info(f"Admin downloading database from: {db_path}")

    if not os.path.exists(db_path):
        flash('Database file not found.', 'danger')
        return redirect(url_for('admin.dashboard'))

    return send_file(
        db_path,
        as_attachment=True,
        download_name='users.db',
        mimetype='application/octet-stream'
    )
