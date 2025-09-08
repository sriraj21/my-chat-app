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
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();
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

// --- NEW FEATURE DOM ELEMENTS ---
const magicComposeBtn = document.getElementById('magic-compose-btn');
const magicComposeBar = document.getElementById('magic-compose-bar');
const gifBtn = document.getElementById('gif-btn');
const gifModal = document.getElementById('gif-modal');
const gifSearchInput = document.getElementById('gif-search-input');
const gifResults = document.getElementById('gif-results');
const closeGifModalBtn = document.getElementById('close-gif-modal');

let currentRecipient = '';
let currentUser = null;

// --- AUTHENTICATION FLOW (No changes) ---
googleSignInBtn.addEventListener('click', () => auth.signInWithPopup(provider));
signOutBtn.addEventListener('click', () => auth.signOut());
auth.onAuthStateChanged(async user => {
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
async function checkUserApproval() { /* This function remains the same */ }
function showScreen(screenName) { /* This function remains the same */ }


// --- CHAT APPLICATION LOGIC ---

function initializeApp(user) {
    socket = io('https://my-chat-app-azvr.onrender.com');
    socket.on('connect', () => socket.emit('addUser', user.name));

    socket.on('updateUserList', (users) => { /* This function remains the same */ });

    socket.on('privateMessage', ({ sender, message }) => {
        // This is now the central message handler
        if (sender === currentRecipient || sender === user.name) {
            displayMessage(sender, message);
            if (sender !== user.name) {
                synth.triggerAttackRelease("C5", "8n");
            }
        }
    });
}

function displayMessage(sender, message) {
    const item = document.createElement('div');
    item.classList.add('message');
    if (sender === currentUser.name) item.classList.add('my-message');

    // Handle different message types
    if (message.type === 'text') {
        item.innerHTML = `<strong>${sender}</strong><p class="message-text">${message.content}</p>`;
    } else if (message.type === 'gif') {
        item.classList.add('gif-message');
        item.innerHTML = `<strong>${sender}</strong><img class="message-gif" src="${message.content}" alt="GIF">`;
    } else if (message.type === 'image') {
        item.classList.add('image-message');
        item.innerHTML = `<strong>${sender}</strong><img class="message-image" src="${message.content}" alt="AI Generated Image">`;
    }

    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
}

function sendMessage(type, content) {
    if (content && currentRecipient) {
        const message = { type, content };
        socket.emit('privateMessage', { recipient: currentRecipient, message });
    }
}


// --- FORM SUBMISSION ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value;
    if (!text) return;

    if (text.startsWith('/imagine ')) {
        const prompt = text.substring(9);
        displayMessage(currentUser.name, { type: 'text', content: `<em>Generating image: "${prompt}"...</em>`});
        try {
            const response = await fetch('/api/imagine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });
            const data = await response.json();
            if (data.imageUrl) {
                sendMessage('image', data.imageUrl);
            } else {
                 displayMessage(currentUser.name, { type: 'text', content: `<em>Image generation failed.</em>`});
            }
        } catch (error) {
            console.error(error);
            displayMessage(currentUser.name, { type: 'text', content: `<em>Image generation failed.</em>`});
        }
    } else {
        sendMessage('text', text);
    }
    input.value = '';
});

// --- MAGIC COMPOSE LOGIC ---
magicComposeBtn.addEventListener('click', () => {
    magicComposeBar.classList.toggle('hidden');
});

magicComposeBar.addEventListener('click', async (e) => {
    if (e.target.tagName === 'BUTTON') {
        const tone = e.target.dataset.tone;
        const text = input.value;
        if (!text) return;

        try {
            const response = await fetch('/api/magic-compose', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, tone }),
            });
            const data = await response.json();
            if (data.suggestion) {
                input.value = data.suggestion;
            }
        } catch (error) {
            console.error("Magic Compose error:", error);
        } finally {
            magicComposeBar.classList.add('hidden');
        }
    }
});

// --- GIF MODAL LOGIC ---
gifBtn.addEventListener('click', () => gifModal.classList.remove('hidden'));
closeGifModalBtn.addEventListener('click', () => gifModal.classList.add('hidden'));

let searchTimeout;
gifSearchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        const query = gifSearchInput.value;
        if (query.length < 2) return;
        
        try {
            const response = await fetch('/api/giphy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });
            const giphyData = await response.json();
            gifResults.innerHTML = '';
            giphyData.data.forEach(gif => {
                const img = document.createElement('img');
                img.src = gif.images.fixed_height_small.url;
                img.addEventListener('click', () => {
                    sendMessage('gif', gif.images.original.url);
                    gifModal.classList.add('hidden');
                });
                gifResults.appendChild(img);
            });
        } catch (error) {
            console.error("Giphy search error:", error);
        }
    }, 500); // Debounce to avoid too many API calls
});

