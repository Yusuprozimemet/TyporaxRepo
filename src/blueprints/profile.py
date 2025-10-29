from flask import Blueprint, jsonify, session, request
from src.database import db
from src.models import User
from werkzeug.security import generate_password_hash, check_password_hash
from .auth import login_required
import logging
import re
import base64
from datetime import datetime
import json
import os
from src.utils import ARTIFACTS_DIR
from src.gcs_utils import gcs_client
import uuid

profile_bp = Blueprint('profile', __name__)

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


def is_valid_email(email):
    """Validate email format."""
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(email_pattern, email) is not None


def is_valid_username(username):
    """Validate username (alphanumeric, 3-80 characters)."""
    return 3 <= len(username) <= 80 and re.match(r'^[a-zA-Z0-9_]+$', username)


def is_valid_password(password):
    """Validate password (at least 8 characters, 1 letter, 1 number)."""
    return len(password) >= 8 and re.search(r'[a-zA-Z]', password) and re.search(r'[0-9]', password)


@profile_bp.route('/get_profile')
@login_required
def get_profile():
    try:
        user_id = session.get('user_id')
        user = User.query.get(user_id)
        if not user:
            logging.warning("No user found in session")
            return jsonify({'error': 'No user logged in'}), 401

        logging.info(f"Profile fetched for user: {user.username}")
        return jsonify({
            'username': user.username,
            'email': user.email,
            'user_type': user.user_type,
            'subscription_start_date': user.subscription_start_date.strftime('%Y-%m-%d') if user.subscription_start_date else None,
            'next_billing_date': user.next_billing_date.strftime('%Y-%m-%d') if user.next_billing_date else None,
            'is_canceled': user.is_canceled,
            'profile_picture': user.profile_picture,
            'theme_preference': user.theme_preference,
            'language_preference': user.language_preference
        })
    except Exception as e:
        logging.error(f"Error fetching profile: {str(e)}")
        return jsonify({'error': str(e)}), 500


@profile_bp.route('/update_profile', methods=['POST'])
@login_required
def update_profile():
    try:
        user_id = session.get('user_id')
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'No user logged in'}), 401

        data = request.form  # Use form data for text fields
        files = request.files  # Use files for profile picture upload

        # Track changes for notification
        changes = []

        # Update email
        email = data.get('email', user.email).strip()
        if email != user.email:
            if not is_valid_email(email):
                return jsonify({'error': 'Invalid email format'}), 400
            if User.query.filter_by(email=email).first():
                return jsonify({'error': 'Email already in use'}), 400
            changes.append(f"Email changed from '{user.email}' to '{email}'")
            user.email = email

        # Update username
        username = data.get('username', user.username).strip()
        if username != user.username:
            if not is_valid_username(username):
                return jsonify({'error': 'Username must be 3-80 characters, alphanumeric'}), 400
            if User.query.filter_by(username=username).first():
                return jsonify({'error': 'Username already in use'}), 400
            changes.append(
                f"Username changed from '{user.username}' to '{username}'")
            user.username = username

        # Update password
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        if current_password and new_password:
            if not check_password_hash(user.password, current_password):
                return jsonify({'error': 'Current password is incorrect'}), 400
            if not is_valid_password(new_password):
                return jsonify({'error': 'New password must be at least 8 characters with letters and numbers'}), 400
            changes.append("Password updated")
            user.password = generate_password_hash(new_password)
        elif new_password and not current_password:
            return jsonify({'error': 'Current password required to set new password'}), 400

        # Update profile picture
        if 'profile_picture' in files:
            file = files['profile_picture']
            if file and file.filename:
                if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                    return jsonify({'error': 'Profile picture must be PNG or JPG'}), 400
                # Read file as base64
                file_data = file.read()
                if len(file_data) > 1_000_000:  # Limit to 1MB
                    return jsonify({'error': 'Profile picture must be under 1MB'}), 400
                new_profile_picture = base64.b64encode(
                    file_data).decode('utf-8')
                if user.profile_picture != new_profile_picture:
                    changes.append("Profile picture updated")
                    user.profile_picture = new_profile_picture

        # Update theme preference
        theme_preference = data.get('theme_preference', user.theme_preference)
        if theme_preference not in ['light', 'dark']:
            return jsonify({'error': 'Invalid theme preference'}), 400
        if theme_preference != user.theme_preference:
            changes.append(
                f"Theme preference changed from '{user.theme_preference}' to '{theme_preference}'")
            user.theme_preference = theme_preference

        # Update language preference
        language_preference = data.get(
            'language_preference', user.language_preference)
        if language_preference not in ['dutch', 'english', 'italian', 'french', 'german', 'chinese', 'spanish', 'arabic', 'turkish', 'polish']:
            return jsonify({'error': 'Invalid language preference'}), 400
        if language_preference != user.language_preference:
            changes.append(
                f"Language preference changed from '{user.language_preference}' to '{language_preference}'")
            user.language_preference = language_preference

        # Update subscription cancellation (for premium users)
        if user.user_type == 'premium' and 'is_canceled' in data:
            is_canceled = data.get('is_canceled').lower() == 'true'
            if user.is_canceled != is_canceled:
                changes.append(
                    f"Subscription canceled status changed to '{is_canceled}'")
                user.is_canceled = is_canceled

        # Commit changes to database
        db.session.commit()

        # Log notification if changes were made
        if changes:
            notification = {
                'user_id': user_id,
                'username': user.username,
                'action': 'updated',
                'details': '; '.join(changes),
                'timestamp': datetime.utcnow().isoformat(),
                'admin_username': user.username  # User is editing their own profile
            }
            write_notification(notification)

        logging.info(f"Profile updated for user: {user.username}")
        return jsonify({'message': 'Profile updated successfully', 'profile': {
            'username': user.username,
            'email': user.email,
            'user_type': user.user_type,
            'subscription_start_date': user.subscription_start_date.strftime('%Y-%m-%d') if user.subscription_start_date else None,
            'next_billing_date': user.next_billing_date.strftime('%Y-%m-%d') if user.next_billing_date else None,
            'is_canceled': user.is_canceled,
            'profile_picture': user.profile_picture,
            'theme_preference': user.theme_preference,
            'language_preference': user.language_preference
        }}), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error updating profile: {str(e)}")
        return jsonify({'error': str(e)}), 500


@profile_bp.route('/delete_account', methods=['POST'])
@login_required
def delete_account():
    try:
        user_id = session.get('user_id')
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'No user logged in'}), 401

        # Prevent admin deletion
        if user.user_type == 'admin':
            return jsonify({'error': 'Admin accounts cannot be deleted via profile'}), 403

        # Log notification before deletion
        notification = {
            'user_id': user_id,
            'username': user.username,
            'action': 'deleted',
            'details': f"User '{user.username}' deleted their own account",
            'timestamp': datetime.utcnow().isoformat(),
            'admin_username': user.username  # User is deleting their own account
        }
        write_notification(notification)

        # Delete user
        db.session.delete(user)
        db.session.commit()
        session.clear()
        logging.info(f"Account deleted for user: {user.username}")
        return jsonify({'message': 'Account deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error deleting account: {str(e)}")
        return jsonify({'error': str(e)}), 500
