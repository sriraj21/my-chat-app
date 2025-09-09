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
// --- INITIALIZE LIBRARIES (MODERN SYNTAX) ---
const { initializeApp, getAuth, GoogleAuthProvider, signInWithRedirect, onAuthStateChanged, signOut } = window.firebaseSDK;

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
googleSignInBtn.addEventListener('click', () => signInWithRedirect(auth, provider));
signOutBtn.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async user => {
    console.log("Auth state changed:", user); // Debugging line

    if (user) {
        currentUser = { name: user.displayName, email: user.email, uid: user.uid };
        showScreen('loading');
        await checkUserApproval();
    } else {
        currentUser = null;
        if (socket) socket.disconnect();
        showScreen('login');
    }
});

async function checkUserApproval() {
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
        initializeChat(currentUser); // <-- EDITED: Function call renamed
    } else {
        showScreen('pending');
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
// <-- EDITED: Function declaration renamed
function initializeChat(user) {
    socket = io(); // Connects to the same server that serves the files
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
    item.innerHTML = `<strong>${sender}</strong>: ${text}`;
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


