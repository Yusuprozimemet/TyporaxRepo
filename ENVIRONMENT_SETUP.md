# Environment Setup Guide

## Setting up Environment Variables

This application uses environment variables for sensitive configuration data. Follow these steps to set up your environment:

### 1. Copy the Environment Template
```bash
cp .env.example .env
```

### 2. Update the .env File
Edit the `.env` file and replace the placeholder values with your actual credentials:

```bash
# Flask Configuration
FLASK_SECRET_KEY=your-super-secret-flask-key-here-change-this-in-production
FLASK_DEBUG=False

# OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Email Configuration
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# Serializer Configuration
SERIALIZER_SECRET_KEY=your-url-safe-serializer-secret-key

# Database Configuration (optional)
DATABASE_URL=sqlite:///users.db

# Server Configuration
PORT=5000
```

### 3. Generate Secure Keys
For production, generate secure random keys:

```python
import secrets
print("FLASK_SECRET_KEY:", secrets.token_urlsafe(32))
print("SERIALIZER_SECRET_KEY:", secrets.token_urlsafe(32))
```

### 4. Gmail App Password Setup
If using Gmail for email:
1. Enable 2-factor authentication on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the app password (not your regular password) in `MAIL_PASSWORD`

### 5. OAuth Setup
- **Google OAuth**: Get credentials from [Google Cloud Console](https://console.cloud.google.com/)
- **GitHub OAuth**: Get credentials from [GitHub Developer Settings](https://github.com/settings/developers)

## Security Notes

- **Never commit the `.env` file** to version control
- **Use strong, unique secrets** for production
- **Regularly rotate sensitive credentials**
- **Use different secrets** for development and production environments

## Environment Loading

The application automatically loads environment variables from the `.env` file using python-dotenv. Make sure you have python-dotenv installed:

```bash
pip install python-dotenv
```

The environment variables are loaded at application startup in `app.py`.