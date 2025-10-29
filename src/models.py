from src.database import db
from datetime import datetime
from sqlalchemy import CheckConstraint


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    user_type = db.Column(db.String(20), nullable=False, default='normal')
    subscription_start_date = db.Column(db.DateTime, nullable=True)
    next_billing_date = db.Column(db.DateTime, nullable=True)
    is_canceled = db.Column(db.Boolean, nullable=False, default=False)
    profile_picture = db.Column(db.Text, nullable=True)
    theme_preference = db.Column(db.String(20), nullable=True, default='light')
    language_preference = db.Column(
        db.String(20), nullable=True, default='dutch')  # New column

    # Database-level constraints
    __table_args__ = (
        CheckConstraint(user_type.in_(
            ['normal', 'premium', 'admin']), name='check_user_type'),
        CheckConstraint(theme_preference.in_(
            ['light', 'dark']), name='check_theme_preference'),
        CheckConstraint(language_preference.in_(['dutch', 'english', 'italian', 'french', 'german',
                        'chinese', 'spanish', 'arabic', 'turkish', 'polish']), name='check_language_preference'),
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Validate user_type
        if self.user_type not in ['normal', 'premium', 'admin']:
            raise ValueError(
                f"Invalid user_type: {self.user_type}. Must be 'normal', 'premium', or 'admin'.")
        # Validate theme_preference
        if self.theme_preference and self.theme_preference not in ['light', 'dark']:
            raise ValueError(
                f"Invalid theme_preference: {self.theme_preference}. Must be 'light' or 'dark'.")
        # Validate language_preference
        if self.language_preference and self.language_preference not in ['dutch', 'english', 'italian', 'french', 'german', 'chinese', 'spanish', 'arabic', 'turkish', 'polish']:
            raise ValueError(
                f"Invalid language_preference: {self.language_preference}. Must be one of: dutch, english, italian, french, german, chinese, spanish, arabic, turkish, polish.")

    def __repr__(self):
        return f'<User {self.username} ({self.user_type})>'
