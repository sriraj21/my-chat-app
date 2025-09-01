const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);

// --- IMPORTANT: CORS CONFIGURATION ---
// This allows your Netlify app to connect to your Render server.
const io = new Server(server, {
  cors: {
    // Replace this with your actual Netlify URL
    origin: "https://genuine-vacherin-f77495.netlify.app",
    methods: ["GET", "POST"]
  }
});

// Use the port provided by the hosting service (Render), or 3000 for local development
const PORT = process.env.PORT || 3000;

// --- DATABASE CONNECTION ---
// Make sure to replace YOUR_REAL_PASSWORD_HERE with your actual database password
const dbURI = "mongodb+srv://chat_user:Sriraj2004@cluster0.0nefij1.mongodb.net/chat-app?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(dbURI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

// --- MESSAGE SCHEMA ---
// This defines the structure for messages stored in the database
const messageSchema = new mongoose.Schema({
    user: String,
    text: String,
    timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// --- MIDDLEWARE ---
// Serve the static files from the 'public' folder
app.use(express.static('public'));

// --- SOCKET.IO LOGIC ---
io.on('connection', async (socket) => {
    console.log('A user connected!');

    // Load old messages from the database for the newly connected user
    try {
        const messages = await Message.find().sort({ timestamp: 1 });
        socket.emit('loadMessages', messages);
    } catch (err) {
        console.error('Error fetching messages:', err);
    }

    // Listen for a new message from a client
    socket.on('chatMessage', (msgObject) => {
        const message = new Message({
            user: msgObject.user,
            text: msgObject.text
        });
        
        // Save the new message to the database
        message.save().then(() => {
            // After saving, broadcast the message to all connected clients
            io.emit('chatMessage', msgObject);
        }).catch(err => console.error('Error saving message:', err));
    });

    // Handle a user disconnecting
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// --- START THE SERVER ---
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});