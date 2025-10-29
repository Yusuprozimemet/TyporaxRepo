# src/blueprints/upgrade.py
from flask import Blueprint, render_template, jsonify, session, request
from src.models import User, db
from .auth import login_required
from datetime import datetime, timedelta
import logging

upgrade_bp = Blueprint('upgrade', __name__)


@upgrade_bp.route('/')
@login_required
def upgrade():
    """Render the upgrade page."""
    username = session.get('username')
    logging.debug(f"Rendering upgrade page for user {username}")
    return render_template('upgrade.html')


@upgrade_bp.route('/status')
@login_required
def get_upgrade_status():
    """Return the user's current user_type and subscription details."""
    username = session.get('username')
    user = User.query.filter_by(username=username).first()
    if not user:
        logging.error(f"User {username} not found")
        return jsonify({'success': False, 'error': 'User not found'}), 404

    response = {
        'success': True,
        'user_type': user.user_type,
        'subscription_start_date': user.subscription_start_date.strftime('%B %d, %Y') if user.subscription_start_date else None,
        'next_billing_date': user.next_billing_date.strftime('%B %d, %Y') if user.next_billing_date else None,
        'is_canceled': user.is_canceled
    }
    logging.debug(f"Retrieved user status for {username}: {response}")
    return jsonify(response)


@upgrade_bp.route('/process-payment', methods=['POST'])
@login_required
def process_payment():
    """Process the user's upgrade to premium and store subscription details."""
    username = session.get('username')
    user = User.query.filter_by(username=username).first()
    if not user:
        logging.error(f"User {username} not found")
        return jsonify({'success': False, 'error': 'User not found'}), 404
    if user.user_type == 'premium' and not user.is_canceled:
        logging.info(f"User {username} is already premium")
        return jsonify({'success': False, 'error': 'You are already a premium user'}), 400

    try:
        # Get payment details from the request
        data = request.get_json()
        order_id = data.get('orderId')
        payment_details = data.get('paymentDetails')

        # In a real application, validate the payment with PayPal's API here
        # For this example, assume the payment is valid

        # Set user as premium
        user.user_type = 'premium'
        user.is_canceled = False
        user.subscription_start_date = datetime.utcnow()
        user.next_billing_date = user.subscription_start_date + \
            timedelta(days=30)  # 1 month from now
        db.session.commit()

        logging.info(f"User {username} upgraded to premium")
        return jsonify({
            'success': True,
            'message': 'Upgrade successful! You are now a premium user.',
            'subscription_start_date': user.subscription_start_date.strftime('%B %d, %Y'),
            'next_billing_date': user.next_billing_date.strftime('%B %d, %Y')
        })
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error upgrading user {username} to premium: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to process upgrade'}), 500


@upgrade_bp.route('/unsubscribe', methods=['POST'])
@login_required
def unsubscribe():
    """Cancel the user's premium subscription."""
    username = session.get('username')
    user = User.query.filter_by(username=username).first()
    if not user:
        logging.error(f"User {username} not found")
        return jsonify({'success': False, 'error': 'User not found'}), 404
    if user.user_type != 'premium':
        logging.info(f"User {username} is not premium")
        return jsonify({'success': False, 'error': 'You are not a premium user'}), 400
    if user.is_canceled:
        logging.info(
            f"User {username} has already canceled their subscription")
        return jsonify({'success': False, 'error': 'Your subscription is already canceled'}), 400

    try:
        # In a real application, you would also cancel the subscription with PayPal's API
        # For this example, just mark the subscription as canceled
        user.is_canceled = True
        db.session.commit()

        logging.info(f"User {username} canceled their subscription")
        return jsonify({
            'success': True,
            'message': 'Subscription canceled successfully. Premium features will remain active until the end of the billing period.'
        })
    except Exception as e:
        db.session.rollback()
        logging.error(
            f"Error canceling subscription for user {username}: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to cancel subscription'}), 500
