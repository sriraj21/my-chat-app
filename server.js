const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);

// Use Express's built-in JSON middleware
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "https://genuine-vacherin-f77495.netlify.app", // Your Netlify URL
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const dbURI = "mongodb+srv://chat_user:Sriraj2004@cluster0.0nefij1.mongodb.net/chat-app?retryWrites=true&w=majority&appName=Cluster0";

// --- NEW USER SCHEMA ---
const userSchema = new mongoose.Schema({
    googleId: { type: String, required: true, unique: true },
    name: String,
    email: String,
    isApproved: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false } // For you!
});
const User = mongoose.model('User', userSchema);

mongoose.connect(dbURI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

// Serve the frontend files
app.use(express.static('public'));

// --- API ENDPOINT FOR LOGIN/REGISTRATION ---
app.post('/api/login', async (req, res) => {
    const { googleId, name, email } = req.body;

    if (!googleId || !name || !email) {
        return res.status(400).json({ message: 'Missing user information.' });
    }

    try {
        let user = await User.findOne({ googleId: googleId });

        if (!user) {
            // First time this user has logged in, create a new entry
            user = new User({
                googleId: googleId,
                name: name,
                email: email,
                isApproved: false, // Default to not approved
            });
            await user.save();
            console.log(`New user registered, pending approval: ${name}`);
            return res.json({ status: 'pending' });
        }

        // User exists, check their approval status
        if (user.isApproved) {
            return res.json({ status: 'approved', user: { name: user.name, email: user.email } });
        } else {
            return res.json({ status: 'pending' });
        }

    } catch (error) {
        console.error('Error in /api/login:', error);
        res.status(500).json({ message: 'Server error during login process.' });
    }
});


// --- SOCKET.IO LOGIC ---
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

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

