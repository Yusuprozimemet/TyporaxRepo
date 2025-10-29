// schedule.js - Time management and scheduling system (Calendar only)

document.addEventListener('DOMContentLoaded', function() {
    createScheduleModal();
    document.getElementById('schedule-button').addEventListener('click', openScheduleModal);
    document.getElementById('close-schedule-modal').addEventListener('click', closeScheduleModal);
    document.getElementById('save-schedule').addEventListener('click', saveScheduleData);
    document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
    document.getElementById('next-month').addEventListener('click', () => changeMonth(1));
    document.getElementById('calendar-grid').addEventListener('click', handleCalendarClick);
    loadScheduleData();
});

// Global variables
let currentDate = new Date();
let selectedDate = null;
let scheduledEvents = {};

function createScheduleModal() {
    const modalHTML = `
        <div id="schedule-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Calendar</h2>
                    <button id="close-schedule-modal" class="close-button">×</button>
                </div>
                <div id="calendar-panel" class="panel active">
                    <div class="calendar-header">
                        <button id="prev-month"><</button>
                        <h3 id="current-month">Month Year</h3>
                        <button id="next-month">></button>
                    </div>
                    <div class="weekdays">
                        <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                    </div>
                    <div id="calendar-grid" class="calendar-grid"></div>
                    <div id="event-form" class="hidden">
                        <h4>Event for <span id="selected-date"></span></h4>
                        <input type="text" id="event-title" placeholder="Event title">
                        <div class="event-time">
                            <input type="time" id="event-start" value="09:00">
                            <span>to</span>
                            <input type="time" id="event-end" value="10:00">
                        </div>
                        <textarea id="event-description" placeholder="Description"></textarea>
                        <div class="event-repeat">
                            <label><input type="checkbox" id="event-repeat"> Repeat weekly</label>
                        </div>
                        <div class="event-buttons">
                            <button id="save-event">Save Event</button>
                            <button id="delete-event" class="hidden">Delete</button>
                            <button id="cancel-event">Cancel</button>
                        </div>
                    </div>
                    <div id="event-list" class="event-list"></div>
                </div>
                <div class="modal-footer">
                    <button id="save-schedule">Save Changes</button>
                </div>
            </div>
        </div>
        <div id="notification" class="notification hidden"></div>
    `;

    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 1000; overflow: hidden; }
        .modal-content { background-color: var(--menu-bg); margin: 50px auto; width: 80%; max-width: 800px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; flex-direction: column; max-height: 85vh; overflow: hidden; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--menu-border); }
        .modal-header h2 { margin: 0; color: var(--text-color); font-size: 1.4rem; }
        .close-button { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-color); }
        .panel { padding: 20px; flex: 1; overflow-y: auto; }
        .panel.active { display: block; }
        .calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .calendar-header button { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--text-color); padding: 4px 8px; }
        .calendar-header h3 { margin: 0; color: var(--text-color); }
        .weekdays { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-weight: bold; margin-bottom: 8px; color: var(--menu-item-color); }
        .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
        .calendar-day { border: 1px solid var(--file-item-border); min-height: 80px; padding: 4px; cursor: pointer; transition: background-color 0.2s; position: relative; }
        .calendar-day:hover { background-color: var(--file-item-hover-bg); }
        .calendar-day.empty { background-color: var(--textarea-bg); cursor: default; }
        .calendar-day.selected { background-color: rgba(74,110,224,0.1); border-color: #4a6ee0; }
        .calendar-day.today { background-color: rgba(74,110,224,0.05); }
        .day-number { text-align: right; margin-bottom: 4px; font-weight: bold; color: var(--text-color); }
        .today .day-number { color: #4a6ee0; }
        .day-events { font-size: 0.85rem; overflow: hidden; }
        .day-event { background-color: #4a6ee0; color: white; padding: 2px 4px; margin-bottom: 2px; border-radius: 2px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; }
        #event-form { margin-top: 16px; padding: 16px; background-color: var(--textarea-bg); border-radius: 8px; }
        #event-form h4 { margin-top: 0; color: var(--text-color); }
        #event-form input, #event-form textarea { width: 100%; padding: 8px; margin-bottom: 12px; border: 1px solid var(--search-input-border); border-radius: 4px; background-color: var(--search-input-bg); color: var(--text-color); box-sizing: border-box; }
        #event-form textarea { height: 80px; resize: vertical; }
        .event-time { display: flex; align-items: center; margin-bottom: 12px; }
        .event-time input { width: 120px; margin-bottom: 0; }
        .event-time span { margin: 0 12px; color: var(--text-color); }
        .event-repeat { margin-bottom: 12px; }
        .event-repeat label { color: var(--text-color); cursor: pointer; }
        .event-repeat input { margin-right: 8px; }
        .event-buttons { display: flex; gap: 8px; }
        .event-buttons button { flex: 1; padding: 8px 0; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; }
        #save-event { background-color: #4a6ee0; color: white; }
        #delete-event { background-color: #e74c3c; color: white; }
        #cancel-event { background-color: var(--menu-item-hover-bg); color: var(--text-color); }
        #event-list { margin-top: 16px; }
        .event-item { padding: 12px; border-bottom: 1px solid var(--file-item-border); cursor: pointer; }
        .event-item:hover { background-color: var(--file-item-hover-bg); }
        .event-item-header { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .event-item-title { font-weight: bold; color: var(--text-color); }
        .event-item-time { color: var(--menu-item-color); font-size: 0.9rem; }
        .event-item-description { color: var(--menu-item-color); font-size: 0.9rem; margin-top: 4px; }
        .modal-footer { padding: 16px 20px; border-top: 1px solid var(--menu-border); display: flex; justify-content: flex-end; }
        .modal-footer button { background-color: #4a6ee0; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; transition: background-color 0.2s; }
        .modal-footer button:hover { background-color: #3c5bb9; }
        .hidden { display: none; }
        .notification { position: fixed; bottom: 20px; right: 20px; padding: 10px 20px; border-radius: 4px; background-color: #4a6ee0; color: white; z-index: 2000; transition: opacity 0.3s; opacity: 0; }
        .notification.show { opacity: 1; }
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.head.appendChild(modalStyle);
}

function openScheduleModal() {
    document.getElementById('schedule-modal').style.display = 'block';
    renderCalendar();
}

function closeScheduleModal() {
    document.getElementById('schedule-modal').style.display = 'none';
}

// ==================== Calendar Management ====================

function renderCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    const currentMonthElement = document.getElementById('current-month');
    
    currentMonthElement.textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate);
    
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    calendarGrid.innerHTML = '';
    
    for (let i = 0; i < startDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyCell);
    }
    
    const today = new Date();
    const todayDate = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        dayCell.dataset.date = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${day}`;
        
        const isToday = day === todayDate && currentDate.getMonth() === todayMonth && currentDate.getFullYear() === todayYear;
        
        if (isToday) dayCell.classList.add('today');
        if (selectedDate === dayCell.dataset.date) dayCell.classList.add('selected');
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayCell.appendChild(dayNumber);
        
        const dayEvents = document.createElement('div');
        dayEvents.className = 'day-events';
        
        const dateKey = dayCell.dataset.date;
        if (scheduledEvents[dateKey]) {
            scheduledEvents[dateKey].forEach(event => {
                const eventElement = document.createElement('div');
                eventElement.className = 'day-event';
                eventElement.textContent = event.title;
                dayEvents.appendChild(eventElement);
            });
        }
        
        dayCell.appendChild(dayEvents);
        calendarGrid.appendChild(dayCell);
    }
    
    document.getElementById('save-event').addEventListener('click', saveEvent);
    document.getElementById('delete-event').addEventListener('click', deleteEvent);
    document.getElementById('cancel-event').addEventListener('click', hideEventForm);
}

function changeMonth(delta) {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1);
    renderCalendar();
}

function handleCalendarClick(event) {
    const dayCell = event.target.closest('.calendar-day');
    if (!dayCell || dayCell.classList.contains('empty')) return;
    
    document.querySelectorAll('.calendar-day.selected').forEach(cell => cell.classList.remove('selected'));
    dayCell.classList.add('selected');
    selectedDate = dayCell.dataset.date;
    
    showEventForm();
    renderEventList();
}

function showEventForm() {
    const eventForm = document.getElementById('event-form');
    eventForm.classList.remove('hidden');
    
    const formattedDate = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    document.getElementById('selected-date').textContent = formattedDate;
    
    document.getElementById('event-title').value = '';
    document.getElementById('event-start').value = '09:00';
    document.getElementById('event-end').value = '10:00';
    document.getElementById('event-description').value = '';
    document.getElementById('event-repeat').checked = false;
    document.getElementById('delete-event').classList.add('hidden');
}

function hideEventForm() {
    document.getElementById('event-form').classList.add('hidden');
}

function saveEvent() {
    const title = document.getElementById('event-title').value.trim();
    if (!title) {
        showCustomNotification('Please enter an event title', 'error');
        return;
    }
    
    const startTime = document.getElementById('event-start').value;
    const endTime = document.getElementById('event-end').value;
    const description = document.getElementById('event-description').value.trim();
    const isRepeating = document.getElementById('event-repeat').checked;
    
    const baseEvent = {
        id: Date.now().toString(),
        title,
        startTime,
        endTime,
        description,
        isRepeating
    };
    
    if (!scheduledEvents[selectedDate]) {
        scheduledEvents[selectedDate] = [];
    }
    scheduledEvents[selectedDate].push(baseEvent);
    
    if (isRepeating) {
        const [year, month, day] = selectedDate.split('-').map(Number);
        const baseDate = new Date(year, month - 1, day);
        
        // Add event for next 3 months (12 weeks)
        for (let i = 1; i <= 12; i++) {
            const nextDate = new Date(baseDate);
            nextDate.setDate(baseDate.getDate() + (i * 7));
            const nextDateKey = formatDate(nextDate);
            
            if (!scheduledEvents[nextDateKey]) {
                scheduledEvents[nextDateKey] = [];
            }
            
            scheduledEvents[nextDateKey].push({
                ...baseEvent,
                id: Date.now().toString() + i, // Unique ID for each repetition
            });
        }
    }
    
    hideEventForm();
    renderCalendar();
    renderEventList();
    showCustomNotification('Event saved successfully', 'success');
}

function deleteEvent() {
    const eventId = document.getElementById('event-form').dataset.eventId;
    if (!eventId) return;
    
    const eventIndex = scheduledEvents[selectedDate].findIndex(event => event.id === eventId);
    if (eventIndex !== -1) {
        scheduledEvents[selectedDate].splice(eventIndex, 1);
        if (scheduledEvents[selectedDate].length === 0) {
            delete scheduledEvents[selectedDate];
        }
        hideEventForm();
        renderCalendar();
        renderEventList();
        showCustomNotification('Event deleted successfully', 'success');
    }
}

function renderEventList() {
    const eventList = document.getElementById('event-list');
    eventList.innerHTML = '';
    
    if (!selectedDate || !scheduledEvents[selectedDate] || scheduledEvents[selectedDate].length === 0) {
        eventList.innerHTML = '<div class="no-events">No events scheduled for this day</div>';
        return;
    }
    
    const sortedEvents = [...scheduledEvents[selectedDate]].sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    sortedEvents.forEach(event => {
        const eventItem = document.createElement('div');
        eventItem.className = 'event-item';
        eventItem.dataset.eventId = event.id;
        
        eventItem.innerHTML = `
            <div class="event-item-header">
                <div class="event-item-title">${event.title}${event.isRepeating ? ' (Repeating)' : ''}</div>
                <div class="event-item-time">${event.startTime} - ${event.endTime}</div>
            </div>
            ${event.description ? `<div class="event-item-description">${event.description}</div>` : ''}
        `;
        
        eventItem.addEventListener('click', () => editEvent(event.id));
        eventList.appendChild(eventItem);
    });
}

function editEvent(eventId) {
    if (!selectedDate || !scheduledEvents[selectedDate]) return;
    
    const event = scheduledEvents[selectedDate].find(event => event.id === eventId);
    if (!event) return;
    
    const eventForm = document.getElementById('event-form');
    eventForm.classList.remove('hidden');
    eventForm.dataset.eventId = eventId;
    
    document.getElementById('event-title').value = event.title;
    document.getElementById('event-start').value = event.startTime;
    document.getElementById('event-end').value = event.endTime;
    document.getElementById('event-description').value = event.description || '';
    document.getElementById('event-repeat').checked = event.isRepeating || false;
    document.getElementById('delete-event').classList.remove('hidden');
}

// ==================== Data Management ====================

function saveScheduleData() {
    const scheduleData = { scheduledEvents, lastSaved: new Date().toISOString() };
    localStorage.setItem('scheduleData', JSON.stringify(scheduleData));
    saveToServer(scheduleData);
    showCustomNotification('Calendar data saved successfully', 'success');
}

function saveToServer(data) {
    console.log('Saving to server:', data);
}

function loadScheduleData() {
    const localData = localStorage.getItem('scheduleData');
    if (localData) {
        try {
            const parsedData = JSON.parse(localData);
            scheduledEvents = parsedData.scheduledEvents || {};
            console.log('Loaded data from local storage');
        } catch (error) {
            console.error('Error parsing local data:', error);
            scheduledEvents = {};
        }
    } else {
        loadFromServer();
    }
}

function loadFromServer() {
    scheduledEvents = {};
    console.log('Initialized with empty data');
}

// ==================== Notifications ====================

function checkNotifications() {
    const now = new Date();
    const today = formatDate(now);
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const todayEvents = scheduledEvents[today] || [];
    
    todayEvents.forEach(event => {
        const [hours, minutes] = event.startTime.split(':').map(num => parseInt(num));
        const eventTime = hours * 60 + minutes;
        if (eventTime - currentTime === 15) {
            showNotification('Upcoming Event', `${event.title} starts in 15 minutes at ${event.startTime}`);
        }
    });
}

function showNotification(title, message) {
    if (!("Notification" in window)) {
        console.log("This browser does not support notifications");
        return;
    }
    
    if (Notification.permission === "granted") {
        new Notification(title, { body: message });
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                new Notification(title, { body: message });
            }
        });
    }
}

function showCustomNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.remove('hidden');
    notification.style.backgroundColor = type === 'error' ? '#e74c3c' : '#4a6ee0';
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.classList.add('hidden'), 300);
    }, 3000);
}

// ==================== Utility Functions ====================

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ==================== Initialize Features ====================

setInterval(checkNotifications, 60000);

document.addEventListener('DOMContentLoaded', function() {
    const modalFooter = document.querySelector('.modal-footer');
    
    const exportButton = document.createElement('button');
    exportButton.id = 'export-schedule';
    exportButton.textContent = 'Export Data';
    exportButton.addEventListener('click', exportScheduleData);
    modalFooter.prepend(exportButton);
    
    const importButton = document.createElement('button');
    importButton.id = 'import-schedule';
    importButton.textContent = 'Import Data';
    modalFooter.prepend(importButton);
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'import-file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', importScheduleData);
    modalFooter.prepend(fileInput);
    
    importButton.addEventListener('click', () => fileInput.click());
    
    const additionalButtonStyle = document.createElement('style');
    additionalButtonStyle.textContent = `
        #export-schedule, #import-schedule { background-color: var(--menu-item-hover-bg); color: var(--text-color); border: 1px solid var(--menu-border); margin-right: 8px; }
        #export-schedule:hover, #import-schedule:hover { background-color: var(--file-item-hover-bg); }
    `;
    document.head.appendChild(additionalButtonStyle);
    
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }
});

function exportScheduleData() {
    const scheduleData = { scheduledEvents, exportDate: new Date().toISOString() };
    const dataStr = JSON.stringify(scheduleData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileName = `calendar_export_${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
}

function importScheduleData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (!importedData.scheduledEvents) {
                throw new Error('Invalid data format');
            }
            if (confirm('This will replace your current calendar data. Continue?')) {
                scheduledEvents = importedData.scheduledEvents;
                renderCalendar();
                showCustomNotification('Calendar data imported successfully', 'success');
            }
        } catch (error) {
            console.error('Error importing data:', error);
            showCustomNotification('Error importing data. Please check the file format.', 'error');
        }
    };
    reader.readAsText(file);
}

document.addEventListener('keydown', function(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === 's' && document.getElementById('schedule-modal').style.display === 'block') {
        event.preventDefault();
        saveScheduleData();
    }
    if (event.key === 'Escape' && document.getElementById('schedule-modal').style.display === 'block') {
        closeScheduleModal();
    }
});

window.addEventListener('resize', function() {
    if (document.getElementById('schedule-modal').style.display === 'block') {
        renderCalendar();
    }
});

console.log('Calendar system initialized');