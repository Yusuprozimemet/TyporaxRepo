import os
import json
import logging
import shutil
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash
from src.models import db, User
from src.gcs_utils import gcs_client
from google.cloud.storage import Blob
from functools import lru_cache
from concurrent.futures import ThreadPoolExecutor, as_completed
import zipfile

logging.basicConfig(level=logging.DEBUG)

# Define paths
ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), 'artifacts')
PUBLISH_DIR_LOCAL = os.path.join(
    ARTIFACTS_DIR, 'published')  # Local filesystem path
# GCS path prefix (relative to bucket root)
PUBLISH_DIR_GCS = 'artifacts/published'
AUDIO_DIR = os.path.join(ARTIFACTS_DIR, 'audio')
USER_FOLDER = ARTIFACTS_DIR

# Create local directories if they don't exist
os.makedirs(ARTIFACTS_DIR, exist_ok=True)
os.makedirs(AUDIO_DIR, exist_ok=True)


def get_user_artifacts_dir(username):
    return os.path.join(ARTIFACTS_DIR, username)


def get_user_folder_dir(username, folder):
    return os.path.join(get_user_artifacts_dir(username), folder) if folder else get_user_artifacts_dir(username)


def update_audio_permissions(username, audio_files):
    """Update the list of audio files a user can access."""
    if gcs_client.enabled:
        gcs_client.update_audio_permissions(username, audio_files)
    else:
        permissions_file = os.path.join(
            get_user_artifacts_dir(username), 'audio_permissions.json')
        permissions = {'accessible_audio_files': audio_files}
        try:
            with open(permissions_file, 'w', encoding='utf-8') as f:
                json.dump(permissions, f, indent=4)
            logging.info(f"Updated audio permissions for user {username}")
        except Exception as e:
            logging.error(
                f"Error updating audio permissions for {username}: {str(e)}")
            raise


def get_audio_permissions(username):
    """Retrieve the list of audio files a user can access."""
    if gcs_client.enabled:
        permissions = gcs_client.get_audio_permissions(username)
        logging.debug(
            f"Retrieved audio permissions for {username} from GCS: {permissions}")
        return permissions
    permissions_file = os.path.join(
        get_user_artifacts_dir(username), 'audio_permissions.json')
    try:
        if os.path.exists(permissions_file):
            with open(permissions_file, 'r', encoding='utf-8') as f:
                permissions = json.load(f)
                accessible_files = permissions.get(
                    'accessible_audio_files', [])
                logging.debug(
                    f"Retrieved audio permissions for {username} locally: {accessible_files}")
                return accessible_files
        logging.debug(
            f"No audio permissions file found for {username} locally")
        return []
    except Exception as e:
        logging.error(
            f"Error reading audio permissions for {username}: {str(e)}")
        return []


def list_audio_files(username):
    """List audio files the user is allowed to access."""
    ensure_user_artifacts_dir(username)
    allowed_files = get_audio_permissions(username)
    if gcs_client.enabled:
        try:
            prefix = 'artifacts/audio/'
            blobs = gcs_client.client.list_blobs(
                gcs_client.bucket, prefix=prefix)
            audio_files = [
                os.path.basename(blob.name)
                for blob in blobs
                if blob.name.endswith('.mp3')
            ]
            available_files = [f for f in audio_files if f in allowed_files]
            logging.info(
                f"Retrieved {len(available_files)} accessible audio files from GCS for user {username}: {available_files}")
            return available_files
        except Exception as e:
            logging.error(
                f"Error listing audio files from GCS for user {username}: {str(e)}")
            return []
    available_files = [
        f for f in os.listdir(AUDIO_DIR)
        if os.path.isfile(os.path.join(AUDIO_DIR, f)) and f in allowed_files
    ]
    logging.info(
        f"Retrieved {len(available_files)} accessible audio files for user {username}: {available_files}")
    return available_files


def get_audio_file(username, audio_filename):
    """Retrieve the path to an audio file if the user has access."""
    allowed_files = get_audio_permissions(username)
    if audio_filename not in allowed_files:
        logging.error(
            f"User {username} does not have access to audio file: {audio_filename}")
        raise ValueError(f"Access denied to audio file: {audio_filename}")

    if gcs_client.enabled:
        return gcs_client.get_audio_file(username, audio_filename)

    audio_file_path = os.path.join(AUDIO_DIR, audio_filename)
    if not os.path.exists(audio_file_path):
        logging.error(f"Audio file not found: {audio_file_path}")
        raise FileNotFoundError(f"Audio file not found: {audio_filename}")

    logging.info(
        f"Access granted to audio file {audio_filename} for user {username}")
    return audio_file_path


def ensure_user_artifacts_dir(username):
    user_artifacts_dir = get_user_artifacts_dir(username)
    word_bank_dir = os.path.join(user_artifacts_dir, 'word bank')
    free_dir = os.path.join(user_artifacts_dir, 'practice page')
    shared_dir = os.path.join(user_artifacts_dir, 'shared')

    if gcs_client.enabled:
        gcs_paths = [
            (os.path.join('artifacts', username, 'word bank', 'wordbank.md').replace(
                os.sep, '/'), os.path.join(ARTIFACTS_DIR, 'wordbank.md')),
            (os.path.join('artifacts', username, 'word bank', 'wordbank_organized.md').replace(
                os.sep, '/'), os.path.join(ARTIFACTS_DIR, 'wordbank_organized.md')),
            (os.path.join('artifacts', username, 'word bank', 'wordbank_saved.md').replace(
                os.sep, '/'), os.path.join(ARTIFACTS_DIR, 'wordbank_saved.md')),
            (os.path.join('artifacts', username, 'practice page', 'practice_sample.md').replace(
                os.sep, '/'), os.path.join(ARTIFACTS_DIR, 'practice_sample.md')),
            (os.path.join('artifacts', username, 'practice page', 'shortcuts_magic.md').replace(
                os.sep, '/'), os.path.join(ARTIFACTS_DIR, 'shortcuts_magic.md')),
            (os.path.join('artifacts', username, 'practice page', '16_School.md').replace(
                os.sep, '/'), os.path.join(ARTIFACTS_DIR, '16_School.md')),
            (os.path.join('artifacts', username,
             'typo.json').replace(os.sep, '/'), '[]'),
            (os.path.join('artifacts', username,
             'learning_progress.json').replace(os.sep, '/'), '{}'),
            (os.path.join('artifacts', username, 'audio_permissions.json').replace(
                os.sep, '/'), '{"accessible_audio_files": ["taal1.mp3"]}'),
            (os.path.join('artifacts', username, 'books.json').replace(os.sep, '/'), json.dumps([
                {"key": "A0A2", "title": "Book 1",
                    "url": "https://online.anyflip.com/rxoaf/axyh/index.html"},
                {"key": "A2B1", "title": "Book 2",
                    "url": "https://online.anyflip.com/rxoaf/ycin/index.html"}
            ], indent=4)),
            (os.path.join('artifacts', username, 'sharing_permissions.json').replace(
                os.sep, '/'), '{"shared_files": {}}'),
            (os.path.join('artifacts', username, 'shared',
             '.placeholder').replace(os.sep, '/'), ''),
        ]
        for gcs_path, source in gcs_paths:
            blob = gcs_client.bucket.blob(gcs_path)
            if not blob.exists():
                try:
                    if isinstance(source, str) and os.path.exists(source):
                        with open(source, 'r', encoding='utf-8') as f:
                            content = f.read()
                    else:
                        content = source
                    gcs_client.write_file(gcs_path, content)
                    logging.info(
                        f"Created {gcs_path} in GCS for user {username}")
                except Exception as e:
                    logging.error(
                        f"Error creating {gcs_path} in GCS for user {username}: {str(e)}")
                    raise
        return

    if not os.path.exists(user_artifacts_dir):
        os.makedirs(user_artifacts_dir, exist_ok=True)
        logging.warning(
            f"Created missing artifacts directory for user: {username}")

    if not os.path.exists(word_bank_dir):
        os.makedirs(word_bank_dir, exist_ok=True)
        logging.warning(
            f"Created missing word bank directory for user: {username}")

        wordbank_files = [
            'wordbank.md',
            'wordbank_organized.md',
            'wordbank_saved.md'
        ]
        for file in wordbank_files:
            src = os.path.join(ARTIFACTS_DIR, file)
            dst = os.path.join(word_bank_dir, file)
            if os.path.exists(src):
                shutil.copy2(src, dst)
                logging.info(
                    f"Copied {file} to word bank directory for user: {username}")
            else:
                logging.error(
                    f"Source file {src} not found in ARTIFACTS_DIR for user {username}")
                with open(dst, 'w', encoding='utf-8') as f:
                    f.write('')
                logging.info(
                    f"Created empty {file} in word bank directory for user: {username}")

    if not os.path.exists(free_dir):
        os.makedirs(free_dir, exist_ok=True)
        logging.warning(f"Created missing free directory for user: {username}")

        free_files = [
            'practice_sample.md',
            'shortcuts_magic.md',
            '16_School.md'
        ]
        for file in free_files:
            src = os.path.join(ARTIFACTS_DIR, file)
            dst = os.path.join(free_dir, file)
            if os.path.exists(src):
                shutil.copy2(src, dst)
                logging.info(
                    f"Copied {file} to free directory for user: {username}")
            else:
                logging.error(
                    f"Source file {src} not found in ARTIFACTS_DIR for user {username}")
                with open(dst, 'w', encoding='utf-8') as f:
                    f.write('')
                logging.info(
                    f"Created empty {file} in free directory for user: {username}")

    if not os.path.exists(shared_dir):
        os.makedirs(shared_dir, exist_ok=True)
        logging.warning(
            f"Created missing shared directory for user: {username}")
        placeholder_file = os.path.join(shared_dir, '.placeholder')
        with open(placeholder_file, 'w', encoding='utf-8') as f:
            f.write('')
        logging.info(
            f"Created .placeholder in shared directory for user: {username}")

    permissions_file = os.path.join(
        user_artifacts_dir, 'audio_permissions.json')
    if not os.path.exists(permissions_file):
        update_audio_permissions(username, ['taal1.mp3'])
        logging.info(f"Initialized audio permissions for user: {username}")

    typo_file = os.path.join(user_artifacts_dir, 'typo.json')
    if not os.path.exists(typo_file):
        with open(typo_file, 'w', encoding='utf-8') as f:
            json.dump([], f)
        logging.info(f"Initialized typo.json for user: {username}")

    progress_file = os.path.join(user_artifacts_dir, 'learning_progress.json')
    if not os.path.exists(progress_file):
        with open(progress_file, 'w', encoding='utf-8') as f:
            json.dump({}, f)
        logging.info(
            f"Initialized learning_progress.json for user: {username}")

    books_file = os.path.join(user_artifacts_dir, 'books.json')
    if not os.path.exists(books_file):
        initialize_user_books(username)
        logging.info(f"Initialized books.json for user: {username}")

    sharing_permissions_file = os.path.join(
        user_artifacts_dir, 'sharing_permissions.json')
    if not os.path.exists(sharing_permissions_file):
        with open(sharing_permissions_file, 'w', encoding='utf-8') as f:
            json.dump({'shared_files': {}}, f)
        logging.info(
            f"Initialized sharing_permissions.json for user: {username}")


def open_json_file(filename, username, folder='', default=None):
    """Open a JSON file and return its parsed content, with a fallback default."""
    content = open_md_file(filename, username, folder)
    if content is None:
        logging.debug(
            f"JSON file {filename} not found for user {username} in folder {folder or 'root'}, returning default: {default}")
        return default
    try:
        data = json.loads(content)
        logging.debug(
            f"Opened JSON file {filename} for user {username} in folder {folder or 'root'}: {data}")
        return data
    except json.JSONDecodeError as e:
        logging.error(
            f"Error decoding JSON file {filename} for user {username} in folder {folder or 'root'}: {str(e)}")
        return default


def list_md_files(username, folder=''):
    """List markdown files in the specified folder."""
    if gcs_client.enabled:
        try:
            files = gcs_client.list_files(username, folder)
            logging.debug(
                f"Listed {len(files)} markdown files in GCS for user {username} in folder {folder}")
            return files
        except Exception as e:
            logging.error(
                f"Error listing markdown files in GCS for user {username} in folder {folder}: {str(e)}")
            return []
    user_dir = get_user_folder_dir(username, folder)
    ensure_user_artifacts_dir(username)
    if not os.path.exists(user_dir):
        logging.debug(f"Local directory not found: {user_dir}")
        return []
    files = [f for f in os.listdir(user_dir) if f.endswith('.md')]
    logging.debug(
        f"Listed {len(files)} local markdown files for user {username} in folder {folder}")
    return files


file_list_cache = {}
CACHE_DURATION = 300  # Cache file lists for 5 minutes


def search_files(keyword, username):
    """Search markdown files for a keyword."""
    if not keyword:
        return []

    results = []
    if gcs_client.enabled:
        try:
            prefix = f"artifacts/{username}/"
            blobs = gcs_client.client.list_blobs(
                gcs_client.bucket, prefix=prefix)
            md_files = []
            for blob in blobs:
                if blob.name.endswith('.md'):
                    relative_path = blob.name[len(prefix):]
                    folder = os.path.dirname(
                        relative_path).replace(os.sep, '/') or ''
                    filename = os.path.basename(blob.name)
                    md_files.append((blob, filename, folder))

            logging.info(
                f"Found {len(md_files)} .md files in GCS for user {username}")

            def search_blob(blob_info):
                blob, filename, folder = blob_info
                try:
                    content = blob.download_as_text(
                        encoding='utf-8', start=0, end=10240)
                    if keyword.lower() in content.lower():
                        idx = content.lower().index(keyword.lower())
                        start_idx = max(0, idx - 50)
                        snippet = content[start_idx:start_idx +
                                          100].replace('\n', ' ')
                        return {
                            'filename': filename,
                            'path': os.path.join(folder, filename).replace(os.sep, '/'),
                            'folder': folder,
                            'snippet': snippet
                        }
                except UnicodeDecodeError:
                    content = blob.download_as_text(
                        encoding='iso-8859-1', start=0, end=10240)
                    if keyword.lower() in content.lower():
                        idx = content.lower().index(keyword.lower())
                        start_idx = max(0, idx - 50)
                        snippet = content[start_idx:start_idx +
                                          100].replace('\n', ' ')
                        return {
                            'filename': filename,
                            'path': os.path.join(folder, filename).replace(os.sep, '/'),
                            'folder': folder,
                            'snippet': snippet
                        }
                except Exception as e:
                    logging.error(
                        f"Error reading GCS file {blob.name}: {str(e)}")
                return None

            with ThreadPoolExecutor(max_workers=10) as executor:
                future_to_blob = {executor.submit(
                    search_blob, blob_info): blob_info for blob_info in md_files}
                for future in as_completed(future_to_blob):
                    result = future.result()
                    if result:
                        results.append(result)

            logging.info(
                f"Search for '{keyword}' returned {len(results)} results in GCS for user {username}")
        except Exception as e:
            logging.error(
                f"Error searching files in GCS for user {username}: {str(e)}")
        return results

    user_artifacts_dir = get_user_artifacts_dir(username)
    ensure_user_artifacts_dir(username)

    def search_in_directory(directory, relative_folder=''):
        try:
            for entry in os.listdir(directory):
                full_path = os.path.join(directory, entry)
                folder_path = relative_folder if relative_folder else ''
                if os.path.isfile(full_path) and entry.endswith('.md'):
                    try:
                        with open(full_path, 'r', encoding='utf-8', errors='replace') as file:
                            content = file.read(10240)
                            if keyword.lower() in content.lower():
                                file_path = os.path.join(
                                    folder_path, entry) if folder_path else entry
                                idx = content.lower().index(keyword.lower())
                                start_idx = max(0, idx - 50)
                                snippet = content[start_idx:start_idx +
                                                  100].replace('\n', ' ')
                                results.append({
                                    'filename': entry,
                                    'path': file_path,
                                    'folder': folder_path,
                                    'snippet': snippet
                                })
                    except Exception as e:
                        logging.error(f"Error reading {full_path}: {e}")
                elif os.path.isdir(full_path):
                    new_relative_folder = os.path.join(
                        relative_folder, entry) if relative_folder else entry
                    search_in_directory(full_path, new_relative_folder)
        except Exception as e:
            logging.error(f"Error accessing directory {directory}: {e}")

    search_in_directory(user_artifacts_dir)
    logging.info(
        f"Search for '{keyword}' returned {len(results)} results for user {username}")
    return results


def save_file(filename, content, username, folder=''):
    """Save a file in the specified folder, restricted to premium users."""
    user = User.query.filter_by(username=username).first()
    if not user:
        logging.error(f"User {username} not found")
        raise ValueError(f"User {username} not found")
    if user.user_type != 'premium':
        logging.error(
            f"User {username} is not premium, cannot save file: {filename}")
        raise PermissionError(
            "Only premium users can save files. Please upgrade to premium.")

    if gcs_client.enabled:
        try:
            gcs_client.save_file(filename, content, username, folder)
            logging.info(
                f"File saved successfully to GCS: artifacts/{username}/{folder}/{filename}")
            return
        except Exception as e:
            logging.error(
                f"Error saving file to GCS: artifacts/{username}/{folder}/{filename}: {str(e)}")
            raise
    user_dir = get_user_folder_dir(username, folder)
    os.makedirs(user_dir, exist_ok=True)
    full_path = os.path.join(user_dir, filename)
    try:
        with open(full_path, 'w', encoding='utf-8') as file:
            file.write(content)
        logging.info(f"File saved successfully: {full_path}")
    except Exception as e:
        logging.error(f"Error saving file {full_path}: {str(e)}")
        raise


def open_md_file(filename, username, folder=''):
    """Open a markdown or JSON file in the specified folder."""
    if gcs_client.enabled:
        content = gcs_client.open_file(filename, username, folder)
        if content is not None:
            logging.info(
                f"File opened successfully from GCS: artifacts/{username}/{folder}/{filename}")
            return content
        if filename in ['wordbank.md', 'wordbank_organized.md', 'wordbank_saved.md']:
            gcs_client.save_file(filename, '', username, folder)
            logging.info(
                f"Created empty file in GCS: artifacts/{username}/{folder}/{filename}")
            return ''
        logging.error(
            f"File not found in GCS: artifacts/{username}/{folder}/{filename}")
        raise FileNotFoundError(f"File {filename} not found")
    user_dir = get_user_folder_dir(username, folder)
    full_path = os.path.join(user_dir, filename)
    try:
        with open(full_path, 'r', encoding='utf-8') as file:
            content = file.read()
        logging.info(f"File opened successfully: {full_path}")
        return content
    except UnicodeDecodeError:
        logging.warning(
            f"UTF-8 decode failed for {full_path}, trying with iso-8859-1")
        with open(full_path, 'r', encoding='iso-8859-1') as file:
            content = file.read()
        return content
    except Exception as e:
        logging.error(f"Error opening file {full_path}: {str(e)}")
        raise


def save_user(email, username, password):
    """Save a new user to the database with hashed password."""
    try:
        hashed_password = generate_password_hash(
            password) if password != 'google_auth' else password
        user = User(email=email, username=username, password=hashed_password)
        db.session.add(user)
        db.session.commit()
        ensure_user_artifacts_dir(username)
        logging.info(f"Created user {username} and artifacts directory")
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error saving user {username}: {str(e)}")
        raise


def load_users():
    """Load all users from the database."""
    try:
        users = User.query.all()
        return [{'email': user.email, 'username': user.username, 'password': user.password} for user in users]
    except Exception as e:
        logging.error(f"Error loading users: {str(e)}")
        return []


def update_user_password(email, new_password):
    """Update a user's password in the database with hashed password."""
    try:
        user = User.query.filter_by(email=email).first()
        if user:
            user.password = generate_password_hash(new_password)
            db.session.commit()
            logging.info(f"Password updated for user with email: {email}")
        else:
            raise ValueError("User not found")
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error updating password for {email}: {str(e)}")
        raise


def create_user_folder(username, folder):
    """Create a new folder for the user."""
    ensure_user_artifacts_dir(username)
    if gcs_client.enabled:
        return gcs_client.create_user_folder(username, folder)
    user_dir = get_user_folder_dir(username, folder)
    if os.path.exists(user_dir):
        raise FileExistsError(f"Folder '{folder}' already exists.")
    os.makedirs(user_dir, exist_ok=True)
    logging.info(f"Created folder '{folder}' for user '{username}'")
    return user_dir


def delete_user_folder(username, folder):
    """Delete a folder for the user."""
    ensure_user_artifacts_dir(username)
    if gcs_client.enabled:
        return gcs_client.delete_user_folder(username, folder)
    user_dir = get_user_folder_dir(username, folder)
    if not os.path.exists(user_dir):
        raise FileNotFoundError(f"Folder '{folder}' does not exist.")

    if os.listdir(user_dir):
        raise ValueError(f"Folder '{folder}' is not empty. Cannot delete.")

    os.rmdir(user_dir)
    logging.info(f"Deleted folder '{folder}' for user '{username}'")
    return True


def rename_user_folder(username, old_folder, new_folder):
    """Rename a folder for the user."""
    ensure_user_artifacts_dir(username)
    if gcs_client.enabled:
        return gcs_client.rename_user_folder(username, old_folder, new_folder)

    old_dir = get_user_folder_dir(username, old_folder)
    new_dir = get_user_folder_dir(username, new_folder)

    if not os.path.exists(old_dir):
        raise FileNotFoundError(f"Folder '{old_folder}' does not exist.")
    if os.path.exists(new_dir):
        raise FileExistsError(f"Folder '{new_folder}' already exists.")

    os.rename(old_dir, new_dir)
    logging.info(
        f"Renamed folder from '{old_folder}' to '{new_folder}' for user '{username}'")
    return True


def list_user_folders(username):
    """
    List all folders in the user's artifacts directory (including 'word bank' and 'free'),
    but excluding hidden folders (those starting with a dot).
    Supports both local and GCS storage.
    """
    ensure_user_artifacts_dir(username)
    if gcs_client.enabled:
        try:
            folders = gcs_client.list_folders(username)
            user_folders = [
                f for f in folders
                if not f.startswith('.')
            ]
            logging.info(
                f"Retrieved folders from GCS for user {username}: {user_folders}")
            return sorted(user_folders)
        except Exception as e:
            logging.error(
                f"Error listing folders from GCS for user {username}: {str(e)}")
            return []
    try:
        user_artifacts_dir = get_user_artifacts_dir(username)
        folders = [
            f for f in os.listdir(user_artifacts_dir)
            if os.path.isdir(os.path.join(user_artifacts_dir, f))
            and not f.startswith('.')
        ]
        logging.info(f"Retrieved folders for user {username}: {folders}")
        return sorted(folders)
    except Exception as e:
        logging.error(f"Error listing folders for user {username}: {str(e)}")
        return []


def generate_unique_username(base_username):
    """Generate a unique username by appending a number if the base username exists."""
    username = base_username
    counter = 1
    while User.query.filter_by(username=username).first():
        username = f"{base_username}{counter}"
        counter += 1
    return username


def initialize_user_books(username):
    """Initialize books.json for a user with default book links."""
    books_file = os.path.join(get_user_artifacts_dir(username), 'books.json')
    if not os.path.exists(books_file):
        default_books = [
            {"key": "A0A2", "title": "Book 1",
                "url": "https://online.anyflip.com/rxoaf/axyh/index.html"},
            {"key": "A2B1", "title": "Book 2",
                "url": "https://online.anyflip.com/rxoaf/ycin/index.html"}
        ]
        try:
            with open(books_file, 'w', encoding='utf-8') as f:
                json.dump(default_books, f, indent=4)
            logging.info(f"Initialized books.json for user: {username}")
        except Exception as e:
            logging.error(
                f"Error initializing books.json for {username}: {str(e)}")
            raise


def get_user_books(username):
    """Retrieve the list of book links for a user."""
    if gcs_client.enabled:
        try:
            content = gcs_client.open_file('books.json', username)
            if content:
                books = json.loads(content)
                logging.debug(
                    f"Retrieved books for {username} from GCS: {books}")
                return books
            return []
        except Exception as e:
            logging.error(
                f"Error retrieving books.json from GCS for {username}: {str(e)}")
            return []
    books_file = os.path.join(get_user_artifacts_dir(username), 'books.json')
    try:
        if os.path.exists(books_file):
            with open(books_file, 'r', encoding='utf-8') as f:
                books = json.load(f)
                logging.debug(f"Retrieved books for {username}: {books}")
                return books
        return []
    except Exception as e:
        logging.error(f"Error reading books.json for {username}: {str(e)}")
        return []


def save_user_books(username, books):
    """Save the list of book links for a user."""
    user = User.query.filter_by(username=username).first()
    if not user or user.user_type != 'premium':
        logging.error(
            f"User {username} is not premium or not found, cannot save books")
        raise PermissionError("Only premium users can manage book links.")

    if gcs_client.enabled:
        try:
            gcs_client.save_file(
                'books.json', json.dumps(books, indent=4), username)
            logging.info(f"Saved books.json to GCS for user: {username}")
        except Exception as e:
            logging.error(
                f"Error saving books.json to GCS for {username}: {str(e)}")
            raise
    books_file = os.path.join(get_user_artifacts_dir(username), 'books.json')
    try:
        with open(books_file, 'w', encoding='utf-8') as f:
            json.dump(books, f, indent=4)
        logging.info(f"Saved books.json for user: {username}")
    except Exception as e:
        logging.error(f"Error saving books.json for {username}: {str(e)}")
        raise


def create_zip_from_folder(username, folder, zip_path):
    """
    Create a ZIP file containing all .md files in the user's folder.
    Args:
        username (str): The username.
        folder (str): The folder to zip (empty for root).
        zip_path (str): Path where the ZIP file will be saved.
    Raises:
        FileNotFoundError: If the folder doesn't exist.
        ValueError: If the user doesn't exist.
    """
    user = User.query.filter_by(username=username).first()
    if not user:
        logging.error(f"User {username} not found")
        raise ValueError(f"User {username} not found")

    if gcs_client.enabled:
        try:
            gcs_client.create_zip_from_folder(username, folder, zip_path)
            logging.info(
                f"Created ZIP file from GCS for folder '{folder or 'root'}' for user {username}")
            return
        except Exception as e:
            logging.error(
                f"Error creating ZIP from GCS for folder {folder} for user {username}: {str(e)}")
            raise

    user_dir = get_user_folder_dir(username, folder)
    if not os.path.exists(user_dir):
        logging.error(f"Folder not found: {user_dir}")
        raise FileNotFoundError(f"Folder '{folder or 'root'}' not found")

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(user_dir):
            for file in files:
                if file.endswith('.md'):
                    file_path = os.path.join(root, file)
                    arcname = os.path.join(
                        folder or 'root', os.path.relpath(file_path, user_dir))
                    zipf.write(file_path, arcname)
                    logging.debug(f"Added {file_path} to ZIP as {arcname}")

    logging.info(
        f"Created ZIP file at {zip_path} for folder '{folder or 'root'}' for user {username}")


def create_zip_from_files(username, folder, files, zip_path):
    """
    Create a ZIP file containing specified .md files in the user's folder.
    Args:
        username (str): The username.
        folder (str): The folder containing the files (empty for root).
        files (list): List of filenames to include in the ZIP.
        zip_path (str): Path where the ZIP file will be saved.
    Raises:
        FileNotFoundError: If the folder or any file doesn't exist.
        ValueError: If the user doesn't exist.
    """
    user = User.query.filter_by(username=username).first()
    if not user:
        logging.error(f"User {username} not found")
        raise ValueError(f"User {username} not found")

    if gcs_client.enabled:
        try:
            gcs_client.create_zip_from_files(username, folder, files, zip_path)
            logging.info(
                f"Created ZIP file from GCS for {len(files)} files in folder '{folder or 'root'}' for user {username}")
            return
        except Exception as e:
            logging.error(
                f"Error creating ZIP from GCS for files in folder {folder} for user {username}: {str(e)}")
            raise

    user_dir = get_user_folder_dir(username, folder)
    if not os.path.exists(user_dir):
        logging.error(f"Folder not found: {user_dir}")
        raise FileNotFoundError(f"Folder '{folder or 'root'}' not found")

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for file in files:
            file_path = os.path.join(user_dir, file)
            if not os.path.exists(file_path):
                logging.error(f"File not found: {file_path}")
                raise FileNotFoundError(
                    f"File '{file}' not found in folder '{folder or 'root'}'")
            arcname = os.path.join(folder or 'root', file)
            zipf.write(file_path, arcname)
            logging.debug(f"Added {file_path} to ZIP as {arcname}")

    logging.info(
        f"Created ZIP file at {zip_path} for {len(files)} files in folder '{folder or 'root'}' for user {username}")


def ensure_published_dir():
    """Ensure the artifacts/published directory exists (locally or in GCS)."""
    if gcs_client.enabled:
        placeholder_path = f"{PUBLISH_DIR_GCS}/.placeholder"
        blob = gcs_client.bucket.blob(placeholder_path)
        if not blob.exists():
            try:
                gcs_client.write_file(placeholder_path, '')
                logging.info(f"Created placeholder in GCS: {placeholder_path}")
            except Exception as e:
                logging.error(
                    f"Error creating placeholder in GCS: {placeholder_path}: {str(e)}")
        return

    if not os.path.exists(PUBLISH_DIR_LOCAL):
        os.makedirs(PUBLISH_DIR_LOCAL, exist_ok=True)
        logging.info(f"Created published directory: {PUBLISH_DIR_LOCAL}")
