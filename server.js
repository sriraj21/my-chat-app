const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// server.js

const PORT = process.env.PORT || 3000;

// --- DATABASE CONNECTION ---
// IMPORTANT: REPLACE THE PASSWORD IN THIS LINE
const dbURI = "mongodb+srv://chat_user:Sriraj2004@cluster0.0nefij1.mongodb.net/chat-app?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(dbURI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

// --- MESSAGE SCHEMA ---
const messageSchema = new mongoose.Schema({
    user: String,
    text: String,
    timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// Tell Express to serve static files from the 'public' directory
app.use(express.static('public'));

// --- SOCKET.IO LOGIC ---
io.on('connection', async (socket) => {
    console.log('A user connected!');

    // Load old messages from the database
    try {
        const messages = await Message.find().sort({ timestamp: 1 });
        socket.emit('loadMessages', messages);
    } catch (err) {
        console.error('Error fetching messages:', err);
    }

    // Listen for a new message
    socket.on('chatMessage', (msgObject) => {
        const message = new Message({
            user: msgObject.user,
            text: msgObject.text
        });
        
        // Save the message to the database
        message.save().then(() => {
            // Broadcast the message to all clients
            io.emit('chatMessage', msgObject);
        }).catch(err => console.error('Error saving message:', err));
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// --- START THE SERVER ---
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});