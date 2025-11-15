// AI Health Assistant Frontend JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('🤖 AI Health Assistant Initializing...');
    
    // DOM elements
    const chatMessages = document.getElementById('chatMessages');
    const symptomInput = document.getElementById('symptomInput');
    const sendButton = document.getElementById('sendButton');
    const clearChatButton = document.getElementById('clearChat');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const autocompleteContainer = document.getElementById('autocompleteContainer');
    const themeToggleButton = document.getElementById('theme-toggle');
    const bodyElement = document.body;
    
    // Store all available symptoms for autocomplete
    let availableSymptoms = [];
    
    // API Configuration
    const API_BASE = window.location.origin; // Use same origin as the page
    const PREDICT_API = `${API_BASE}/api/predict`;
    const SYMPTOMS_API = `${API_BASE}/api/symptoms`;
    
    console.log('API Base:', API_BASE);
    
    // Initialize app
    initializeApp();
    
    // Event listeners
    sendButton.addEventListener('click', handleSendMessage);
    symptomInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    
    if (clearChatButton) {
        clearChatButton.addEventListener('click', clearChat);
    }
    
    symptomInput.addEventListener('input', handleSymptomInput);
    symptomInput.addEventListener('focus', function() {
        if (symptomInput.value.trim() && availableSymptoms.length > 0) {
            showAutocompleteSuggestions();
        }
    });
    
    document.addEventListener('click', function(e) {
        // Close autocomplete when clicking outside
        if (e.target !== autocompleteContainer && e.target !== symptomInput) {
            autocompleteContainer.style.display = 'none';
        }
    });
    
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', toggleTheme);
    }
    
    // Initialize theme
    initializeTheme();

    /**
     * Initialize the application
     */
    async function initializeApp() {
        try {
            // Fetch available symptoms
            await fetchSymptoms();
            
            // Add welcome message
            addAIMessage(`👋 **Hello! I'm your AI Health Assistant.**\n\nI can help you understand possible health conditions based on your symptoms. Please describe how you're feeling by entering your symptoms separated by commas.\n\n**Examples:**\n• "headache, fever, fatigue"\n• "cough, sore throat, runny nose"\n• "nausea, dizziness, body aches"`);
            
            console.log('✅ AI Assistant initialized successfully');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            addAIMessage('⚠️ **Sorry, I encountered an error during initialization.** Please refresh the page and try again.');
        }
    }

    /**
     * Toggle dark/light theme
     */
    function toggleTheme() {
        bodyElement.classList.toggle('dark-mode');
        const isDarkMode = bodyElement.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        updateThemeButtonIcon(isDarkMode);
    }

    /**
     * Initialize theme based on user preference
     */
    function initializeTheme() {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            bodyElement.classList.add('dark-mode');
            updateThemeButtonIcon(true);
        } else {
            bodyElement.classList.remove('dark-mode');
            updateThemeButtonIcon(false);
        }
    }

    /**
     * Update theme toggle button icon
     */
    function updateThemeButtonIcon(isDarkMode) {
        if (!themeToggleButton) return;
        
        const icon = themeToggleButton.querySelector('i');
        if (isDarkMode) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            themeToggleButton.setAttribute('aria-label', 'Switch to light mode');
            themeToggleButton.title = 'Switch to light mode';
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            themeToggleButton.setAttribute('aria-label', 'Switch to dark mode');
            themeToggleButton.title = 'Switch to dark mode';
        }
    }
    
    /**
     * Handle sending a message
     */
    function handleSendMessage() {
        const symptoms = symptomInput.value.trim();
        
        console.log('🩺 Symptoms entered:', symptoms);
        
        if (!symptoms) {
            showTempMessage('Please enter some symptoms', 'warning');
            symptomInput.focus();
            return;
        }
        
        if (symptoms.length < 2) {
            showTempMessage('Please provide more detailed symptoms', 'warning');
            symptomInput.focus();
            return;
        }
        
        // Add user message to chat
        addUserMessage(symptoms);
        
        // Clear input and hide autocomplete
        symptomInput.value = '';
        autocompleteContainer.style.display = 'none';
        
        // Show loading indicator
        loadingOverlay.style.display = 'flex';
        
        // Send prediction request
        sendPredictionRequest(symptoms);
    }
    
    /**
     * Send prediction request to backend API
     */
    async function sendPredictionRequest(symptoms) {
        console.log('📤 Sending symptoms to:', PREDICT_API);
        
        try {
            const response = await fetch(PREDICT_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                'Accept': 'application/json'
                },
                body: JSON.stringify({ symptoms }),
            });
            
            console.log('📥 Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Server error:', errorText);
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('✅ Prediction response received');
            
            loadingOverlay.style.display = 'none';
            
            if (data.status === 'success' && data.messages) {
                displayAIMessages(data.messages);
            } else {
                throw new Error(data.error || 'Unknown error occurred');
            }
            
        } catch (error) {
            console.error('❌ Prediction request failed:', error);
            loadingOverlay.style.display = 'none';
            
            let errorMessage = `**Sorry, I encountered an error:** ${error.message}`;
            
            if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
                errorMessage = `**Connection Error:** Unable to connect to the AI assistant. Please check:\n• Your internet connection\n• That the server is running\n• Try refreshing the page`;
            }
            
            addAIMessage(errorMessage);
        }
    }

    /**
     * Display AI response messages
     */
    function displayAIMessages(messages) {
        if (!messages || messages.length === 0) {
            addAIMessage('⚠️ **No response received.** Please try again with different symptoms.');
            return;
        }
        
        // Add a small delay between messages for better UX
        messages.forEach((message, index) => {
            setTimeout(() => {
                displaySingleMessage(message);
            }, index * 300);
        });
    }

    /**
     * Display a single AI message
     */
    function displaySingleMessage(message) {
        switch (message.type) {
            case 'error':
            case 'info':
            case 'suggestions':
            case 'unmatched':
            case 'disclaimer':
                addAIMessage(message.content);
                break;
                
            case 'prediction':
                addPredictionMessage(message);
                break;
                
            case 'precautions':
                addPrecautionsMessage(message);
                break;
                
            case 'alternatives':
                addAlternativesMessage(message);
                break;
                
            case 'symptoms':
                addSymptomsMessage(message);
                break;
                
            default:
                addAIMessage(message.content || 'Unknown message type');
        }
    }

    /**
     * Add user message to chat
     */
    function addUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message';
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${escapeHtml(text)}</p>
            </div>
            <div class="message-time">${getCurrentTime()}</div>
        `;
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
        
        // Add animation
        messageDiv.style.animation = 'messageSlideIn 0.3s ease-out';
    }
    
    /**
     * Add AI message to chat
     */
    function addAIMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai-message';
        
        // Convert markdown-like formatting to HTML
        const formattedText = formatText(text);
        
        messageDiv.innerHTML = `
            <div class="message-content">
                ${formattedText}
            </div>
            <div class="message-time">${getCurrentTime()}</div>
        `;
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
        
        // Add animation
        messageDiv.style.animation = 'messageSlideIn 0.3s ease-out';
    }

    /**
     * Add prediction message
     */
    function addPredictionMessage(prediction) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai-message prediction-message';
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="prediction-header">
                    <i class="fas fa-stethoscope"></i>
                    <h3>Disease Prediction</h3>
                </div>
                <div class="prediction-content">
                    <div class="disease-name">${escapeHtml(prediction.disease)}</div>
                    <div class="probability">Confidence: ${prediction.probability}</div>
                    <div class="description">${escapeHtml(prediction.description)}</div>
                </div>
            </div>
            <div class="message-time">${getCurrentTime()}</div>
        `;
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
        messageDiv.style.animation = 'messageSlideIn 0.3s ease-out';
    }

    /**
     * Add precautions message
     */
    function addPrecautionsMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai-message precautions-message';
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="precautions-header">
                    <i class="fas fa-shield-alt"></i>
                    <h3>Health Recommendations</h3>
                </div>
                <div class="precautions-content">
                    ${formatText(message.content)}
                </div>
            </div>
            <div class="message-time">${getCurrentTime()}</div>
        `;
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
        messageDiv.style.animation = 'messageSlideIn 0.3s ease-out';
    }

    /**
     * Add alternatives message
     */
    function addAlternativesMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai-message alternatives-message';
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="alternatives-header">
                    <i class="fas fa-random"></i>
                    <h3>Alternative Considerations</h3>
                </div>
                <div class="alternatives-content">
                    ${formatText(message.content)}
                </div>
            </div>
            <div class="message-time">${getCurrentTime()}</div>
        `;
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
        messageDiv.style.animation = 'messageSlideIn 0.3s ease-out';
    }

    /**
     * Add symptoms analysis message
     */
    function addSymptomsMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai-message symptoms-message';
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="symptoms-header">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>Symptom Analysis</h3>
                </div>
                <div class="symptoms-content">
                    ${formatText(message.content)}
                </div>
            </div>
            <div class="message-time">${getCurrentTime()}</div>
        `;
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
        messageDiv.style.animation = 'messageSlideIn 0.3s ease-out';
    }

    /**
     * Clear chat history
     */
    function clearChat() {
        if (!confirm('Are you sure you want to clear the chat history?')) {
            return;
        }
        
        // Keep only the first message (welcome message)
        while (chatMessages.children.length > 1) {
            chatMessages.removeChild(chatMessages.lastChild);
        }
        
        showTempMessage('Chat history cleared', 'success');
    }
    
    /**
     * Fetch available symptoms for autocomplete
     */
    async function fetchSymptoms() {
        try {
            console.log('📥 Fetching symptoms from:', SYMPTOMS_API);
            
            const response = await fetch(SYMPTOMS_API);
            if (!response.ok) throw new Error('Failed to fetch symptoms');
            
            const data = await response.json();
            
            if (data.status === 'success' && data.symptoms) {
                availableSymptoms = data.symptoms;
                console.log(`✅ Loaded ${availableSymptoms.length} symptoms`);
            } else {
                throw new Error('Invalid response format');
            }
            
        } catch (error) {
            console.error('❌ Error fetching symptoms:', error);
            // Use default symptoms as fallback
            availableSymptoms = [
                'fever', 'cough', 'headache', 'fatigue', 'nausea', 'vomiting',
                'sneezing', 'runny nose', 'sore throat', 'body aches', 'chills',
                'chest pain', 'shortness of breath', 'dizziness', 'rash'
            ];
            console.log('✅ Using default symptoms as fallback');
        }
    }
    
    /**
     * Handle symptom input for autocomplete
     */
    function handleSymptomInput() {
        const input = symptomInput.value.trim();
        if (input && availableSymptoms.length > 0) {
            showAutocompleteSuggestions();
        } else {
            autocompleteContainer.style.display = 'none';
        }
    }
    
    /**
     * Show autocomplete suggestions
     */
    function showAutocompleteSuggestions() {
        const input = symptomInput.value;
        const lastCommaIndex = input.lastIndexOf(',');
        const searchTerm = lastCommaIndex !== -1 ? 
            input.substring(lastCommaIndex + 1).trim().toLowerCase() : 
            input.trim().toLowerCase();
        
        if (!searchTerm || searchTerm.length < 1) {
            autocompleteContainer.style.display = 'none';
            return;
        }
        
        const filteredSymptoms = availableSymptoms.filter(symptom => 
            symptom.toLowerCase().includes(searchTerm)
        ).slice(0, 7); // Limit to 7 suggestions
        
        if (filteredSymptoms.length > 0) {
            displayAutocompleteSuggestions(filteredSymptoms, searchTerm, lastCommaIndex);
        } else {
            autocompleteContainer.style.display = 'none';
        }
    }
    
    /**
     * Display autocomplete suggestions
     */
    function displayAutocompleteSuggestions(suggestions, searchTerm, lastCommaIndex) {
        autocompleteContainer.innerHTML = '';
        
        suggestions.forEach(symptom => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.textContent = symptom;
            item.addEventListener('click', function() {
                if (lastCommaIndex !== -1) {
                    // Replace the last part after comma
                    symptomInput.value = 
                        symptomInput.value.substring(0, lastCommaIndex + 1) + ' ' + symptom;
                } else {
                    // Replace entire input
                    symptomInput.value = symptom;
                }
                autocompleteContainer.style.display = 'none';
                symptomInput.focus();
            });
            autocompleteContainer.appendChild(item);
        });
        
        autocompleteContainer.style.display = 'block';
    }
    
    /**
     * Show temporary message (for errors, warnings, etc.)
     */
    function showTempMessage(message, type = 'info') {
        const tempDiv = document.createElement('div');
        tempDiv.className = `temp-message temp-${type}`;
        tempDiv.textContent = message;
        tempDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#4CAF50'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(tempDiv);
        
        setTimeout(() => {
            if (tempDiv.parentNode) {
                tempDiv.parentNode.removeChild(tempDiv);
            }
        }, 3000);
    }
    
    /**
     * Get current time formatted for messages
     */
    function getCurrentTime() {
        const now = new Date();
        let hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${hours}:${minutes} ${ampm}`;
    }
    
    /**
     * Scroll chat to the bottom
     */
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    /**
     * Format text with basic markdown support
     */
    function formatText(text) {
        if (!text) return '';
        
        return text
            .split('\n')
            .map(line => {
                if (line.trim() === '') return '<br>';
                
                // Convert **bold** to <strong>
                line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                
                // Convert *italic* to <em>
                line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
                
                // Convert bullet points
                if (line.trim().startsWith('•')) {
                    return `<p style="margin: 5px 0;">${line}</p>`;
                }
                
                // Convert numbered lists
                if (line.trim().match(/^\d+\./)) {
                    return `<p style="margin: 5px 0;">${line}</p>`;
                }
                
                return `<p>${line}</p>`;
            })
            .join('');
    }
    
    /**
     * Escape HTML to prevent XSS
     */
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
});

// Add CSS for animations and styling
const additionalStyles = `
@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.temp-message {
    font-family: 'Inter', sans-serif;
    font-weight: 500;
}

.prediction-message .message-content {
    border-left: 4px solid #3b82f6;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.precautions-message .message-content {
    border-left: 4px solid #10b981;
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
}

.alternatives-message .message-content {
    border-left: 4px solid #f59e0b;
    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
}

.symptoms-message .message-content {
    border-left: 4px solid #8b5cf6;
    background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
}

.prediction-header,
.precautions-header,
.alternatives-header,
.symptoms-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px solid #e5e7eb;
}

.prediction-header h3,
.precautions-header h3,
.alternatives-header h3,
.symptoms-header h3 {
    margin: 0;
    color: #1f2937;
    font-size: 1.1em;
    font-weight: 600;
}

.disease-name {
    font-size: 1.3em;
    font-weight: bold;
    color: #3b82f6;
    margin-bottom: 8px;
}

.probability {
    display: inline-block;
    background: #10b981;
    color: white;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.9em;
    font-weight: 600;
    margin-bottom: 12px;
}

.description {
    color: #6b7280;
    line-height: 1.5;
}

/* Dark mode support */
body.dark-mode .prediction-header h3,
body.dark-mode .precautions-header h3,
body.dark-mode .alternatives-header h3,
body.dark-mode .symptoms-header h3 {
    color: #f3f4f6;
}

body.dark-mode .description {
    color: #d1d5db;
}

body.dark-mode .prediction-message .message-content {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
}

body.dark-mode .precautions-message .message-content {
    background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
}

body.dark-mode .alternatives-message .message-content {
    background: linear-gradient(135deg, #78350f 0%, #92400e 100%);
}

body.dark-mode .symptoms-message .message-content {
    background: linear-gradient(135deg, #581c87 0%, #6b21a8 100%);
}

/* Loading overlay improvements */
.loading-overlay {
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(5px);
}

.loading-overlay p {
    color: white;
    font-size: 1.1em;
    margin-top: 15px;
}

/* Input focus improvements */
#symptomInput:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    outline: none;
}

/* Send button hover effects */
.send-button:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

/* Autocomplete improvements */
.autocomplete-container {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.autocomplete-item {
    padding: 12px 16px;
    border-bottom: 1px solid #f3f4f6;
    cursor: pointer;
    transition: all 0.2s ease;
}

.autocomplete-item:hover {
    background: #3b82f6;
    color: white;
}

.autocomplete-item:last-child {
    border-bottom: none;
}
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Add global error handler
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
});

// Export functions for global access (for debugging)
window.AIAssistant = {
    testAPI: function(symptoms = 'headache,fever') {
        fetch('/api/predict', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({symptoms})
        })
        .then(r => r.json())
        .then(console.log)
        .catch(console.error);
    },
    clearChat: function() {
        const chatMessages = document.getElementById('chatMessages');
        while (chatMessages.children.length > 1) {
            chatMessages.removeChild(chatMessages.lastChild);
        }
    }
};

console.log('🎯 AI Assistant JavaScript loaded successfully!');
console.log('💡 Debug tips:');
console.log('   - Use AIAssistant.testAPI() to test the API');
console.log('   - Use AIAssistant.clearChat() to clear messages');
console.log('   - Check browser console for detailed logs');