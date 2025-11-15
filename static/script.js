// Medical Tracking & Engagement Kit - Frontend JavaScript
const API_URL = 'http://localhost:3000/api';

// Data Storage (for local cache)
let medications = [];
let reminders = [];
let vitals = [];
let appointments = [];

// Audio context for sound alerts
let audioContext;
let hasPlayedSound = new Set(); // Track which reminders have played sound

// Initialize app on load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏥 Medical Tracker Initializing...');
    initializeApp();
});

// Initialize all app components
async function initializeApp() {
    try {
        // Check server health first
        await checkServerHealth();
        
        // Load all data
        await loadData();
        
        // Initialize notification system
        checkReminders();
        requestNotificationPermission();
        initAudioContext();
        
        // Set up periodic checks
        setInterval(checkReminders, 60000); // Check every minute
        setInterval(updateStatistics, 30000); // Update stats every 30 seconds
        
        console.log('✅ Medical Tracker initialized successfully');
        
        // Show welcome message
        setTimeout(() => {
            showToast('Welcome to Medical Tracking & Engagement Kit! 🏥');
        }, 1000);
        
    } catch (error) {
        console.error('❌ App initialization failed:', error);
        showToast('Failed to initialize app. Please check console.', 'error');
    }
}

// Check server health
async function checkServerHealth() {
    try {
        const response = await fetch(`${API_URL}/health`);
        if (!response.ok) throw new Error('Server not responding');
        
        const health = await response.json();
        console.log('✅ Server health:', health);
        return true;
    } catch (error) {
        console.error('❌ Server health check failed:', error);
        showToast('Cannot connect to server. Using offline mode.', 'warning');
        return false;
    }
}

// Initialize Audio Context
function initAudioContext() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('✅ Audio context initialized');
    } catch (e) {
        console.log('Web Audio API not supported');
    }
}

// Play notification sound
function playNotificationSound(type = 'reminder') {
    if (!audioContext) {
        initAudioContext();
    }
    
    // Resume audio context if suspended (required by browsers)
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Different sounds for different alerts
        if (type === 'urgent') {
            // Urgent alert: rapid beeping
            oscillator.frequency.value = 800;
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            
            oscillator.start(audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.stop(audioContext.currentTime + 0.1);
            
            setTimeout(() => {
                const osc2 = audioContext.createOscillator();
                const gain2 = audioContext.createGain();
                osc2.connect(gain2);
                gain2.connect(audioContext.destination);
                osc2.frequency.value = 800;
                gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
                osc2.start(audioContext.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                osc2.stop(audioContext.currentTime + 0.1);
            }, 200);
        } else {
            // Standard reminder: pleasant chime
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
            oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
            oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        }
    } catch (error) {
        console.error('Error playing sound:', error);
        // Fallback: try to play a beep using the default system sound
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi2Izffilz0OFFy36+62YBADOJfW8sJwKQQjeMrz2ZBGDBY4lt3ux2QRATuZ2u+tXhMIM5nV76ZMGAg7mtfwslwV');
            audio.play().catch(e => console.log('Fallback sound failed:', e));
        } catch (e) {
            console.log('All sound playback methods failed');
        }
    }
}

// Load all data from API
async function loadData() {
    try {
        console.log('📥 Loading data from server...');
        
        await Promise.all([
            loadMedications(),
            loadReminders(),
            loadVitals(),
            loadAppointments()
        ]);
        
        updateStatistics();
        console.log('✅ All data loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading data:', error);
        showToast('Failed to load data. Please check your connection.', 'error');
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    
    // Set message and type
    toast.textContent = message;
    toast.className = 'toast'; // Reset classes
    
    // Add type-specific styling
    switch (type) {
        case 'error':
            toast.style.background = 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)';
            break;
        case 'warning':
            toast.style.background = 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)';
            break;
        case 'success':
            toast.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
            break;
        default:
            toast.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
    
    // Show toast
    toast.classList.add('show');
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Update statistics
function updateStatistics() {
    try {
        // Update medication count
        document.getElementById('totalMeds').textContent = medications.length;
        
        // Update today's reminders
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayReminders = reminders.filter(r => {
            const reminderDate = new Date(r.date_time);
            reminderDate.setHours(0, 0, 0, 0);
            return reminderDate.getTime() === today.getTime();
        });
        document.getElementById('todayReminders').textContent = todayReminders.length;
        
        // Update upcoming appointments
        const upcomingAppointments = appointments.filter(a => new Date(a.date_time) >= new Date());
        document.getElementById('upcomingAppointments').textContent = upcomingAppointments.length;
        
        // Update vital records
        document.getElementById('vitalRecords').textContent = vitals.length;
        
    } catch (error) {
        console.error('Error updating statistics:', error);
    }
}

// ==================== MEDICATION FUNCTIONS ====================

async function loadMedications() {
    try {
        const response = await fetch(`${API_URL}/medications`);
        if (!response.ok) throw new Error('Failed to fetch medications');
        
        medications = await response.json();
        renderMedications();
        
        console.log(`✅ Loaded ${medications.length} medications`);
    } catch (error) {
        console.error('❌ Error loading medications:', error);
        showToast('Failed to load medications', 'error');
    }
}

async function addMedication() {
    const name = document.getElementById('medName').value.trim();
    const dosage = document.getElementById('medDosage').value.trim();
    const frequency = document.getElementById('medFrequency').value;
    const time = document.getElementById('medTime').value;
    
    // Validation
    if (!name || !dosage || !time) {
        showToast('Please fill in all medication fields', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/medications`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                name, 
                dosage, 
                frequency, 
                time 
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add medication');
        }
        
        // Clear form
        document.getElementById('medName').value = '';
        document.getElementById('medDosage').value = '';
        document.getElementById('medTime').value = '';
        
        // Reload data
        await loadMedications();
        updateStatistics();
        
        showToast('Medication added successfully! 💊', 'success');
        
    } catch (error) {
        console.error('❌ Error adding medication:', error);
        showToast(`Failed to add medication: ${error.message}`, 'error');
    }
}

function renderMedications() {
    const list = document.getElementById('medicationList');
    
    if (medications.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💊</div>
                <div class="empty-state-text">No medications added yet</div>
                <p class="empty-state-subtext">Add your first medication to get started</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = medications.map(med => {
        const takenStatus = med.taken ? 'Taken' : 'Pending';
        const statusClass = med.taken ? 'badge-success' : 'badge-warning';
        
        return `
            <div class="list-item" data-id="${med.id}">
                <div class="list-item-header">
                    <span class="list-item-title">${escapeHtml(med.name)}</span>
                    <span class="badge ${statusClass}">${takenStatus}</span>
                </div>
                <div class="list-item-content">
                    <p><strong>Dosage:</strong> ${escapeHtml(med.dosage)}</p>
                    <p><strong>Frequency:</strong> ${escapeHtml(med.frequency)}</p>
                    <p><strong>Time:</strong> ${formatTime(med.time)}</p>
                    <p><strong>Added:</strong> ${formatDate(med.created_at)}</p>
                </div>
                <div class="list-item-actions">
                    ${!med.taken ? `
                        <button class="btn btn-success" onclick="markTaken(${med.id})" title="Mark as taken">
                            <i class="fas fa-check"></i> Taken
                        </button>
                    ` : ''}
                    <button class="btn btn-danger" onclick="deleteMedication(${med.id})" title="Delete medication">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function markTaken(id) {
    try {
        const response = await fetch(`${API_URL}/medications/${id}/taken`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taken: true })
        });
        
        if (!response.ok) throw new Error('Failed to update medication');
        
        await loadMedications();
        showToast('Medication marked as taken! ✅', 'success');
        
    } catch (error) {
        console.error('❌ Error updating medication:', error);
        showToast('Failed to update medication', 'error');
    }
}

async function deleteMedication(id) {
    if (!confirm('Are you sure you want to delete this medication?')) return;
    
    try {
        const response = await fetch(`${API_URL}/medications/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete medication');
        
        await loadMedications();
        updateStatistics();
        showToast('Medication deleted 🗑️', 'success');
        
    } catch (error) {
        console.error('❌ Error deleting medication:', error);
        showToast('Failed to delete medication', 'error');
    }
}

// ==================== REMINDER FUNCTIONS ====================

async function loadReminders() {
    try {
        const response = await fetch(`${API_URL}/reminders`);
        if (!response.ok) throw new Error('Failed to fetch reminders');
        
        reminders = await response.json();
        renderReminders();
        
        console.log(`✅ Loaded ${reminders.length} reminders`);
    } catch (error) {
        console.error('❌ Error loading reminders:', error);
        showToast('Failed to load reminders', 'error');
    }
}

async function addReminder() {
    const title = document.getElementById('reminderTitle').value.trim();
    const dateTime = document.getElementById('reminderDateTime').value;
    const notes = document.getElementById('reminderNotes').value.trim();
    
    if (!title || !dateTime) {
        showToast('Please fill in title and date/time', 'warning');
        return;
    }
    
    // Validate future date
    const reminderTime = new Date(dateTime);
    if (reminderTime <= new Date()) {
        showToast('Please select a future date and time', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/reminders`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                title, 
                date_time: dateTime, 
                notes: notes || null 
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add reminder');
        }
        
        // Clear form
        document.getElementById('reminderTitle').value = '';
        document.getElementById('reminderDateTime').value = '';
        document.getElementById('reminderNotes').value = '';
        
        await loadReminders();
        updateStatistics();
        showToast('Reminder set successfully! ⏰', 'success');
        
    } catch (error) {
        console.error('❌ Error adding reminder:', error);
        showToast(`Failed to add reminder: ${error.message}`, 'error');
    }
}

function renderReminders() {
    const list = document.getElementById('reminderList');
    
    if (reminders.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⏰</div>
                <div class="empty-state-text">No reminders set</div>
                <p class="empty-state-subtext">Set your first reminder to stay organized</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = reminders.map(rem => {
        const reminderDate = new Date(rem.date_time);
        const now = new Date();
        const isPast = reminderDate < now;
        const statusClass = isPast ? 'badge-danger' : 'badge-success';
        const statusText = isPast ? 'Past' : 'Upcoming';
        
        return `
            <div class="list-item" data-id="${rem.id}">
                <div class="list-item-header">
                    <span class="list-item-title">${escapeHtml(rem.title)}</span>
                    <span class="badge ${statusClass}">${statusText}</span>
                </div>
                <div class="list-item-content">
                    <p><strong>Date & Time:</strong> ${formatDateTime(rem.date_time)}</p>
                    ${rem.notes ? `<p><strong>Notes:</strong> ${escapeHtml(rem.notes)}</p>` : ''}
                    <p><strong>Status:</strong> ${rem.notified ? 'Notified' : 'Pending'}</p>
                </div>
                <div class="list-item-actions">
                    <button class="btn btn-danger" onclick="deleteReminder(${rem.id})" title="Delete reminder">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function deleteReminder(id) {
    if (!confirm('Are you sure you want to delete this reminder?')) return;
    
    try {
        const response = await fetch(`${API_URL}/reminders/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete reminder');
        
        // Remove from hasPlayedSound set
        hasPlayedSound.delete(`${id}-5min`);
        hasPlayedSound.delete(`${id}-now`);
        
        await loadReminders();
        updateStatistics();
        showToast('Reminder deleted 🗑️', 'success');
        
    } catch (error) {
        console.error('❌ Error deleting reminder:', error);
        showToast('Failed to delete reminder', 'error');
    }
}

function checkReminders() {
    const now = new Date();
    
    reminders.forEach(reminder => {
        const reminderTime = new Date(reminder.date_time);
        const timeDiff = reminderTime - now;
        
        // Alert 5 minutes before (300000 ms = 5 minutes)
        if (timeDiff > 0 && timeDiff <= 300000 && !reminder.notified && !hasPlayedSound.has(`${reminder.id}-5min`)) {
            // Play sound alert
            playNotificationSound('reminder');
            
            // Show browser notification
            sendNotification(reminder.title, `Reminder in 5 minutes: ${reminder.title}`);
            
            // Show toast
            showToast(`⏰ Reminder: "${reminder.title}" in 5 minutes!`);
            
            // Mark as notified on server
            fetch(`${API_URL}/reminders/${reminder.id}/notify`, {
                method: 'PUT'
            }).catch(err => console.error('Failed to mark reminder as notified:', err));
            
            // Track that we've played sound for this reminder
            hasPlayedSound.add(`${reminder.id}-5min`);
            reminder.notified = true;
        }
        
        // Alert when reminder time arrives
        else if (timeDiff > -60000 && timeDiff <= 0 && !hasPlayedSound.has(`${reminder.id}-now`)) {
            // Play urgent sound alert
            playNotificationSound('urgent');
            
            sendNotification(reminder.title, `It's time: ${reminder.title}!`);
            showToast(`🔔 Time for: "${reminder.title}"!`);
            
            fetch(`${API_URL}/reminders/${reminder.id}/notify`, {
                method: 'PUT'
            }).catch(err => console.error('Failed to mark reminder as notified:', err));
            
            // Track that we've played sound for this reminder
            hasPlayedSound.add(`${reminder.id}-now`);
        }
    });
}

// Browser Notification System
function sendNotification(title, body) {
    if (!("Notification" in window)) {
        console.log("This browser does not support desktop notifications");
        return;
    }
    
    if (Notification.permission === "granted") {
        createNotification(title, body);
    }
    else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                createNotification(title, body);
            }
        });
    }
}

function createNotification(title, body) {
    const notification = new Notification(title, {
        body: body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'medical-reminder',
        requireInteraction: true,
        vibrate: [200, 100, 200],
    });
    
    notification.onclick = function() {
        window.focus();
        notification.close();
    };
    
    // Auto-close after 10 seconds
    setTimeout(() => {
        notification.close();
    }, 10000);
}

function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
        // Show a friendly prompt after a short delay
        setTimeout(() => {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    console.log('✅ Notifications enabled');
                    showToast("Notifications enabled! You'll receive reminder alerts.", 'success');
                } else {
                    console.log('❌ Notifications disabled');
                    showToast("Notifications disabled. You won't receive alert sounds.", 'warning');
                }
            });
        }, 3000);
    }
}

// ==================== VITAL SIGNS FUNCTIONS ====================

async function loadVitals() {
    try {
        const response = await fetch(`${API_URL}/vitals`);
        if (!response.ok) throw new Error('Failed to fetch vitals');
        
        vitals = await response.json();
        renderVitals();
        
        console.log(`✅ Loaded ${vitals.length} vital records`);
    } catch (error) {
        console.error('❌ Error loading vitals:', error);
        showToast('Failed to load vital signs', 'error');
    }
}

async function addVitalSigns() {
    const bloodPressure = document.getElementById('bloodPressure').value.trim();
    const heartRate = document.getElementById('heartRate').value;
    const temperature = document.getElementById('temperature').value;
    const bloodSugar = document.getElementById('bloodSugar').value;
    
    // Validate at least one field is filled
    if (!bloodPressure && !heartRate && !temperature && !bloodSugar) {
        showToast('Please enter at least one vital sign', 'warning');
        return;
    }
    
    // Validate specific fields
    if (bloodPressure && !isValidBloodPressure(bloodPressure)) {
        showToast('Please enter blood pressure in format: 120/80', 'warning');
        return;
    }
    
    if (heartRate && (heartRate < 30 || heartRate > 200)) {
        showToast('Please enter a valid heart rate (30-200 bpm)', 'warning');
        return;
    }
    
    if (temperature && (temperature < 95 || temperature > 107)) {
        showToast('Please enter a valid temperature (95-107°F)', 'warning');
        return;
    }
    
    if (bloodSugar && (bloodSugar < 50 || bloodSugar > 500)) {
        showToast('Please enter a valid blood sugar level (50-500 mg/dL)', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/vitals`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                blood_pressure: bloodPressure || null,
                heart_rate: heartRate || null,
                temperature: temperature || null,
                blood_sugar: bloodSugar || null
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add vital signs');
        }
        
        // Clear form
        document.getElementById('bloodPressure').value = '';
        document.getElementById('heartRate').value = '';
        document.getElementById('temperature').value = '';
        document.getElementById('bloodSugar').value = '';
        
        await loadVitals();
        updateStatistics();
        showToast('Vital signs recorded! ❤️', 'success');
        
    } catch (error) {
        console.error('❌ Error adding vital signs:', error);
        showToast(`Failed to record vital signs: ${error.message}`, 'error');
    }
}

function isValidBloodPressure(bp) {
    const bpRegex = /^\d{2,3}\/\d{2,3}$/;
    return bpRegex.test(bp);
}

function renderVitals() {
    const list = document.getElementById('vitalsList');
    
    if (vitals.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❤️</div>
                <div class="empty-state-text">No vital signs recorded</div>
                <p class="empty-state-subtext">Record your first vital signs to track your health</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = vitals.map(vital => {
        const hasData = vital.blood_pressure || vital.heart_rate || vital.temperature || vital.blood_sugar;
        
        if (!hasData) return '';
        
        return `
            <div class="list-item" data-id="${vital.id}">
                <div class="list-item-header">
                    <span class="list-item-title">Vital Signs</span>
                    <span class="badge badge-success">${formatDate(vital.recorded_date)}</span>
                </div>
                <div class="list-item-content">
                    ${vital.blood_pressure ? `
                        <p><strong>Blood Pressure:</strong> 
                            <span class="vital-value ${getBpStatus(vital.blood_pressure)}">${vital.blood_pressure} mmHg</span>
                        </p>
                    ` : ''}
                    ${vital.heart_rate ? `
                        <p><strong>Heart Rate:</strong> 
                            <span class="vital-value ${getHrStatus(vital.heart_rate)}">${vital.heart_rate} bpm</span>
                        </p>
                    ` : ''}
                    ${vital.temperature ? `
                        <p><strong>Temperature:</strong> 
                            <span class="vital-value ${getTempStatus(vital.temperature)}">${vital.temperature}°F</span>
                        </p>
                    ` : ''}
                    ${vital.blood_sugar ? `
                        <p><strong>Blood Sugar:</strong> 
                            <span class="vital-value ${getSugarStatus(vital.blood_sugar)}">${vital.blood_sugar} mg/dL</span>
                        </p>
                    ` : ''}
                </div>
                <div class="list-item-actions">
                    <button class="btn btn-danger" onclick="deleteVital(${vital.id})" title="Delete vital record">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Vital sign status helpers
function getBpStatus(bp) {
    const [systolic, diastolic] = bp.split('/').map(Number);
    if (systolic < 90 || diastolic < 60) return 'low';
    if (systolic > 140 || diastolic > 90) return 'high';
    return 'normal';
}

function getHrStatus(hr) {
    if (hr < 60) return 'low';
    if (hr > 100) return 'high';
    return 'normal';
}

function getTempStatus(temp) {
    if (temp < 97.5) return 'low';
    if (temp > 99.5) return 'high';
    return 'normal';
}

function getSugarStatus(sugar) {
    if (sugar < 70) return 'low';
    if (sugar > 140) return 'high';
    return 'normal';
}

async function deleteVital(id) {
    if (!confirm('Are you sure you want to delete this vital record?')) return;
    
    try {
        const response = await fetch(`${API_URL}/vitals/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete vital record');
        
        await loadVitals();
        updateStatistics();
        showToast('Vital record deleted 🗑️', 'success');
        
    } catch (error) {
        console.error('❌ Error deleting vital record:', error);
        showToast('Failed to delete vital record', 'error');
    }
}

// ==================== APPOINTMENT FUNCTIONS ====================

async function loadAppointments() {
    try {
        const response = await fetch(`${API_URL}/appointments`);
        if (!response.ok) throw new Error('Failed to fetch appointments');
        
        appointments = await response.json();
        renderAppointments();
        
        console.log(`✅ Loaded ${appointments.length} appointments`);
    } catch (error) {
        console.error('❌ Error loading appointments:', error);
        showToast('Failed to load appointments', 'error');
    }
}

async function addAppointment() {
    const doctor = document.getElementById('appointmentDoctor').value.trim();
    const type = document.getElementById('appointmentType').value;
    const dateTime = document.getElementById('appointmentDateTime').value;
    const location = document.getElementById('appointmentLocation').value.trim();
    
    if (!doctor || !dateTime) {
        showToast('Please fill in doctor name and date/time', 'warning');
        return;
    }
    
    // Validate future date
    const appointmentTime = new Date(dateTime);
    if (appointmentTime <= new Date()) {
        showToast('Please select a future date and time', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/appointments`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                doctor,
                type,
                date_time: dateTime,
                location: location || null
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add appointment');
        }
        
        // Clear form
        document.getElementById('appointmentDoctor').value = '';
        document.getElementById('appointmentDateTime').value = '';
        document.getElementById('appointmentLocation').value = '';
        
        await loadAppointments();
        updateStatistics();
        showToast('Appointment scheduled! 📅', 'success');
        
    } catch (error) {
        console.error('❌ Error adding appointment:', error);
        showToast(`Failed to schedule appointment: ${error.message}`, 'error');
    }
}

function renderAppointments() {
    const list = document.getElementById('appointmentList');
    
    if (appointments.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📅</div>
                <div class="empty-state-text">No appointments scheduled</div>
                <p class="empty-state-subtext">Schedule your first medical appointment</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = appointments.map(apt => {
        const aptDate = new Date(apt.date_time);
        const now = new Date();
        const isPast = aptDate < now;
        const statusClass = isPast ? 'badge-danger' : 'badge-success';
        const statusText = isPast ? 'Past' : 'Upcoming';
        
        return `
            <div class="list-item" data-id="${apt.id}">
                <div class="list-item-header">
                    <span class="list-item-title">${escapeHtml(apt.doctor)}</span>
                    <span class="badge ${statusClass}">${statusText}</span>
                </div>
                <div class="list-item-content">
                    <p><strong>Type:</strong> ${escapeHtml(apt.type)}</p>
                    <p><strong>Date & Time:</strong> ${formatDateTime(apt.date_time)}</p>
                    <p><strong>Location:</strong> ${apt.location ? escapeHtml(apt.location) : 'Not specified'}</p>
                </div>
                <div class="list-item-actions">
                    <button class="btn btn-danger" onclick="deleteAppointment(${apt.id})" title="Delete appointment">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function deleteAppointment(id) {
    if (!confirm('Are you sure you want to delete this appointment?')) return;
    
    try {
        const response = await fetch(`${API_URL}/appointments/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete appointment');
        
        await loadAppointments();
        updateStatistics();
        showToast('Appointment deleted 🗑️', 'success');
        
    } catch (error) {
        console.error('❌ Error deleting appointment:', error);
        showToast('Failed to delete appointment', 'error');
    }
}

// ==================== UTILITY FUNCTIONS ====================

function formatDateTime(dateTimeString) {
    try {
        const date = new Date(dateTimeString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        };
        return date.toLocaleString('en-US', options);
    } catch (error) {
        return 'Invalid Date';
    }
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric'
        };
        return date.toLocaleDateString('en-US', options);
    } catch (error) {
        return 'Invalid Date';
    }
}

function formatTime(timeString) {
    try {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
        return timeString;
    }
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ==================== AI ASSISTANT INTEGRATION ====================

function openAIAssistant() {
    const width = 1000;
    const height = 700;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;
    
    const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no`;
    
    window.open('/ai-assistant', 'AIHealthAssistant', features);
}

// ==================== DATA EXPORT/IMPORT ====================

async function exportData() {
    try {
        const response = await fetch(`${API_URL}/export-data`);
        if (!response.ok) throw new Error('Failed to export data');
        
        const data = await response.json();
        
        // Create download link
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `medical-data-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Data exported successfully! 💾', 'success');
    } catch (error) {
        console.error('Error exporting data:', error);
        showToast('Failed to export data', 'error');
    }
}

async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!confirm('This will replace all current data. Continue?')) {
        event.target.value = ''; // Reset file input
        return;
    }
    
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        const response = await fetch(`${API_URL}/import-data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data })
        });
        
        if (!response.ok) throw new Error('Failed to import data');
        
        // Reload all data
        await loadData();
        showToast('Data imported successfully! 📥', 'success');
        
    } catch (error) {
        console.error('Error importing data:', error);
        showToast('Failed to import data', 'error');
    }
    
    // Reset file input
    event.target.value = '';
}

// ==================== KEYBOARD SHORTCUTS ====================

document.addEventListener('keydown', function(event) {
    // Ctrl/Cmd + S - Save/Add current form
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        
        // Find which form is currently focused
        const focused = document.activeElement;
        const form = focused.closest('.card-body');
        if (form) {
            const addButton = form.querySelector('.btn-primary');
            if (addButton) {
                addButton.click();
            }
        }
    }
    
    // Escape key - Clear forms
    if (event.key === 'Escape') {
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if (input === document.activeElement) {
                input.blur();
            }
        });
    }
});

// ==================== OFFLINE SUPPORT ====================

// Check online status
window.addEventListener('online', () => {
    showToast('Connection restored. Syncing data...', 'success');
    loadData();
});

window.addEventListener('offline', () => {
    showToast('You are currently offline. Some features may not work.', 'warning');
});

// Service Worker Registration (for PWA features)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('✅ ServiceWorker registered:', registration);
            })
            .catch(registrationError => {
                console.log('❌ ServiceWorker registration failed:', registrationError);
            });
    });
}

// Initialize when DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}