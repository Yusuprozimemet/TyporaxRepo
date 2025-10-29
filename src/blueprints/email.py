from flask import Blueprint, jsonify, request, current_app
from flask_mail import Message
from src.mail_config import mail
import logging

email_bp = Blueprint('email', __name__)


@email_bp.route('/send-email', methods=['POST'])
def send_email_route():
    data = request.get_json()
    recipient_email = data['recipientEmail']
    subject = data['subject']
    body = data['body']
    filename = data['filename']

    try:
        # Create message
        message = Message(
            subject=subject,
            sender=current_app.config['MAIL_USERNAME'],
            recipients=[recipient_email],
            body=body
        )
        
        # Send email using the shared mail instance
        mail.send(message)
        
        logging.info(f"Email sent successfully to {recipient_email} about {filename}")
        return jsonify({'success': True})
    except Exception as e:
        logging.error(f"Error sending email: {e}")
        return jsonify({'success': False, 'error': str(e)})
