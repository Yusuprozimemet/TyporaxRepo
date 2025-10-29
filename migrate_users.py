import json
import os
import re
from app import app
from src.database import db
from src.models import User
from werkzeug.security import generate_password_hash
from sqlalchemy import inspect
from datetime import datetime, timedelta

USERS_FILE = os.path.join('src', 'artifacts', 'users.json')


def is_valid_email(email):
    """Basic email validation to ensure non-empty and valid format."""
    if not email or email.strip() == "":
        return False
    # Simple regex for email format
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(email_pattern, email) is not None


def migrate_users():
    with app.app_context():
        # Debug: Print database URI and model
        print(f"Database URI: {app.config['SQLALCHEMY_DATABASE_URI']}")
        print(f"User model: {User}")

        # Create database tables
        try:
            db.create_all()
            print("Database tables created or verified.")
        except Exception as e:
            print(f"Error creating database tables: {str(e)}")
            return

        # Verify table existence
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        print(f"Tables in database: {tables}")
        if 'users' in tables:
            print("Confirmed: 'users' table exists.")
        else:
            print("Error: 'users' table does not exist after create_all().")
            return

        # Load users from JSON
        if os.path.exists(USERS_FILE):
            with open(USERS_FILE, 'r') as f:
                users = json.load(f)

            skipped_users = 0
            added_users = 0

            # Add users to database
            for user_data in users:
                # Validate email
                email = user_data.get('email', '').strip()
                if not is_valid_email(email):
                    print(
                        f"Skipping user '{user_data.get('username', 'unknown')}' due to invalid or missing email: '{email}'")
                    skipped_users += 1
                    continue

                # Check for duplicates
                if User.query.filter_by(email=email).first():
                    print(f"Skipping duplicate email: {email}")
                    skipped_users += 1
                    continue
                if User.query.filter_by(username=user_data['username']).first():
                    print(
                        f"Skipping duplicate username: {user_data['username']}")
                    skipped_users += 1
                    continue

                # Validate user_type
                user_type = user_data.get('user_type', 'normal')
                if user_type not in ['normal', 'premium', 'admin']:
                    print(
                        f"Skipping user '{user_data['username']}' due to invalid user_type: '{user_type}'")
                    skipped_users += 1
                    continue

                # Hash password unless it's 'google_auth'
                hashed_password = (
                    generate_password_hash(user_data['password'])
                    if user_data['password'] != 'google_auth'
                    else user_data['password']
                )

                # Parse subscription dates if provided (only for premium users)
                subscription_start_date = None
                next_billing_date = None
                is_canceled = user_data.get('is_canceled', False)

                if user_type == 'premium':
                    if user_data.get('subscription_start_date'):
                        try:
                            subscription_start_date = datetime.fromisoformat(
                                user_data['subscription_start_date'].replace(
                                    'Z', '+00:00')
                            )
                        except ValueError as e:
                            print(
                                f"Invalid subscription_start_date for {user_data['username']}: {str(e)}")
                            subscription_start_date = None

                    if user_data.get('next_billing_date'):
                        try:
                            next_billing_date = datetime.fromisoformat(
                                user_data['next_billing_date'].replace(
                                    'Z', '+00:00')
                            )
                        except ValueError as e:
                            print(
                                f"Invalid next_billing_date for {user_data['username']}: {str(e)}")
                            next_billing_date = None

                    # Set defaults for premium users if no dates provided
                    if not (subscription_start_date and next_billing_date):
                        subscription_start_date = datetime.utcnow()
                        next_billing_date = subscription_start_date + \
                            timedelta(days=30)
                else:
                    # For normal or admin users, clear subscription fields
                    subscription_start_date = None
                    next_billing_date = None
                    is_canceled = False

                # Handle new fields (profile_picture, theme_preference, language_preference)
                profile_picture = user_data.get('profile_picture', None)
                theme_preference = user_data.get('theme_preference', 'light')
                if theme_preference not in ['light', 'dark']:
                    print(
                        f"Invalid theme_preference for {user_data['username']}: '{theme_preference}'. Defaulting to 'light'.")
                    theme_preference = 'light'

                language_preference = user_data.get(
                    'language_preference', 'dutch')
                if language_preference not in ['dutch', 'english', 'italian', 'french', 'german', 'chinese', 'spanish', 'arabic', 'turkish', 'polish']:
                    print(
                        f"Invalid language_preference for {user_data['username']}: '{language_preference}'. Defaulting to 'dutch'.")
                    language_preference = 'dutch'

                # Create user instance
                user = User(
                    email=email,
                    username=user_data['username'],
                    password=hashed_password,
                    user_type=user_type,
                    subscription_start_date=subscription_start_date,
                    next_billing_date=next_billing_date,
                    is_canceled=is_canceled,
                    profile_picture=profile_picture,
                    theme_preference=theme_preference,
                    language_preference=language_preference
                )

                db.session.add(user)
                print(f"Added user: {user_data['username']} ({user.user_type}, is_canceled={user.is_canceled}, theme_preference={user.theme_preference}, language_preference={user.language_preference}, profile_picture={'set' if user.profile_picture else 'None'})")
                added_users += 1

            try:
                db.session.commit()
                print(
                    f"Migration complete: Added {added_users} users, skipped {skipped_users} users.")
            except Exception as e:
                db.session.rollback()
                print(f"Error committing users to database: {str(e)}")
        else:
            print("No users.json file found.")


if __name__ == "__main__":
    migrate_users()
