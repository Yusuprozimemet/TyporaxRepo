from flask import Blueprint, current_app, jsonify, request, session
import os
import json
from datetime import datetime
from ..utils import get_user_artifacts_dir  # Import helper function

bp = Blueprint('schedule', __name__)


@bp.route('/save-schedule', methods=['POST'])
def save_schedule():
    try:
        data = request.get_json()
        username = session.get('username')  # Retrieve username from session
        # Get user-specific artifacts directory
        user_dir = get_user_artifacts_dir(username)
        os.makedirs(user_dir, exist_ok=True)

        data['lastSaved'] = datetime.now().isoformat()
        data['lastSavedBy'] = username

        schedule_file = os.path.join(user_dir, 'schedule-data.json')
        with open(schedule_file, 'w') as f:
            json.dump(data, f)

        return jsonify({
            "success": True,
            "message": "Calendar data saved successfully",
            "timestamp": data['lastSaved']
        })
    except Exception as e:
        current_app.logger.error(
            f"Error saving calendar data for user {username}: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route('/get-schedule', methods=['GET'])
def get_schedule():
    try:
        username = session.get('username')  # Retrieve username from session
        # Get user-specific artifacts directory
        user_dir = get_user_artifacts_dir(username)
        schedule_file = os.path.join(user_dir, 'schedule-data.json')

        if os.path.exists(schedule_file):
            with open(schedule_file, 'r') as f:
                data = json.load(f)
            return jsonify(data)
        else:
            return jsonify({
                "scheduledEvents": {},
                "lastSaved": datetime.now().isoformat()
            })
    except Exception as e:
        current_app.logger.error(
            f"Error retrieving calendar data for user {username}: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route('/export-schedule', methods=['GET'])
def export_schedule():
    try:
        username = session.get('username')  # Retrieve username from session
        # Get user-specific artifacts directory
        user_dir = get_user_artifacts_dir(username)
        schedule_file = os.path.join(user_dir, 'schedule-data.json')

        if os.path.exists(schedule_file):
            with open(schedule_file, 'r') as f:
                data = json.load(f)

            data['exportDate'] = datetime.now().isoformat()
            data['exportedBy'] = username

            return jsonify(data)
        else:
            return jsonify({"error": "No calendar data found"}), 404
    except Exception as e:
        current_app.logger.error(
            f"Error exporting calendar data for user {username}: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route('/import-schedule', methods=['POST'])
def import_schedule():
    try:
        data = request.get_json()
        username = session.get('username')  # Retrieve username from session

        if 'scheduledEvents' not in data:
            return jsonify({"success": False, "error": "Invalid data format"}), 400

        # Get user-specific artifacts directory
        user_dir = get_user_artifacts_dir(username)
        os.makedirs(user_dir, exist_ok=True)

        data['importDate'] = datetime.now().isoformat()
        data['importedBy'] = username
        data['lastSaved'] = datetime.now().isoformat()

        schedule_file = os.path.join(user_dir, 'schedule-data.json')
        with open(schedule_file, 'w') as f:
            json.dump(data, f)

        return jsonify({
            "success": True,
            "message": "Calendar data imported successfully"
        })
    except Exception as e:
        current_app.logger.error(
            f"Error importing calendar data for user {username}: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route('/schedule-stats', methods=['GET'])
def get_stats():
    try:
        username = session.get('username')  # Retrieve username from session
        # Get user-specific artifacts directory
        user_dir = get_user_artifacts_dir(username)
        schedule_file = os.path.join(user_dir, 'schedule-data.json')

        if os.path.exists(schedule_file):
            with open(schedule_file, 'r') as f:
                data = json.load(f)

            total_events = 0
            repeating_events = 0
            for date, events_list in data.get('scheduledEvents', {}).items():
                total_events += len(events_list)
                repeating_events += sum(
                    1 for event in events_list if event.get('isRepeating', False))

            return jsonify({
                "totalEvents": total_events,
                "repeatingEvents": repeating_events,
                "nonRepeatingEvents": total_events - repeating_events,
                "lastUpdated": data.get('lastSaved', None)
            })
        else:
            return jsonify({
                "totalEvents": 0,
                "repeatingEvents": 0,
                "nonRepeatingEvents": 0,
                "lastUpdated": None
            })
    except Exception as e:
        current_app.logger.error(
            f"Error retrieving calendar stats for user {username}: {str(e)}")
        return jsonify({"error": str(e)}), 500
