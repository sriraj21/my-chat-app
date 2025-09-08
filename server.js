const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- INITIALIZE SERVER & APP ---
const app = express();
const server = http.createServer(app);
app.use(express.json());

// --- ENVIRONMENT VARIABLES (IMPORTANT!) ---
// You should store these securely, but for now, we'll put them here.
// Make sure to create a .env file for these in a real project.
const GIPHY_API_KEY = "8eWGuuwS23zczSDy52C6LOvcqeUvVPsX";
const GEMINI_API_KEY = ""; // Keep this blank

// Initialize the Google Gemini AI Client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// --- SOCKET.IO CONFIGURATION ---
const io = new Server(server, {
  cors: {
    origin: "https://genuine-vacherin-f77495.netlify.app", // Your Netlify URL
    methods: ["GET", "POST"]
  }
});

// --- DATABASE CONNECTION & SCHEMA ---
const PORT = process.env.PORT || 3000;
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

app.use(express.static('public'));

// --- API ENDPOINTS ---

// Login Endpoint (no changes)
app.post('/api/login', async (req, res) => {
    const { googleId, name, email } = req.body;
    if (!googleId || !name || !email) return res.status(400).json({ message: 'Missing user information.' });
    try {
        let user = await User.findOne({ googleId });
        if (!user) {
            user = new User({ googleId, name, email });
            await user.save();
            return res.json({ status: 'pending' });
        }
        return res.json({ status: user.isApproved ? 'approved' : 'pending' });
    } catch (error) {
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// --- NEW AI & GIPHY ENDPOINTS ---

// Giphy Search Endpoint
app.post('/api/giphy', async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ message: 'Search query is required.' });
    try {
        const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=12`;
        const giphyResponse = await fetch(url);
        const data = await giphyResponse.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch from Giphy.' });
    }
});

// AI Magic Compose Endpoint
app.post('/api/magic-compose', async (req, res) => {
    const { text, tone } = req.body;
    if (!text || !tone) return res.status(400).json({ message: 'Text and tone are required.' });
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
        const prompt = `Rewrite the following text in a more ${tone} tone: "${text}"`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({ suggestion: response.text() });
    } catch (error) {
        res.status(500).json({ message: 'AI suggestion failed.' });
    }
});

// AI Image Generation Endpoint
app.post('/api/imagine', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ message: 'A prompt is required.' });
    try {
        const model = genAI.getGenerativeModel({ model: "imagen-2-flash"});
        const result = await model.generateContent(prompt);
        // This part might need adjustment based on the exact Gemini API response structure for Imagen
        const response = await result.response;
        const imageUrl = response.candidates[0].content.parts[0].uri; // Example path
        res.json({ imageUrl });
    } catch (error) {
        console.error("Image generation error:", error);
        res.status(500).json({ message: 'AI image generation failed.' });
    }
});


// --- SOCKET.IO LOGIC ---
let onlineUsers = {};
io.on('connection', (socket) => {
    socket.on('addUser', (username) => {
        onlineUsers[username] = socket.id;
        io.emit('updateUserList', Object.keys(onlineUsers));
    });

    // Modified to handle different message types
    socket.on('privateMessage', ({ recipient, message }) => {
        const recipientSocketId = onlineUsers[recipient];
        const senderUsername = Object.keys(onlineUsers).find(key => onlineUsers[key] === socket.id);

        if (recipientSocketId && senderUsername) {
            const messageData = { sender: senderUsername, message };
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
    });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

