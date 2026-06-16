import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getDatabase, ref, set, get, child, push, onValue } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAOgC8M2o5Wz8yl3f1wGQ8p_rUWXujckpw",
    authDomain: "livechattest-39175.firebaseapp.com",
    databaseURL: "https://livechattest-39175-default-rtdb.firebaseio.com",
    projectId: "livechattest-39175",
    storageBucket: "livechattest-39175.appspot.com",
    messagingSenderId: "790569864878",
    appId: "1:790569864878:web:8d3fa30563adfdbaaaa73f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const provider = new GoogleAuthProvider();
auth.languageCode = 'en';

/* --- DOM refs (updated to match new HTML) --- */
const usersList = $('#usersList');
const thumbnailBgColors = ['6c63ff','ff6584','43e97b','f59e0b','ef4444','8b5cf6'];
const conversationThumbnail = $('.conversation-thumbnail');
const conversationName = $('.conversation-name');
const conversationBio = $('.conversation-bio');
const messageTextInput = $('.message-text-input');
const sendTextMessageBtn = $('.send-text-message');
const msgBody = $('#msg-body');
var conversationRef;
var currentUnsubscribe = null;

/* --- Sign-in button --- */
document.getElementById('sign-in-button').addEventListener('click', () => {
    showLoginError('');
    signInWithPopup(auth, provider)
        .then((result) => {
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential ? credential.accessToken : null;
            getOrCreateUser(result.user, token);
        })
        .catch((error) => {
            showLoginError('Sign-in failed: ' + (error.message || 'Please try again.'));
        });
});

function showLoginError(msg) {
    const el = document.getElementById('login-error');
    if (!el) return;
    if (msg) { el.textContent = msg; el.style.display = 'block'; }
    else       { el.style.display = 'none'; }
}


async function getOrCreateUser(user, token) {
    const userRef = ref(database, 'users/' + user.uid);
    const userSnapshot = await get(userRef);
    if (!userSnapshot.exists()) {
        set(userRef, {
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            uid: user.uid,
            token: token
        })
            .then(() => {
                loginUser({
                    displayName: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    uid: user.uid
                });
            })
            .catch((error) => {
                alert('Something went wrong. Please try again later.');
                window.location.reload();
            });
    } else {
        loginUser(userSnapshot.val());
    }
}

function loginUser(user) {
    window.localStorage.setItem('user', JSON.stringify(user));
    open_chat();
}


function open_chat() {
    if (window.localStorage.getItem('user')) {
        document.getElementById('login').style.display = 'none';
        document.getElementById('chat').style.display = 'block';
        getUsersList().then((users) => {
            if (!users) return;
            usersList.html('');
            const me = JSON.parse(window.localStorage.getItem('user')).uid;
            Object.keys(users).forEach((key) => {
                if (users[key].uid === me) return; /* skip self */
                let color = thumbnailBgColors[Math.floor(Math.random() * thumbnailBgColors.length)];
                const initials = encodeURIComponent(users[key].displayName.charAt(0).toUpperCase());
                usersList.append(`
                    <a href="#" class="user-item open-conversation" data-uid="${users[key].uid}">
                        <img class="user-avatar"
                            src="${users[key].photoURL}"
                            alt="${users[key].displayName}"
                            onerror="this.src='https://placehold.co/44x44/${color}/white?text=${initials}'">
                        <div class="user-info">
                            <h4>${users[key].displayName}</h4>
                            <p>${users[key].email}</p>
                        </div>
                        <div class="user-dot"></div>
                    </a>
                `);
            });
        });
    } else {
        document.getElementById('login').style.display = 'flex';
        document.getElementById('chat').style.display = 'none';
    }
}
open_chat();

$('body').on('click', '.open-conversation', async function (e) {
    e.preventDefault();
    /* Highlight active user */
    $('.open-conversation').removeClass('active');
    $(this).addClass('active');

    let _this = $(this);
    let uid = $(this).data('uid');
    let sender = JSON.parse(window.localStorage.getItem('user')).uid;

    conversationThumbnail.attr('src', _this.find('img').attr('src'));
    conversationName.text(_this.find('h4').text());
    conversationBio.text(_this.find('p').text());
    messageTextInput.attr('data-uid', uid);
    messageTextInput.data('uid', uid);

    /* Re-enable send button check */
    const sendBtn = document.getElementById('send-btn');
    const msgInp  = document.getElementById('msg-input');
    if (sendBtn && msgInp) sendBtn.disabled = msgInp.value.trim() === '';

    /* On mobile hide sidebar, show chat */
    if (typeof hideSidebar === 'function') hideSidebar();

    /* Unsubscribe previous listener */
    if (currentUnsubscribe) { currentUnsubscribe(); currentUnsubscribe = null; }

    const conversationRefPath1 = 'conversations/' + sender + '-' + uid;
    const conversationRefPath2 = 'conversations/' + uid + '-' + sender;

    try {
        conversationRef = ref(database, conversationRefPath1);
        const snap1 = await get(conversationRef);
        if (!snap1.exists()) {
            conversationRef = ref(database, conversationRefPath2);
        }
    } catch (error) {
        console.error(error);
    }

    currentUnsubscribe = onValue(conversationRef, (snapshot) => {
        const data = snapshot.val();
        loadMessages(sender, data);
        const area = document.getElementById('msg-body');
        if (area) setTimeout(() => { area.scrollTop = area.scrollHeight; }, 50);
    });
})

sendTextMessageBtn.on('click', async function (e) {
    e.preventDefault();

    const uid     = messageTextInput.data('uid');
    const sender  = JSON.parse(window.localStorage.getItem('user')).uid;
    const message = messageTextInput.val().trim();

    if (!message || !uid || uid === 'null') return;

    try {
        const conversationRefKey = push(child(conversationRef, 'conversations')).key;
        await set(child(conversationRef, '/' + conversationRefKey), {
            sender: sender,
            message: message,
            timestamp: Date.now()
        });
        /* Clear input and disable send btn */
        messageTextInput.val('');
        const inp = document.getElementById('msg-input');
        const btn = document.getElementById('send-btn');
        if (inp) inp.value = '';
        if (btn) btn.disabled = true;
    } catch (error) {
        console.error(error);
    }
});


document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'sign-out') {
        e.preventDefault();
        window.localStorage.removeItem('user');
        window.location.reload();
    }
});






async function getUsersList() {
    const userRef = ref(database, 'users');
    const userSnapshot = await get(userRef);
    if (userSnapshot.exists()) {
        return userSnapshot.val();
    }
}



function loadMessages(sender, conversationSnapshot) {
    const area = document.getElementById('msg-body');
    if (!area) return;
    /* Clear previous messages but keep empty-state placeholder logic */
    area.innerHTML = '';
    if (!conversationSnapshot) {
        area.innerHTML = '<div class="chat-empty"><i class="bi bi-chat-square-dots"></i><span>No messages yet. Say hello!</span></div>';
        return;
    }
    $.each(conversationSnapshot, (index, val) => {
        if (!val || !val.message) return;
        const isSent = (val.sender === sender);
        const cls    = isSent ? 'sent' : 'recv';
        const time   = val.timestamp ? new Date(val.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';
        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble ' + cls;
        bubble.innerHTML = `<p>${escapeHtml(val.message)}</p><div class="msg-time">${time}</div>`;
        area.appendChild(bubble);
    });
}

function escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}


