# src/blueprints/auth.py
from flask import Blueprint, request, redirect, url_for, flash, session, make_response, jsonify, current_app, render_template
from src.database import db
from src.models import User
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import logging
from google.oauth2 import id_token
from google.auth.transport import requests
from itsdangerous import URLSafeTimedSerializer, SignatureExpired
from flask_mail import Message
import os
import requests as http_requests
from src.utils import generate_unique_username

auth_bp = Blueprint('auth', __name__)

# Configuration from environment variables (loaded lazily to ensure dotenv is loaded)
def get_config():
    return {
        'GOOGLE_CLIENT_ID': os.getenv("GOOGLE_CLIENT_ID"),
        'GITHUB_CLIENT_ID': os.getenv("GITHUB_CLIENT_ID"),
        'GITHUB_CLIENT_SECRET': os.getenv("GITHUB_CLIENT_SECRET"),
        'SERIALIZER_SECRET_KEY': os.getenv("SERIALIZER_SECRET_KEY", 'fallback-serializer-key')
    }

def get_serializer():
    config = get_config()
    return URLSafeTimedSerializer(config['SERIALIZER_SECRET_KEY'])

# Configure logging
logging.basicConfig(level=logging.DEBUG)


@auth_bp.route('/google-client-id', methods=['GET'])
def get_google_client_id():
    """Return Google Client ID for frontend OAuth initialization."""
    config = get_config()
    google_client_id = config['GOOGLE_CLIENT_ID']
    logging.debug(f"Google Client ID requested: {google_client_id}")
    if not google_client_id:
        logging.error("GOOGLE_CLIENT_ID environment variable not set")
        return jsonify({'error': 'Google Client ID not configured'}), 500
    return jsonify({'client_id': google_client_id})


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to access this page.')
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorated_function


@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        email = request.form['email']
        username = request.form['username']
        password = request.form['password']
        logging.debug(f"Attempting to register user: {username}")

        if User.query.filter_by(email=email).first():
            flash('Email already exists.')
            return redirect(url_for('auth.register'))

        unique_username = generate_unique_username(username)
        if unique_username != username:
            flash(
                f'Username {username} was taken. Assigned username: {unique_username}')

        try:
            hashed_password = generate_password_hash(password)
            user = User(email=email, username=unique_username,
                        password=hashed_password, user_type='normal')  # Updated to 'normal'
            db.session.add(user)
            db.session.commit()
            session['user_id'] = user.id
            session['username'] = unique_username
            session['user_type'] = user.user_type
            flash('Registration successful! You are now logged in.')
            return redirect(url_for('editor.editor'))
        except Exception as e:
            db.session.rollback()
            logging.error(f"Error during registration: {str(e)}")
            flash('Registration failed. Please try again.')
            return redirect(url_for('auth.register'))

    return render_template('register.html')


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        logging.debug(f"Login attempt: username={username}")

        user = User.query.filter_by(username=username).first()

        if user:
            if user.password in ['google_auth', 'github_auth']:
                flash(
                    f'This account uses {user.password.replace("_auth", "").capitalize()} Sign-In. Please use that method.')
                return redirect(url_for('index'))
            if check_password_hash(user.password, password):
                session['user_id'] = user.id
                session['username'] = username
                session['user_type'] = user.user_type
                flash('Login successful!')
                return redirect(url_for('auth.selection'))
            else:
                flash('Invalid username or password.')
        else:
            flash('Invalid username or password.')

        return redirect(url_for('index'))

    return redirect(url_for('index'))


@auth_bp.route('/google-login', methods=['POST'])
def google_login():
    token = request.form.get('id_token')
    logging.debug(f"Received id_token: {token}")
    if not token:
        logging.error("Google Sign-In failed: Missing token")
        flash("Google Sign-In failed: Missing token.", "error")
        return jsonify({"error": "Missing token"}), 400

    try:
        config = get_config()
        idinfo = id_token.verify_oauth2_token(
            token, requests.Request(), config['GOOGLE_CLIENT_ID'])
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError("Wrong issuer.")

        email = idinfo['email']
        base_username = idinfo.get('name', email.split('@')[0])
        user = User.query.filter_by(email=email).first()

        if not user:
            unique_username = generate_unique_username(base_username)
            user = User(email=email, username=unique_username,
                        password='google_auth', user_type='normal')  # Updated to 'normal'
            db.session.add(user)
            db.session.commit()

        session['user_id'] = user.id
        session['username'] = user.username
        session['email'] = email
        session['user_type'] = user.user_type
        logging.info(f"Google Sign-In successful: {user.username}")
        flash("Google Sign-In successful!", "success")
        return jsonify({"redirect": url_for('auth.selection')}), 200

    except ValueError as e:
        logging.error(f"Google Sign-In failed: {str(e)}")
        flash(f"Google Sign-In failed: {str(e)}", "error")
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        db.session.rollback()
        logging.error(f"Server error in Google Sign-In: {str(e)}")
        flash("Google Sign-In failed. Please try again.", "error")
        return jsonify({"error": str(e)}), 500


@auth_bp.route('/selection')
def selection():
    if 'user_id' not in session:
        flash('Please log in to access this page.')
        return redirect(url_for('index'))
    user_type = session.get('user_type', 'normal')  # Default to '== 'normal'
    return render_template('selection.html', user_type=user_type)


@auth_bp.route('/logout')
def logout():
    session.clear()
    response = make_response(redirect(url_for('index')))
    response.delete_cookie('session')
    flash('You have been logged out.')
    return response


@auth_bp.route('/reset_password', methods=['POST'])
def reset_password():
    email = request.json['email']
    user = User.query.filter_by(email=email).first()

    if user:
        s = get_serializer()
        token = s.dumps(email, salt='password-reset-salt')
        reset_url = url_for('auth.reset_token', token=token, _external=True)
        msg = Message('Password Reset Request',
                      sender=current_app.config['MAIL_USERNAME'],
                      recipients=[email])
        msg.body = f'To reset your password, visit the following link: {reset_url}'
        current_app.extensions['mail'].send(msg)
        return jsonify({'message': 'An email has been sent with instructions to reset your password.'}), 200
    else:
        return jsonify({'message': 'No account found with that email address.'}), 404


@auth_bp.route('/reset_token/<token>', methods=['GET', 'POST'])
def reset_token(token):
    try:
        s = get_serializer()
        email = s.loads(token, salt='password-reset-salt', max_age=3600)
    except SignatureExpired:
        flash('The password reset link has expired.', 'error')
        return redirect(url_for('auth.reset_password'))

    if request.method == 'POST':
        new_password = request.form['password']
        user = User.query.filter_by(email=email).first()
        if user:
            user.password = generate_password_hash(new_password)
            db.session.commit()
            flash('Your password has been updated!', 'success')
            return redirect(url_for('auth.login'))

    return render_template('reset_token.html', token=token)


@auth_bp.route('/github-login')
def github_login():
    config = get_config()
    callback_url = url_for('auth.github_callback', _external=True)
    logging.info(f"GitHub OAuth redirect URI: {callback_url}")
    
    github_auth_url = (
        f"https://github.com/login/oauth/authorize?"
        f"client_id={config['GITHUB_CLIENT_ID']}&"
        f"redirect_uri={callback_url}&"
        f"scope=user:email&"
        f"prompt=select_account"
    )
    logging.info(f"Redirecting to GitHub: {github_auth_url}")
    return redirect(github_auth_url)


@auth_bp.route('/github-callback')
def github_callback():
    code = request.args.get('code')
    if not code:
        logging.error("GitHub Sign-In failed: Missing authorization code")
        flash("GitHub Sign-In failed: Missing authorization code.", "error")
        return redirect(url_for('index'))

    try:
        config = get_config()
        token_url = "https://github.com/login/oauth/access_token"
        token_data = {
            "client_id": config['GITHUB_CLIENT_ID'],
            "client_secret": config['GITHUB_CLIENT_SECRET'],
            "code": code,
            "redirect_uri": url_for('auth.github_callback', _external=True)
        }
        headers = {"Accept": "application/json"}
        logging.debug(f"Sending token request: {token_data}")
        token_response = http_requests.post(
            token_url, data=token_data, headers=headers)
        token_json = token_response.json()
        logging.debug(f"Token response: {token_json}")

        if "error" in token_json:
            logging.error(
                f"GitHub Sign-In failed: {token_json['error_description']}")
            flash(
                f"GitHub Sign-In failed: {token_json['error_description']}", "error")
            return redirect(url_for('index'))

        access_token = token_json.get("access_token")
        if not access_token:
            logging.error("GitHub Sign-In failed: No access token received")
            flash("GitHub Sign-In failed: No access token received.", "error")
            return redirect(url_for('index'))

        user_url = "https://api.github.com/user"
        headers = {"Authorization": f"Bearer {access_token}",
                   "Accept": "application/json"}
        user_response = http_requests.get(user_url, headers=headers)
        user_data = user_response.json()
        logging.debug(f"User data: {user_data}")

        email_url = "https://api.github.com/user/emails"
        email_response = http_requests.get(email_url, headers=headers)
        email_data = email_response.json()
        logging.debug(f"Email data: {email_data}")
        email = next(
            (email["email"] for email in email_data if email["primary"] and email["verified"]), None)

        if not email:
            logging.error(
                "GitHub Sign-In failed: No verified primary email found")
            flash("GitHub Sign-In failed: No verified primary email found.", "error")
            return redirect(url_for('index'))

        user = User.query.filter_by(email=email).first()
        base_username = user_data.get("login", email.split('@')[0])

        if not user:
            unique_username = generate_unique_username(base_username)
            user = User(email=email, username=unique_username,
                        password='github_auth', user_type='normal')  # Updated to 'normal'
            db.session.add(user)
            db.session.commit()

        session['user_id'] = user.id
        session['username'] = user.username
        session['email'] = email
        session['user_type'] = user.user_type
        logging.info(f"GitHub Sign-In successful: {user.username}")
        flash("GitHub Sign-In successful!", "success")
        return redirect(url_for('auth.selection'))

    except Exception as e:
        db.session.rollback()
        logging.error(f"GitHub Sign-In failed: {str(e)}")
        flash("GitHub Sign-In failed. Please try again.", "error")
        return redirect(url_for('index'))
