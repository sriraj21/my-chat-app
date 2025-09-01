const socket = io('https://my-chat-app-azvr.onrender.com'); // Your Render URL

const userList = document.getElementById('user-list');
const messages = document.getElementById('messages');
const form = document.getElementById('form');
const input = document.getElementById('input');
const recipientName = document.getElementById('recipient-name');

let currentRecipient = '';
let username = '';

// Get username from prompt and notify the server
username = prompt("What is your name?");
if (username) {
    socket.emit('addUser', username);
}

// Update the online user list
socket.on('updateUserList', (users) => {
    userList.innerHTML = '';
    users.forEach(user => {
        if (user !== username) { // Don't show the user their own name in the list
            const li = document.createElement('li');
            li.textContent = user;
            li.addEventListener('click', () => {
                currentRecipient = user;
                recipientName.textContent = user;
                messages.innerHTML = ''; // Clear messages when switching user
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
    const item = document.createElement('div');
    item.classList.add('message');
    if (sender === username) {
        item.classList.add('my-message');
    }
    item.innerHTML = `<strong>${sender}</strong>: ${text}`;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
});