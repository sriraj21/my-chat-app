const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');

// --- INITIALIZE SERVER & APP ---
const app = express();
const server = http.createServer(app);

// --- MIDDLEWARE & SECURITY HEADERS ---
app.use(express.json());
app.use(express.static('public'));
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

// --- SOCKET.IO CONFIGURATION ---
const io = new Server(server, {});

// --- DATABASE CONNECTION & SCHEMA ---
const PORT = process.env.PORT || 3000;
// IMPORTANT: Remember to put your real MongoDB password here
const dbURI = "mongodb+srv://chat_user:Sriraj2004@cluster0.0nefij1.mongodb.net/chat-app?retryWrites=true&w=majority&appName=Cluster0";

const userSchema = new mongoose.Schema({
    googleId: { type: String, required: true, unique: true },
    name: String,
    email: String,
    isApproved: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false }
});
const User = mongoose.model('User', userSchema);

mongoose.connect(dbURI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));


// --- API ENDPOINT for Login & User Approval ---
app.post('/api/login', async (req, res) => {
    const { googleId, name, email } = req.body;
    if (!googleId || !name || !email) {
        return res.status(400).json({ message: 'Missing user information.' });
    }
    try {
        let user = await User.findOne({ googleId });
        if (!user) {
            user = new User({ googleId, name, email });
            await user.save();
            return res.json({ status: 'pending' });
        }
        return res.json({ status: user.isApproved ? 'approved' : 'pending' });
    } catch (error) {
        console.error('Server error during login:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});


// --- SOCKET.IO LOGIC for Real-Time Chat ---
let onlineUsers = {};
io.on('connection', (socket) => {
    console.log('A user connected!', socket.id);

    socket.on('addUser', (username) => {
        onlineUsers[username] = socket.id;
        io.emit('updateUserList', Object.keys(onlineUsers));
    });

    socket.on('privateMessage', ({ recipient, text }) => {
        const recipientSocketId = onlineUsers[recipient];
        const senderUsername = Object.keys(onlineUsers).find(key => onlineUsers[key] === socket.id);

        if (recipientSocketId && senderUsername) {
            const messageData = { sender: senderUsername, text: text };
            io.to(recipientSocketId).emit('privateMessage', messageData);
            socket.emit('privateMessage', messageData);
        }
    });

    socket.on('disconnect', () => {
        const disconnectedUser = Object.keys(onlineUsers).find(key => onlineUsers[key] === socket.id);
        if (disconnectedUser) {
            delete onlineUsers[disconnectedUser];
            io.emit('updateUserList', Object.keys(onlineUsers));
        }
        console.log('User disconnected');
    });
});

// --- START THE SERVER ---
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

