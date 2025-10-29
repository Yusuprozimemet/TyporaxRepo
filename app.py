from src.blueprints.public import public_bp
from src.blueprints.sharing import sharing_bp
from src.blueprints.upgrade import upgrade_bp
from src.blueprints.admin import admin_bp
from src.blueprints.typo import typo_bp
from src.blueprints.practice import practice_bp
from src.blueprints.profile import profile_bp
from src.blueprints.dailyword import dailyword_bp
from src.blueprints.audio import audio_bp
from src.blueprints.openai import openai_bp
from src.blueprints.schedule import bp as schedule_bp
from src.blueprints.progress import progress_bp
from src.blueprints.email import email_bp
from src.blueprints.wordbank import wordbank_bp
from src.blueprints.files import files_bp
from src.blueprints.editor import editor_bp
from src.blueprints.auth import auth_bp
from src.models import User
import os
import yaml
import logging
from flask import Flask, render_template, session
from src.mail_config import mail  # Import shared mail instance
from src.database import db  # Import db from database.py
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize logging
logging.basicConfig(level=logging.DEBUG)
logging.getLogger('sqlalchemy.engine').setLevel(
    logging.INFO)  # Enable SQLAlchemy logging

# Initialize Flask app
app = Flask(__name__,
            template_folder='src/templates',
            static_folder='src/static',
            static_url_path='/static')

# Load config from YAML (keeping for backward compatibility, but email will use env vars)
config_path = os.path.join(os.path.dirname(__file__), 'config.yaml')
if os.path.exists(config_path):
    with open(config_path, 'r') as config_file:
        config = yaml.safe_load(config_file) or {}  # Handle None case
        app.config['EMAIL_CONFIG'] = config.get('email', {})
else:
    app.config['EMAIL_CONFIG'] = {}

# Database configuration
basedir = os.path.abspath(os.path.dirname(__file__))
database_url = os.environ.get('DATABASE_URL')
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url or 'sqlite:///' + \
    os.path.join(basedir, 'users.db').replace('\\', '/')
# <-- Add this line
logging.info(f"Database file path: {os.path.join(basedir, 'users.db')}")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ECHO'] = True  # Log SQL statements


# Initialize SQLAlchemy with app
db.init_app(app)

# Import models after db initialization

# Create database tables
with app.app_context():
    try:
        db.create_all()
        logging.info("Database tables created or verified.")
        # Debug: List tables
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        logging.info(f"Tables in database after create_all: {tables}")
    except Exception as e:
        logging.error(f"Error creating database tables: {str(e)}")

# Import Blueprints

# App configuration
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'fallback_secret_key')
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'src', 'static', 'img')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['ARTIFACTS_DIR'] = os.path.join(
    os.path.dirname(__file__), 'src', 'artifacts')

# Session configuration
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', 'fallback_secret_key')

# Email configuration - now using environment variables
app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', '587'))
app.config['MAIL_USE_TLS'] = os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true'
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME', '')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD', '')

# Debug: Print email configuration (without password)
logging.info(f"Email config - Server: {app.config['MAIL_SERVER']}, Port: {app.config['MAIL_PORT']}, TLS: {app.config['MAIL_USE_TLS']}, Username: {app.config['MAIL_USERNAME']}")

# Initialize mail with the app
mail.init_app(app)

# Create upload folder if it doesn't exist
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
    logging.info(f"Created upload folder: {UPLOAD_FOLDER}")

# Create published folder if it doesn't exist
PUBLISH_DIR = os.path.join(os.path.dirname(__file__), 'data', 'published')
if not os.path.exists(PUBLISH_DIR):
    os.makedirs(PUBLISH_DIR)
    logging.info(f"Created publish folder: {PUBLISH_DIR}")

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(editor_bp, url_prefix='/editor')
app.register_blueprint(files_bp, url_prefix='/files')
app.register_blueprint(wordbank_bp, url_prefix='/wordbank')
app.register_blueprint(email_bp, url_prefix='/email')
app.register_blueprint(progress_bp, url_prefix='/progress')
app.register_blueprint(schedule_bp, url_prefix='/schedule')
app.register_blueprint(openai_bp, url_prefix='/openai')
app.register_blueprint(audio_bp, url_prefix='/audio')
app.register_blueprint(dailyword_bp, url_prefix='/dailyword')
app.register_blueprint(profile_bp, url_prefix='/profile')
app.register_blueprint(practice_bp, url_prefix='/practice')
app.register_blueprint(typo_bp, url_prefix='/typo')
app.register_blueprint(admin_bp)
app.register_blueprint(upgrade_bp, url_prefix='/upgrade')
app.register_blueprint(sharing_bp, url_prefix='/sharing')
# Register public blueprint
app.register_blueprint(public_bp, url_prefix='/public')

# Root route


@app.route('/')
def index():
    logging.debug("Rendering index page")
    return render_template('index.html')


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)
