const socket = io('http://localhost:5000', { path: '/socket.io' });
let currentChatId = null;

document.addEventListener('DOMContentLoaded', () => {
    const chatIcon = document.querySelector('.chat-icon');
    const chatModal = document.getElementById('chatModal');
    const chatList = document.getElementById('chatList');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendMessageButton = document.getElementById('sendMessage');
    const unreadCountSpan = document.getElementById('unreadCount');

    if (!chatIcon || !chatModal || !chatList || !chatMessages || !chatInput || !sendMessageButton || !unreadCountSpan) {
        console.error('One or more required DOM elements are missing');
        return;
    }

    chatIcon.addEventListener('click', () => {
        chatModal.style.display = 'block';
        socket.emit('getEmployerChats', { employerId: userId });
    });

    sendMessageButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    socket.on('connect', () => {
        console.log('Connected to server');
        socket.emit('employerConnected', { employerId: userId });
    });

    socket.on('employerChats', (chats) => {
        console.log('Received employer chats:', chats);
        chatList.innerHTML = '';
        chats.forEach(chat => {
            const chatDiv = document.createElement('div');
            chatDiv.className = 'chat-item';
            if (chat.chatId === currentChatId) {
                chatDiv.classList.add('active-chat');
            }
            chatDiv.textContent = `${chat.jobTitle}: ${chat.lastMessage ? chat.lastMessage.text : 'No messages'} (${chat.unreadCount} unread)`;
            chatDiv.addEventListener('click', () => loadChat(chat.chatId));
            chatList.appendChild(chatDiv);
        });
        updateUnreadCount(chats);

        // Automatically load the first chat if no chat is currently active
        if (!currentChatId && chats.length > 0) {
            loadChat(chats[0].chatId);
        }
    });

    socket.on('receiveMessage', (data) => {
        console.log('Received message:', data);
        const { sender, message, timestamp } = data;

        // Only append if we're in the correct chat
        if (currentChatId === data.chatId) {
            const senderName = sender._id === userId ? 'You' : (sender.name || 'Job Seeker');
            appendMessage(senderName, message);
        }

        // Refresh the chat list to update last messages
        socket.emit('getEmployerChats', { employerId: userId });
    });

    socket.on('chatHistory', (messages) => {
        console.log('Received chat history:', messages);
        chatMessages.innerHTML = '';
        messages.forEach((msg) => {
            const senderName = msg.sender._id === userId ? 'You' : (msg.sender.name || 'Job Seeker');
            appendMessage(senderName, msg.message);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });

    socket.on('unreadCount', (count) => {
        console.log('Received unread count:', count);
        unreadCountSpan.textContent = count.toString();
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
        alert('An error occurred: ' + error.message);
    });

    function loadChat(chatId) {
        console.log('Loading chat:', chatId);
        currentChatId = chatId;
        socket.emit('joinChat', { chatId, userId, userType: 'employer' });
        socket.emit('markMessagesAsRead', { chatId, userId });

        // Visual feedback that a chat is selected
        Array.from(chatList.children).forEach(child => {
            child.classList.remove('active-chat');
        });
        const activeChatDiv = Array.from(chatList.children).find(child =>
            child.textContent.includes(chatId)
        );
        if (activeChatDiv) {
            activeChatDiv.classList.add('active-chat');
        }

        // Enable input and send button
        chatInput.disabled = false;
        sendMessageButton.disabled = false;
    }

    function sendMessage() {
        const message = chatInput.value.trim();
        if (message && currentChatId) {
            console.log('Sending message:', { chatId: currentChatId, message });
            socket.emit('chatMessage', {
                chatId: currentChatId,
                sender: userId,
                message
            });
            chatInput.value = '';
        } else {
            console.log('Cannot send message: ', message ? 'No active chat' : 'Empty message');
            if (!currentChatId) {
                alert('Please select a chat before sending a message.');
            }
        }
    }

    function appendMessage(sender, message) {
        console.log('Appending message:', { sender, message });
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';
        messageDiv.textContent = `${sender}: ${message}`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function updateUnreadCount(chats) {
        const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);
        unreadCountSpan.textContent = totalUnread.toString();
    }

    // Initially disable input and send button
    chatInput.disabled = true;
    sendMessageButton.disabled = true;
});

document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('chatModal').style.display = 'none';
});