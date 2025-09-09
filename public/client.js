import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithRedirect, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBhlesPeg7mcicF7HltvK4bmLuiiAtDWgY",
  authDomain: "moment-chat-a24e8.firebaseapp.com",
  projectId: "moment-chat-a24e8",
  storageBucket: "moment-chat-a24e8.firebasestorage.app",
  messagingSenderId: "806882645852",
  appId: "1:806882645852:web:76672d07fd064ef02ed399",
  measurementId: "G-CCHZWCX8XS"
};

// --- INITIALIZE LIBRARIES ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const synth = new Tone.Synth().toDestination();
let socket;

// --- DOM ELEMENTS ---
const loginScreen = document.getElementById('login-screen');
const loadingScreen = document.getElementById('loading-screen');
const pendingApprovalScreen = document.getElementById('pending-approval-screen');
const chatScreen = document.getElementById('chat-screen');
const googleSignInBtn = document.getElementById('google-signin-btn');
const signOutBtn = document.getElementById('sign-out-btn');
const userList = document.getElementById('user-list');
const messages = document.getElementById('messages');
const form = document.getElementById('form');
const input = document.getElementById('input');
const recipientName = document.getElementById('recipient-name');

let currentRecipient = '';
let currentUser = null;

// --- AUTHENTICATION FLOW ---
// This line has been changed back to use the popup method.
googleSignInBtn.addEventListener('click', () => signInWithPopup(auth, provider));
signOutBtn.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async user => {
    if (user) {
        currentUser = { name: user.displayName, email: user.email, uid: user.uid };
        showScreen('loading');
        await checkUserApproval();
    } else {
        currentUser = null;
        if (socket) socket.disconnect();
        showScreen('login');
        document.body.classList.remove('chat-active');
    }
});

async function checkUserApproval() {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                googleId: currentUser.uid,
                name: currentUser.name,
                email: currentUser.email
            }),
        });
        const data = await response.json();

        if (data.status === 'approved') {
            showScreen('chat');
            document.body.classList.add('chat-active');
            initializeChat(currentUser);
        } else {
            showScreen('pending');
        }
    } catch (error) {
        console.error("Failed to check user approval:", error);
        alert("Could not connect to the server to verify your account. Please try again later.");
        signOut(auth);
    }
}

function showScreen(screenName) {
    loginScreen.classList.add('hidden');
    loadingScreen.classList.add('hidden');
    pendingApprovalScreen.classList.add('hidden');
    chatScreen.classList.add('hidden');

    if (screenName === 'login') loginScreen.classList.remove('hidden');
    else if (screenName === 'loading') loadingScreen.classList.remove('hidden');
    else if (screenName === 'pending') pendingApprovalScreen.classList.remove('hidden');
    else if (screenName === 'chat') chatScreen.classList.remove('hidden');
}

// --- CHAT APPLICATION LOGIC ---
function initializeChat(user) {
    socket = io();
    socket.on('connect', () => socket.emit('addUser', user.name));

    socket.on('updateUserList', (users) => {
        userList.innerHTML = '';
        users.forEach(u => {
            if (u !== user.name) {
                const li = document.createElement('li');
                li.textContent = u;
                li.addEventListener('click', () => {
                    currentRecipient = u;
                    recipientName.textContent = u;
                    messages.innerHTML = '';
                    document.querySelectorAll('#user-list li').forEach(item => item.classList.remove('active'));
                    li.classList.add('active');
                });
                userList.appendChild(li);
            }
        });
    });

    socket.on('privateMessage', ({ sender, text }) => {
        // Only display message if it's part of the current conversation
        if (sender === currentRecipient || sender === user.name) {
            displayMessage(sender, text);
            if (sender !== user.name) {
                synth.triggerAttackRelease("C5", "8n");
            }
        }
    });
}

function displayMessage(sender, text) {
    const item = document.createElement('div');
    item.classList.add('message');
    if (sender === currentUser.name) {
        item.classList.add('my-message');
    }
    item.innerHTML = `<strong>${sender}</strong><p class="message-text">${text}</p>`;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value;
    if (text && currentRecipient) {
        socket.emit('privateMessage', { recipient: currentRecipient, text });
        input.value = '';
    }
});

