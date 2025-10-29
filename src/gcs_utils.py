import os
import json
import logging
import zipfile
from google.cloud import storage
from google.cloud.storage import Client
from google.cloud.exceptions import GoogleCloudError
import mimetypes


class GCSClient:
    def __init__(self):
        self.bucket_name = os.getenv('GCS_BUCKET', 'typorax123')
        self.enabled = os.getenv('USE_GCS', 'false').lower() == 'true'
        credentials_json = os.getenv('GOOGLE_CLOUD_CREDENTIALS')
        credentials_path = os.path.join(
            os.path.dirname(__file__), 'typorax-credentials.json')

        if not self.enabled:
            logging.info("GCSClient disabled; using local filesystem")
            self.client = None
            self.bucket = None
            return

        try:
            if credentials_json:
                credentials_dict = json.loads(credentials_json)
                self.client = Client.from_service_account_info(
                    credentials_dict)
                logging.info(
                    "GCSClient initialized with environment credentials")
            elif os.path.exists(credentials_path):
                self.client = Client.from_service_account_json(
                    credentials_path)
                logging.info(
                    f"GCSClient initialized with credentials file: {credentials_path}")
            else:
                raise ValueError("No valid GCS credentials provided")
            self.bucket = self.client.bucket(self.bucket_name)
            logging.info(
                f"GCSClient initialized successfully for bucket: {self.bucket_name}")
        except Exception as e:
            logging.error(f"Failed to initialize GCSClient: {str(e)}")
            self.enabled = False
            self.client = None
            self.bucket = None

    def upload_file(self, local_path, gcs_path):
        """Upload a file to GCS (for binary files like images or audio)."""
        if not self.enabled or not self.client:
            return None
        try:
            blob = self.bucket.blob(gcs_path)
            # Determine the MIME type of the file
            content_type, _ = mimetypes.guess_type(local_path)
            if not content_type:
                content_type = 'application/octet-stream'  # Fallback MIME type
            blob.content_type = content_type
            blob.upload_from_filename(local_path, content_type=content_type)
            logging.info(
                f"Uploaded file to GCS: gs://{self.bucket_name}/{gcs_path} with Content-Type: {content_type}")
            return f"gs://{self.bucket_name}/{gcs_path}"
        except GoogleCloudError as e:
            logging.error(
                f"Error uploading {local_path} to {gcs_path}: {str(e)}")
            return None

    # ... (rest of the GCSClient class remains unchanged)
    # Include all other methods as provided in the original gcs_utils.py
    def read_file(self, path):
        """Read text content directly from a GCS file."""
        if not self.enabled or not self.client:
            return None
        try:
            blob = self.bucket.blob(path)
            if not blob.exists():
                logging.info(f"GCS file not found: {path}")
                return None
            content = blob.download_as_text(encoding='utf-8')
            logging.info(f"Read file from GCS: {path}")
            return content
        except UnicodeDecodeError:
            content = blob.download_as_text(encoding='iso-8859-1')
            logging.info(f"Read file from GCS with iso-8859-1: {path}")
            return content
        except GoogleCloudError as e:
            logging.error(f"Error reading GCS file {path}: {str(e)}")
            return None

    def write_file(self, path, content):
        """Write text content directly to a GCS file."""
        if not self.enabled or not self.client:
            raise Exception("GCS not enabled")
        try:
            blob = self.bucket.blob(path)
            blob.upload_from_string(
                content, content_type='text/plain; charset=utf-8')
            logging.info(f"Saved file to GCS: {path}")
        except GoogleCloudError as e:
            logging.error(f"Error writing GCS file {path}: {str(e)}")
            raise

    def download_file(self, gcs_path, local_path):
        """Download a file from GCS to a local path (for binary files)."""
        if not self.enabled or not self.client:
            return None
        try:
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            blob = self.bucket.blob(gcs_path)
            if not blob.exists():
                logging.info(f"GCS file not found: {gcs_path}")
                return None
            blob.download_to_filename(local_path)
            logging.info(
                f"Downloaded file from GCS: {gcs_path} to {local_path}")
            return local_path
        except GoogleCloudError as e:
            logging.error(
                f"Error downloading {gcs_path} to {local_path}: {str(e)}")
            return None

    def save_file(self, filename, content, username, folder=''):
        """Save content to a file in GCS."""
        if not self.enabled or not self.client:
            return False
        gcs_path = os.path.join('artifacts', username,
                                folder, filename).replace(os.sep, '/')
        try:
            self.write_file(gcs_path, content)
            return True
        except Exception as e:
            logging.error(f"Error saving file to GCS {gcs_path}: {str(e)}")
            return False

    def open_file(self, filename, username, folder=''):
        """Read content from a file in GCS."""
        if not self.enabled or not self.client:
            return None
        gcs_path = os.path.join('artifacts', username,
                                folder, filename).replace(os.sep, '/')
        return self.read_file(gcs_path)

    def list_files(self, username, folder=''):
        """List markdown files in a GCS directory."""
        if not self.enabled or not self.client:
            return []

        # Construct prefix properly to avoid double slashes
        if folder:
            prefix = f"artifacts/{username}/{folder}/"
        else:
            prefix = f"artifacts/{username}/"

        try:
            blobs = self.client.list_blobs(
                self.bucket, prefix=prefix, delimiter='/')

            # Filter for markdown files only in this directory level (not in subdirectories)
            files = []
            for blob in blobs:
                if blob.name.endswith('.md'):
                    # Extract just the filename without the path
                    file_name = os.path.basename(blob.name)
                    files.append(file_name)

            logging.info(f"Listed {len(files)} .md files in GCS for {prefix}")
            return files
        except GoogleCloudError as e:
            logging.error(f"Error listing files in GCS {prefix}: {str(e)}")
            return []

    def list_folders(self, username, folder=''):
        """List subfolders in a GCS directory."""
        if not self.enabled or not self.client:
            return []

        # Construct base prefix properly to avoid double slashes
        if folder:
            base_prefix = f"artifacts/{username}/{folder}/"
        else:
            base_prefix = f"artifacts/{username}/"

        try:
            # Create a set to store unique folder names
            folders = set()

            # List all blobs with the given prefix - don't use delimiter initially
            blobs = self.client.list_blobs(self.bucket, prefix=base_prefix)

            # Go through each blob and extract folder names
            for blob in blobs:
                # Remove the base prefix to get the relative path
                relative_path = blob.name[len(base_prefix):]
                if not relative_path:
                    continue

                # If this path contains a slash, it's in a subfolder
                if '/' in relative_path:
                    # Get the top-level folder name
                    top_folder = relative_path.split('/')[0]
                    if top_folder:
                        folders.add(top_folder)
                        logging.debug(
                            f"Found folder: {top_folder} from path: {relative_path}")

            # Now also try with delimiter-based approach as a backup
            blobs = self.client.list_blobs(
                self.bucket, prefix=base_prefix, delimiter='/')
            for prefix in blobs.prefixes:
                # Extract folder name from the path
                folder_name = prefix[len(base_prefix):].rstrip('/')
                if folder_name:
                    folders.add(folder_name)
                    logging.debug(
                        f"Found folder (delimiter method): {folder_name}")

            folders_list = list(folders)
            logging.info(
                f"Retrieved folders from GCS for user {username}: {folders_list}")
            return folders_list
        except GoogleCloudError as e:
            logging.error(
                f"Error listing folders in GCS {base_prefix}: {str(e)}")
            return []

    def update_audio_permissions(self, username, audio_files):
        """Update audio permissions in GCS."""
        if not self.enabled or not self.client:
            return False
        gcs_path = os.path.join('artifacts', username,
                                'audio_permissions.json').replace(os.sep, '/')
        permissions = {'accessible_audio_files': audio_files}
        try:
            self.write_file(gcs_path, json.dumps(permissions, indent=4))
            logging.info(f"Updated audio permissions in GCS for {username}")
            return True
        except Exception as e:
            logging.error(
                f"Error updating audio permissions in GCS for {username}: {str(e)}")
            return False

    def get_audio_permissions(self, username):
        """Retrieve audio permissions from GCS."""
        if not self.enabled or not self.client:
            return []
        gcs_path = os.path.join('artifacts', username,
                                'audio_permissions.json').replace(os.sep, '/')
        content = self.read_file(gcs_path)
        if content:
            try:
                permissions = json.loads(content)
                return permissions.get('accessible_audio_files', [])
            except json.JSONDecodeError as e:
                logging.error(
                    f"Error parsing audio permissions for {username}: {str(e)}")
        return []

    def get_audio_file(self, username, audio_filename):
        """Retrieve an audio file path from GCS if the user has access."""
        if not self.enabled or not self.client:
            return None
        allowed_files = self.get_audio_permissions(username)
        if audio_filename not in allowed_files:
            logging.error(
                f"User {username} does not have access to audio file: {audio_filename}")
            raise ValueError(f"Access denied to audio file: {audio_filename}")

        gcs_path = os.path.join('artifacts', 'audio',
                                audio_filename).replace(os.sep, '/')
        local_temp_path = os.path.join('temp', audio_filename)
        try:
            if self.download_file(gcs_path, local_temp_path):
                logging.info(
                    f"Access granted to audio file {audio_filename} for {username}")
                return local_temp_path
            raise FileNotFoundError(f"Audio file not found: {audio_filename}")
        except Exception as e:
            logging.error(f"Error retrieving audio file {gcs_path}: {str(e)}")
            raise

    def generate_presigned_url(self, gcs_path, expiration=3600):
        if not self.enabled or not self.client:
            return None
        try:
            blob = self.bucket.blob(gcs_path)
            if not blob.exists():
                logging.info(
                    f"GCS file not found for presigned URL: {gcs_path}")
                return None
            url = blob.generate_signed_url(
                expiration=expiration, method='GET', version='v4')
            # Log full URL
            logging.info(f"Generated presigned URL for {gcs_path}: {url}")
            return url
        except GoogleCloudError as e:
            logging.error(
                f"Error generating presigned URL for {gcs_path}: {str(e)}")
            return None

    def create_user_folder(self, username, folder):
        """Simulate creating a folder for the user in GCS by uploading a dummy file."""
        folder_path = f"artifacts/{username}/{folder}".rstrip('/') + '/'
        dummy_blob_path = folder_path + '.keep'
        blob = self.bucket.blob(dummy_blob_path)
        if blob.exists():
            raise FileExistsError(
                f"GCS folder '{folder}' already exists for user '{username}'.")
        blob.upload_from_string('', content_type='text/plain')
        logging.info(
            f"Created GCS folder '{folder}' for user '{username}' (dummy .keep file uploaded).")
        return folder_path

    def delete_user_folder(self, username, folder):
        """Delete a folder for the user in GCS by removing all blobs with the folder prefix."""
        if not self.enabled or not self.client:
            raise ValueError("GCS not enabled")

        folder_path = f"artifacts/{username}/{folder}/".rstrip('/')

        # List all blobs under the folder prefix (handle pagination)
        blobs = list(self.client.list_blobs(
            self.bucket, prefix=folder_path + '/'))

        # Check if folder exists
        if not blobs:
            logging.error(f"GCS folder not found: {folder_path}")
            raise FileNotFoundError(
                f"GCS folder '{folder}' does not exist for user '{username}'.")

        # Check if folder is empty (only .keep file or no files)
        keep_file_path = f"{folder_path}/.keep"
        non_keep_blobs = [
            blob for blob in blobs if blob.name != keep_file_path]

        if non_keep_blobs:
            blob_names = [blob.name for blob in non_keep_blobs]
            logging.error(
                f"GCS folder '{folder}' is not empty for user '{username}'. Contents: {blob_names}")
            raise ValueError(
                f"GCS folder '{folder}' is not empty. Contains: {blob_names}")

        # Delete all blobs (should only be .keep file or none)
        try:
            for blob in blobs:
                blob.delete()
                logging.debug(f"Deleted blob: {blob.name}")
            logging.info(
                f"Successfully deleted GCS folder '{folder}' for user '{username}'.")
            return True
        except GoogleCloudError as e:
            logging.error(
                f"Error deleting blobs in GCS folder '{folder}' for user '{username}': {str(e)}")
            raise

    def rename_user_folder(self, username, old_folder, new_folder):
        """Rename a folder for the user in GCS by copying all objects to new prefix and deleting old ones."""
        old_path = f"artifacts/{username}/{old_folder}".rstrip('/') + '/'
        new_path = f"artifacts/{username}/{new_folder}".rstrip('/') + '/'

        # Check if old folder exists
        blobs = list(self.bucket.list_blobs(prefix=old_path, max_results=1))
        if not blobs:
            raise FileNotFoundError(
                f"GCS folder '{old_folder}' does not exist for user '{username}'.")

        # Check if new folder already exists
        blobs = list(self.bucket.list_blobs(prefix=new_path, max_results=1))
        if blobs:
            raise FileExistsError(
                f"GCS folder '{new_folder}' already exists for user '{username}'.")

        # Copy all objects to new location
        blobs_to_copy = list(self.bucket.list_blobs(prefix=old_path))
        for blob in blobs_to_copy:
            new_name = blob.name.replace(old_path, new_path, 1)
            self.bucket.copy_blob(blob, self.bucket, new_name)

        # Delete old objects
        for blob in blobs_to_copy:
            blob.delete()

        logging.info(
            f"Renamed GCS folder from '{old_folder}' to '{new_folder}' for user '{username}'.")
        return True

    def create_zip_from_folder(self, username, folder, zip_path):
        """Create a ZIP file containing all .md files in the user's folder in GCS."""
        if not self.enabled or not self.client:
            raise ValueError("GCS not enabled")

        prefix = f"artifacts/{username}/{folder}/" if folder else f"artifacts/{username}/"
        blobs = self.client.list_blobs(self.bucket, prefix=prefix)
        any_blobs = False

        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for blob in blobs:
                if blob.name.endswith('.md'):
                    any_blobs = True
                    try:
                        content = blob.download_as_text(encoding='utf-8')
                    except UnicodeDecodeError:
                        content = blob.download_as_text(encoding='iso-8859-1')
                    arcname = os.path.join(folder or 'root', os.path.relpath(
                        blob.name, f"artifacts/{username}"))
                    zipf.writestr(arcname, content)
                    logging.debug(f"Added {blob.name} to ZIP as {arcname}")

        if not any_blobs and folder:
            logging.error(f"GCS folder not found: {prefix}")
            raise FileNotFoundError(f"Folder '{folder}' not found")

        logging.info(
            f"Created ZIP file at {zip_path} from GCS for folder '{folder or 'root'}' for user {username}")

    def create_zip_from_files(self, username, folder, files, zip_path):
        """Create a ZIP file containing specified .md files in the user's folder in GCS."""
        if not self.enabled or not self.client:
            raise ValueError("GCS not enabled")

        prefix = f"artifacts/{username}/{folder}/" if folder else f"artifacts/{username}/"
        any_blobs = list(self.client.list_blobs(
            self.bucket, prefix=prefix, max_results=1))
        if not any_blobs and folder:
            logging.error(f"GCS folder not found: {prefix}")
            raise FileNotFoundError(f"Folder '{folder}' not found")

        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file in files:
                gcs_path = os.path.join(prefix, file).replace(os.sep, '/')
                blob = self.bucket.blob(gcs_path)
                if not blob.exists():
                    logging.error(f"GCS file not found: {gcs_path}")
                    raise FileNotFoundError(
                        f"File '{file}' not found in folder '{folder or 'root'}'")

                try:
                    content = blob.download_as_text(encoding='utf-8')
                except UnicodeDecodeError:
                    content = blob.download_as_text(encoding='iso-8859-1')

                arcname = os.path.join(folder or 'root', file)
                zipf.writestr(arcname, content)
                logging.debug(f"Added {gcs_path} to ZIP as {arcname}")

        logging.info(
            f"Created ZIP file at {zip_path} from GCS for {len(files)} files in folder '{folder or 'root'}' for user {username}")


gcs_client = GCSClient()
