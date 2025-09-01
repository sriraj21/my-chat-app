// IMPORTANT: Make sure this URL is your correct Render backend URL
const socket = io('https://my-chat-app-azvr.onrender.com');

// Get the HTML elements
const userList = document.getElementById('user-list');
const messages = document.getElementById('messages');
const form = document.getElementById('form');
const input = document.getElementById('input');
const recipientName = document.getElementById('recipient-name');

let currentRecipient = '';
let username = '';

// --- Sound Effect for New Messages ---
// This creates a simple synthesizer sound using Tone.js
const synth = new Tone.Synth().toDestination();

// --- Main Application Logic ---

// Get username from prompt and notify the server
username = prompt("What is your name?");
if (username) {
    socket.emit('addUser', username);
}

// Update the online user list when it changes
socket.on('updateUserList', (users) => {
    userList.innerHTML = ''; // Clear the current list
    users.forEach(user => {
        if (user !== username) { // Don't show the user their own name
            const li = document.createElement('li');
            li.textContent = user;
            li.addEventListener('click', () => {
                currentRecipient = user;
                recipientName.textContent = user;
                messages.innerHTML = ''; // Clear messages when switching to a new user
                // Optional: Visually highlight the selected user
                document.querySelectorAll('#user-list li').forEach(item => item.style.backgroundColor = 'transparent');
                li.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            });
            userList.appendChild(li);
        }
    });
});

// Handle form submission to send a private message
form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value && currentRecipient) {
        socket.emit('privateMessage', {
            recipient: currentRecipient,
            text: input.value
        });
        input.value = '';
    }
});

// Display incoming private messages
socket.on('privateMessage', ({ sender, text }) => {
    // Only process message if it's part of the current conversation
    if (sender === currentRecipient || sender === username) {
        const item = document.createElement('div');
        item.classList.add('message');
        
        // Add a different class for your own messages for styling
        if (sender === username) {
            item.classList.add('my-message');
        } else {
            // Play a sound only when receiving a message from someone else
            synth.triggerAttackRelease("C5", "8n");
        }
        
        item.innerHTML = `<strong>${sender}</strong><p>${text}</p>`;
        messages.appendChild(item);
        
        // Auto-scroll to the latest message
        messages.scrollTop = messages.scrollHeight;
    }
});
