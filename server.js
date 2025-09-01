// server.js (New Version)

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://genuine-vacherin-f77495.netlify.app",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const dbURI = "mongodb+srv://chat_user:Sriraj2004@cluster0.0nefij1.mongodb.net/chat-app?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(dbURI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

// We are not saving private messages to the database in this version for simplicity.
// You could create a new schema for private messages if you wanted to store them.

app.use(express.static('public'));

// Keep track of connected users { username: socket.id }
let onlineUsers = {};

io.on('connection', (socket) => {
    console.log('A user connected!', socket.id);

    // Listen for a new user joining
    socket.on('addUser', (username) => {
        onlineUsers[username] = socket.id;
        // Broadcast the updated user list to all clients
        io.emit('updateUserList', Object.keys(onlineUsers));
    });

    // Listen for a private message
    socket.on('privateMessage', ({ recipient, text }) => {
        const recipientSocketId = onlineUsers[recipient];
        const senderUsername = Object.keys(onlineUsers).find(key => onlineUsers[key] === socket.id);

        if (recipientSocketId) {
            // Send message to the recipient
            io.to(recipientSocketId).emit('privateMessage', {
                sender: senderUsername,
                text: text
            });
            // Send message back to the sender
            socket.emit('privateMessage', {
                sender: senderUsername,
                text: text
            });
        }
    });

    // Handle a user disconnecting
    socket.on('disconnect', () => {
        // Find the username of the disconnected user and remove them
        const disconnectedUser = Object.keys(onlineUsers).find(key => onlineUsers[key] === socket.id);
        if (disconnectedUser) {
            delete onlineUsers[disconnectedUser];
            // Broadcast the updated user list
            io.emit('updateUserList', Object.keys(onlineUsers));
        }
        console.log('User disconnected');
    });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});