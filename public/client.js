// --- PASTE YOUR FIREBASE CONFIGURATION OBJECT HERE ---
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
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

const synth = new Tone.Synth().toDestination();
let socket; // We will initialize socket.io later

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

googleSignInBtn.addEventListener('click', () => {
    auth.signInWithPopup(provider).catch(error => {
        console.error("Error during sign-in:", error);
    });
});

signOutBtn.addEventListener('click', () => {
    auth.signOut();
});

auth.onAuthStateChanged(async (user) => {
    if (user) {
        // User is signed in.
        currentUser = {
            name: user.displayName,
            email: user.email,
            uid: user.uid
        };
        loginScreen.classList.add('hidden');
        loadingScreen.classList.remove('hidden');
        await checkUserApproval();
    } else {
        // User is signed out.
        currentUser = null;
        if (socket) socket.disconnect();
        showScreen('login');
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
                email: currentUser.email,
            }),
        });
        const data = await response.json();

        if (data.status === 'approved') {
            initializeApp(currentUser);
            showScreen('chat');
        } else if (data.status === 'pending') {
            showScreen('pending');
        } else {
            throw new Error(data.message || 'Unknown error');
        }
    } catch (error) {
        console.error("Error checking user approval:", error);
        alert("Could not verify your account. Please try again.");
        auth.signOut();
    }
}

function showScreen(screenName) {
    loginScreen.classList.add('hidden');
    loadingScreen.classList.add('hidden');
    pendingApprovalScreen.classList.add('hidden');
    chatScreen.classList.add('hidden');

    if (screenName === 'login') loginScreen.classList.remove('hidden');
    if (screenName === 'loading') loadingScreen.classList.remove('hidden');
    if (screenName === 'pending') pendingApprovalScreen.classList.remove('hidden');
    if (screenName === 'chat') chatScreen.classList.remove('hidden');
}


// --- CHAT APPLICATION LOGIC ---

function initializeApp(user) {
    // Connect to Socket.IO server ONLY after user is approved
    socket = io('https://my-chat-app-azvr.onrender.com');

    socket.on('connect', () => {
        socket.emit('addUser', user.name);
    });

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
                    document.querySelectorAll('#user-list li').forEach(item => item.style.backgroundColor = 'transparent');
                    li.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                });
                userList.appendChild(li);
            }
        });
    });

    socket.on('privateMessage', ({ sender, text }) => {
        if (sender === currentRecipient || sender === user.name) {
            const item = document.createElement('div');
            item.classList.add('message');
            if (sender === user.name) {
                item.classList.add('my-message');
            } else {
                synth.triggerAttackRelease("C5", "8n");
            }
            item.innerHTML = `<strong>${sender}</strong><p>${text}</p>`;
            messages.appendChild(item);
            messages.scrollTop = messages.scrollHeight;
        }
    });
}

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

