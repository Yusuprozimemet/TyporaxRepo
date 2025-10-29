# TyporaX - Modern Markdown Editor & Learning Platform

<p align="center">
  <img src="src/static/img/TyporaX.png" width="200" alt="TyporaX Logo"/>
</p>


TyporaX is a powerful web-based markdown editor and language learning platform that combines modern writing tools with educational features. Built with Flask, it offers real-time editing, Google Cloud integration, authentication, and personalized learning experiences.

## 🌐 Live Demo

**Try TyporaX now:** [https://typorax.onrender.com/](https://typorax.onrender.com/)

*The live deployment is running on Render and includes all the features described below.*

## ✨ Features

- **Modern Markdown Editor** - Real-time preview with syntax highlighting
- **Multi-language Support** - Dutch language learning focus
- **Cloud Storage** - Google Cloud Storage integration for file management
- **Authentication** - Google OAuth, GitHub OAuth, and email-based login
- **User Management** - Admin panel with role-based access control
- **Audio Integration** - Text-to-speech and audio recording capabilities
- **Practice Mode** - Interactive language learning exercises
- **File Sharing** - Public and private file sharing system
- **Progress Tracking** - Learning progress analytics and reporting

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Git
- Google Cloud Account (optional, for cloud storage)

### 1. Clone the Repository

```bash
git clone https://github.com/Yusuprozimemet/TyporaxRepo.git
cd TyporaxRepo
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Environment Setup

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` file with your configuration:

```env
# OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here

# Flask Configuration
FLASK_SECRET_KEY=your_secure_random_secret_key
SERIALIZER_SECRET_KEY=your_secure_serializer_key

# Email Configuration
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password_here

# Google Cloud (Optional)
USE_GCS=false
GCS_BUCKET=your_bucket_name
GOOGLE_CLOUD_CREDENTIALS=src/typorax-credentials.json
```

### 4. Initialize Database with Sample Users

Run the migration script to create the database with sample users:

```bash
python migrate_users.py
```

This will create a SQLite database (`users.db`) with sample users from `src/artifacts/users.json`.

### 5. Start the Application

```bash
python app.py
```

The application will be available at: `http://127.0.0.1:5000`

### 6. Login with Sample Accounts

After running the migration, you can login with these sample accounts:

**Admin Account:**
- Email: `typorax@gmail.com`
- Username: `admin`
- Password: `admin123!`

**Premium User:**
- Email: `tester@example.com`
- Username: `tester`
- Password: `tester1234!`

## 🔧 Configuration

### OAuth Setup

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://127.0.0.1:5000/auth/google-callback`
   - `http://localhost:5000/auth/google-callback`

#### GitHub OAuth
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create a new OAuth App
3. Add authorization callback URLs:
   - `http://127.0.0.1:5000/auth/github-callback`
   - `http://localhost:5000/auth/github-callback`

### Email Configuration

For email functionality (password reset, notifications):
1. Use Gmail with App Password
2. Enable 2FA on your Gmail account
3. Generate an App Password
4. Use the App Password in `MAIL_PASSWORD`

### Google Cloud Storage (Optional)

For cloud file storage:
1. Create a Google Cloud project
2. Enable Cloud Storage API
3. Create a service account
4. Download service account key as JSON
5. Place in `src/typorax-credentials.json`
6. Set `USE_GCS=true` in `.env`

## 📁 Project Structure

```
TyporaxRepo/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── .env.example          # Environment template
├── migrate_users.py      # Database migration script
├── src/
│   ├── blueprints/       # Flask blueprints (routes)
│   │   ├── auth.py       # Authentication routes
│   │   ├── editor.py     # Markdown editor routes
│   │   ├── practice.py   # Learning practice routes
│   │   └── ...
│   ├── static/           # Static assets (CSS, JS, images)
│   ├── templates/        # HTML templates
│   ├── artifacts/        # Sample data and user files
│   │   └── users.json    # Sample users for migration
│   ├── models.py         # Database models
│   ├── database.py       # Database configuration
│   └── utils.py          # Utility functions
└── data/                 # User data and uploads
```

## 🛠️ Development

### Adding New Users

You can add new users by:

1. **Via Web Interface:** Register through the application
2. **Via Migration Script:** Add users to `src/artifacts/users.json` and run `python migrate_users.py`
3. **Via Admin Panel:** Login as admin and manage users

### Database Management

- **View Users:** `python check_users.py`
- **Reset Database:** Delete `users.db` and run `python migrate_users.py`
- **Migration:** Modify `migrate_users.py` for custom user data

### Available Routes

- `/` - Home page with login
- `/auth/selection` - User dashboard after login
- `/editor` - Markdown editor interface
- `/practice` - Language learning exercises
- `/admin` - Admin panel (admin users only)
- `/public` - Public file browser

## 🐳 Docker Deployment

Build and run with Docker:

```bash
# Build image
docker build -t typorax .

# Run container
docker run -p 5000:5000 --env-file .env typorax
```

## 🚀 Production Deployment

For production deployment:

1. Set `FLASK_DEBUG=False` in `.env`
2. Use a production WSGI server like Gunicorn
3. Configure a reverse proxy (nginx)
4. Use a production database (PostgreSQL)
5. Set up SSL certificates
6. Configure proper environment variables

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Troubleshooting

### Common Issues

**OAuth Errors:**
- Verify redirect URIs in OAuth app settings
- Check client ID/secret configuration
- Ensure environment variables are set

**Database Issues:**
- Delete `users.db` and run migration again
- Check user data format in `users.json`
- Verify SQLite permissions

**Email Issues:**
- Use Gmail App Password, not regular password
- Enable 2FA and generate App Password
- Check SMTP settings

### Getting Help

- Check the logs in the terminal
- Verify environment configuration
- Contact: [typorax@gmail.com](mailto:typorax@gmail.com)

---

**Built with ❤️ using Flask, SQLAlchemy, and modern web technologies.**