const socket = io('https://my-chat-app-azvr.onrender.com');

// Get the HTML elements
const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');

// Ask the user for their name when they connect
const username = prompt("What is your name?");

// Listen for the 'loadMessages' event to get the chat history
socket.on('loadMessages', (messages) => {
    messages.forEach(msgObject => {
        const item = document.createElement('li');
        item.textContent = `${msgObject.user}: ${msgObject.text}`;
        document.getElementById('messages').appendChild(item);
    });
    window.scrollTo(0, document.body.scrollHeight);
});

// Add an event listener for when the form is submitted
form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (input.value && username) {
        // Create a message object with the username and text
        const messageObject = {
            user: username,
            text: input.value
        };
        
        // Send the message OBJECT to the server
        socket.emit('chatMessage', messageObject);
        
        // Clear the input box after sending
        input.value = '';
    }
});

// Listen for the 'chatMessage' event from the server
socket.on('chatMessage', (msgObject) => {
    const item = document.createElement('li');
    // Display the message as "user: text"
    item.textContent = `${msgObject.user}: ${msgObject.text}`;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
});