# check_users.py
from app import app
from src.database import db
from src.models import User

with app.app_context():
    users = User.query.all()
    for user in users:
        print(user.id, user.email, user.username, user.password)
