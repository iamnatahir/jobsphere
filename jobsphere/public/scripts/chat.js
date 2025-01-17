// Remove this line as we're now getting userId from the EJS template
// const userId = '<%= user._id %>';
if (!userId) {
    console.error('User ID is not available. User might not be logged in.');
    // Disable chat functionality or redirect to login
}
const socket = io('http://localhost:5000', { path: '/socket.io' });
let currentChatId = null;

document.querySelectorAll('.chat-now').forEach(button => {
    button.addEventListener('click', function () {
        const jobId = this.dataset.jobId;
        const employerId = this.dataset.employerId;
        currentChatId = `${jobId}_${employerId}`;
        openChat(currentChatId);
    });
});

function openChat(chatId) {
    if (!userId) {
        alert('Please log in to use the chat feature.');
        return;
    }
    document.getElementById('chatModal').style.display = 'block';
    // Use the userId from the global scope that was set in the EJS template
    socket.emit('joinChat', {
        chatId,
        userId, // This now uses the properly passed userId
        userType: 'jobSeeker'
    });
    loadMessages(chatId);
}

function loadMessages(chatId) {
    socket.emit('getChatHistory', { chatId });
}

socket.on('chatHistory', (messages) => {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';
    messages.forEach(({ sender, message }) => {
        appendMessage(sender, message);
    });
});

function appendMessage(sender, message) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.textContent = `${sender === userId ? 'You' : 'Employer'}: ${message}`;
    chatMessages.appendChild(messageDiv);
}

document.getElementById('sendMessage').addEventListener('click', () => {
    const message = document.getElementById('chatInput').value.trim();
    if (message && currentChatId) {
        socket.emit('chatMessage', {
            chatId: currentChatId,
            sender: userId, // This now uses the properly passed userId
            message
        });
        document.getElementById('chatInput').value = '';
    }
});

socket.on('receiveMessage', ({ sender, message }) => {
    appendMessage(sender, message);
});

document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('chatModal').style.display = 'none';
});