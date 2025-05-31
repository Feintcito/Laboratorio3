// State Management
const appState = {
    authToken: null,
    socket: null,
    currentUser: null,
    currentChatPartner: null,
    rsaKeyPair: null,
    activeChatKeys: {},
    chatHistories: {},
    friendsData: {},
    keyExchangeInProgress: {},
    connectionRetries: 0,
    selectedFile: null,
    MAX_RETRIES: 3
};

// DOM Elements
const DOM = {
    authSection: document.getElementById('auth-section'),
    chatSection: document.getElementById('chat-section'),
    usernameInput: document.getElementById('username'),
    passwordInput: document.getElementById('password'),
    registerBtn: document.getElementById('register-btn'),
    loginBtn: document.getElementById('login-btn'),
    authMessage: document.getElementById('auth-message'),
    currentUserSpan: document.getElementById('current-user'),
    onlineUsersSpan: document.getElementById('online-users'),
    searchUsersInput: document.getElementById('search-users'),
    searchResultsDiv: document.getElementById('search-results'),
    friendRequestsList: document.getElementById('friend-requests-list'),
    friendsList: document.getElementById('friends-list'),
    noChatSelected: document.getElementById('no-chat-selected'),
    activeChat: document.getElementById('active-chat'),
    chatPartnerSpan: document.getElementById('chat-partner'),
    messagesDiv: document.getElementById('messages'),
    messageInput: document.getElementById('message-input'),
    sendMessageBtn: document.getElementById('send-message-btn'),
    clearChatBtn: document.getElementById('clear-chat-btn'),
    closeChatBtn: document.getElementById('close-chat-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    fileInput: document.getElementById('file-input'),
    attachFileBtn: document.getElementById('attach-file-btn'),
    fileSelected: document.getElementById('file-selected'),
    fileNameDisplay: document.getElementById('file-name-display')
};

// Crypto Utilities
const CryptoUtils = {
    async checkCryptoSupport() {
        if (!window.crypto || !window.crypto.subtle) {
            throw new Error("Web Crypto API no disponible. Usa un navegador moderno.");
        }
    },

    async generateRsaKeyPair() {
        await CryptoUtils.checkCryptoSupport();
        appState.rsaKeyPair = await window.crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                hash: "SHA-256",
            },
            true,
            ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
        );
        return CryptoUtils.exportPublicKeyAsPem(appState.rsaKeyPair.publicKey);
    },

    async exportPublicKeyAsPem(publicKey) {
        const spki = await window.crypto.subtle.exportKey("spki", publicKey);
        const b64 = btoa(String.fromCharCode(...new Uint8Array(spki)));
        return `-----BEGIN PUBLIC KEY-----\n${b64.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;
    },

    async importPublicKeyFromPem(pem) {
        const b64 = pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\n/g, '');
        const binaryDer = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        return window.crypto.subtle.importKey(
            "spki",
            binaryDer,
            { name: "RSA-OAEP", hash: "SHA-256" },
            true,
            ["encrypt", "wrapKey"]
        );
    },

    async generateAesKey() {
        return window.crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
    },

    async encryptAes(text, key) {
        const encoded = new TextEncoder().encode(text);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const ciphertext = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            key,
            encoded
        );
        return {
            encryptedMessage: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
            iv: btoa(String.fromCharCode(...new Uint8Array(iv)))
        };
    },

    async decryptAes(encryptedBase64, ivBase64, key) {
        try {
            const encrypted = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
            const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
            const decrypted = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv },
                key,
                encrypted
            );
            return new TextDecoder().decode(decrypted);
        } catch (e) {
            console.error("Error al descifrar:", e);
            return "[MENSAJE NO DESCIFRADO]";
        }
    },

    async wrapAesKey(aesKeyToWrap, publicKeyRsa) {
        const wrappedKey = await window.crypto.subtle.wrapKey(
            "raw",
            aesKeyToWrap,
            publicKeyRsa,
            { name: "RSA-OAEP" }
        );
        return btoa(String.fromCharCode(...new Uint8Array(wrappedKey)));
    },

    async unwrapAesKey(wrappedAesKeyBase64, privateKeyRsa) {
        const wrappedKey = Uint8Array.from(atob(wrappedAesKeyBase64), c => c.charCodeAt(0));
        return window.crypto.subtle.unwrapKey(
            "raw",
            wrappedKey,
            privateKeyRsa,
            { name: "RSA-OAEP" },
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
    }
};

// File Handling Utilities
const FileUtils = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > FileUtils.MAX_FILE_SIZE) {
            UIUtils.appendMessage('Sistema', 'Archivo demasiado grande. Máximo 10MB.', false, true);
            return;
        }

        appState.selectedFile = file;
        DOM.fileNameDisplay.textContent = file.name;
        DOM.fileSelected.style.display = 'block';
    },

    cancelFileSelection() {
        appState.selectedFile = null;
        DOM.fileInput.value = '';
        DOM.fileSelected.style.display = 'none';
    },

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch('/upload-file', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${appState.authToken}` },
            body: formData
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Error subiendo archivo');
        return result.file;
    },

    getFileIcon(mimeType) {
        if (mimeType.startsWith('image/')) return '🖼️';
        if (mimeType.startsWith('video/')) return '🎥';
        if (mimeType.startsWith('audio/')) return '🎵';
        if (mimeType.includes('pdf')) return '📄';
        if (mimeType.includes('word')) return '📝';
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
        return '📎';
    },

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    downloadFile(base64Data, fileName, mimeType) {
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
};

// UI Utilities
const UIUtils = {
    showAuthSection() {
        DOM.authSection.style.display = 'block';
        DOM.chatSection.style.display = 'none';
    },

    showChatSection() {
        DOM.authSection.style.display = 'none';
        DOM.chatSection.style.display = 'block';
    },

    displayAuthMessage(message, isError = true) {
        DOM.authMessage.textContent = message;
        DOM.authMessage.style.color = isError ? '#e06c75' : '#98c379';
    },

    appendMessage(sender, message, isSentByMe, isSystem = false) {
        const msgElem = document.createElement('div');
        msgElem.classList.add('message-item');
        if (isSystem) {
            msgElem.classList.add('system');
            msgElem.textContent = message;
        } else {
            msgElem.classList.add(isSentByMe ? 'sent' : 'received');
            const displaySender = sender.includes('@') ? sender.split('@')[0] : sender;
            msgElem.textContent = `${displaySender}: ${message}`;
        }
        DOM.messagesDiv.appendChild(msgElem);
        DOM.messagesDiv.scrollTop = DOM.messagesDiv.scrollHeight;
    },

    appendFileMessage(sender, fileData, isSentByMe) {
        const msgElem = document.createElement('div');
        msgElem.classList.add('message-item', 'file-message');
        msgElem.classList.add(isSentByMe ? 'sent' : 'received');
        const fileIcon = FileUtils.getFileIcon(fileData.type);
        const fileSize = FileUtils.formatFileSize(fileData.size);
        const displaySender = sender.includes('@') ? sender.split('@')[0] : sender;
        msgElem.innerHTML = `
            <div class="file-message-content">
                <div class="file-icon">${fileIcon}</div>
                <div class="file-info">
                    <div class="file-name">${fileData.name}</div>
                    <div class="file-size">${fileSize}</div>
                </div>
                <button class="download-btn" onclick="FileUtils.downloadFile('${fileData.data}', '${fileData.name}', '${fileData.type}')">
                    Descargar
                </button>
            </div>
            <div class="message-sender">${displaySender}</div>
        `;
        DOM.messagesDiv.appendChild(msgElem);
        DOM.messagesDiv.scrollTop = DOM.messagesDiv.scrollHeight;
    },

    clearMessages() {
        DOM.messagesDiv.innerHTML = '';
    },

    enableChatInput(enable) {
        DOM.messageInput.disabled = !enable;
        DOM.sendMessageBtn.disabled = !enable;
        DOM.attachFileBtn.disabled = !enable;
        DOM.fileInput.disabled = !enable;
        if (enable) DOM.messageInput.focus();
    },

    showChat(friendUsername) {
        appState.currentChatPartner = friendUsername;
        DOM.chatPartnerSpan.textContent = friendUsername;
        DOM.noChatSelected.style.display = 'none';
        DOM.activeChat.style.display = 'flex';
        UIUtils.updateFriendsListUI();
        if (!appState.activeChatKeys[friendUsername]) {
            if (appState.keyExchangeInProgress[friendUsername]) {
                UIUtils.enableChatInput(false);
                return;
            }
            UIUtils.enableChatInput(false);
            UIUtils.clearMessages();
            UIUtils.appendMessage('Sistema', 'Estableciendo conexión segura...', false, true);
            appState.keyExchangeInProgress[friendUsername] = true;
            setTimeout(() => {
                if (appState.socket && appState.socket.connected) {
                    SocketUtils.requestPublicKey(friendUsername);
                } else {
                    UIUtils.appendMessage('Sistema', 'Error de conexión. Reconectando...', false, true);
                    SocketUtils.initializeSocket();
                }
            }, 500);
        } else {
            UIUtils.loadChatHistory(friendUsername);
            UIUtils.enableChatInput(true);
        }
    },

    closeChat() {
        if (appState.currentChatPartner) {
            appState.keyExchangeInProgress[appState.currentChatPartner] = false;
        }
        appState.currentChatPartner = null;
        DOM.noChatSelected.style.display = 'block';
        DOM.activeChat.style.display = 'none';
        UIUtils.clearMessages();
        UIUtils.updateFriendsListUI();
    },

    loadChatHistory(friendUsername) {
        UIUtils.clearMessages();
        if (appState.socket && appState.socket.connected && appState.activeChatKeys[friendUsername]) {
            appState.socket.emit('get_chat_history', friendUsername);
        }
    },

    renderSearchResults(users) {
        DOM.searchResultsDiv.innerHTML = '';
        users.forEach(username => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.innerHTML = `
                <span>${username}</span>
                <button class="add-friend-btn" onclick="SocketUtils.sendFriendRequest('${username}')">
                    Agregar
                </button>
            `;
            DOM.searchResultsDiv.appendChild(item);
        });
    },

    renderFriendRequests(requests) {
        DOM.friendRequestsList.innerHTML = '';
        requests.forEach(request => {
            const item = document.createElement('div');
            item.className = 'friend-request-item';
            item.innerHTML = `
                <div class="friend-name">${request.requester_username}</div>
                <div class="friend-actions">
                    <button class="accept-btn" onclick="SocketUtils.respondFriendRequest(${request.id}, true)">
                        Aceptar
                    </button>
                    <button class="reject-btn" onclick="SocketUtils.respondFriendRequest(${request.id}, false)">
                        Rechazar
                    </button>
                </div>
            `;
            DOM.friendRequestsList.appendChild(item);
        });
    },

    renderFriendsList(friends) {
        appState.friendsData = {};
        friends.forEach(friend => {
            appState.friendsData[friend.username] = friend;
        });
        UIUtils.updateFriendsListUI();
    },

    updateFriendsListUI() {
        DOM.friendsList.innerHTML = '';
        Object.values(appState.friendsData).forEach(friend => {
            const item = document.createElement('div');
            item.className = `friend-item ${friend.isOnline ? 'online' : 'offline'}`;
            if (appState.currentChatPartner === friend.username) {
                item.classList.add('active');
            }
            item.innerHTML = `
                <div class="friend-name">${friend.username}</div>
                <div class="friend-status ${friend.isOnline ? 'online' : 'offline'}">
                    ${friend.isOnline ? 'En línea' : 'Desconectado'}
                </div>
            `;
            item.addEventListener('click', () => UIUtils.showChat(friend.username));
            DOM.friendsList.appendChild(item);
        });
    }
};

// Socket Utilities
const SocketUtils = {
    initializeSocket() {
        if (appState.socket) {
            appState.socket.disconnect();
            appState.socket = null;
        }
        appState.connectionRetries = 0;
        SocketUtils.connectSocket();
    },

    connectSocket() {
        appState.socket = io({
            auth: { token: appState.authToken },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        appState.socket.on('connect', async () => {
            console.log('Socket conectado');
            appState.connectionRetries = 0;
            if (!appState.rsaKeyPair || !appState.rsaKeyPair.publicKey) {
                try {
                    await CryptoUtils.generateRsaKeyPair();
                } catch (e) {
                    console.error('Error generando claves:', e);
                    return;
                }
            }
            try {
                const pem = await CryptoUtils.exportPublicKeyAsPem(appState.rsaKeyPair.publicKey);
                appState.socket.emit('send_public_key', pem);
            } catch (e) {
                console.error('Error enviando clave:', e);
            }
            setTimeout(() => {
                appState.socket.emit('get_friend_requests');
                appState.socket.emit('get_friends_list');
            }, 300);
        });

        appState.socket.on('connect_error', (error) => {
            console.error('Error de conexión:', error);
            appState.connectionRetries++;
            if (appState.connectionRetries < appState.MAX_RETRIES) {
                setTimeout(() => {
                    console.log(`Reintentando conexión (${appState.connectionRetries}/${appState.MAX_RETRIES})`);
                    SocketUtils.connectSocket();
                }, 2000 * appState.connectionRetries);
            } else {
                UIUtils.appendMessage('Sistema', 'Error de conexión persistente. Recarga la página.', false, true);
            }
        });

        appState.socket.on('online_users', (users) => {
            const filteredUsers = users.filter(user => user !== appState.currentUser);
            DOM.onlineUsersSpan.textContent = `Online: ${filteredUsers.length}`;
            Object.keys(appState.friendsData).forEach(friendUsername => {
                appState.friendsData[friendUsername].isOnline = users.includes(friendUsername);
            });
            UIUtils.updateFriendsListUI();
        });

        appState.socket.on('search_results', UIUtils.renderSearchResults);

        appState.socket.on('friend_request_sent', (targetUsername) => {
            UIUtils.appendMessage('Sistema', `Solicitud enviada a ${targetUsername}`, false, true);
            DOM.searchResultsDiv.innerHTML = '';
            DOM.searchUsersInput.value = '';
        });

        appState.socket.on('friend_request_received', (data) => {
            UIUtils.appendMessage('Sistema', `${data.requester} te envió solicitud`, false, true);
            appState.socket.emit('get_friend_requests');
        });

        appState.socket.on('friend_requests_list', UIUtils.renderFriendRequests);

        appState.socket.on('friend_request_accepted', (friendUsername) => {
            UIUtils.appendMessage('Sistema', `Ahora eres amigo de ${friendUsername}`, false, true);
            appState.socket.emit('get_friends_list');
            appState.socket.emit('get_friend_requests');
        });

        appState.socket.on('friend_request_rejected', () => {
            appState.socket.emit('get_friend_requests');
        });

        appState.socket.on('friend_request_response', (data) => {
            const message = data.accepted
                ? `${data.user} aceptó tu solicitud`
                : `${data.user} rechazó tu solicitud`;
            UIUtils.appendMessage('Sistema', message, false, true);
            if (data.accepted) appState.socket.emit('get_friends_list');
        });

        appState.socket.on('friends_list', UIUtils.renderFriendsList);

        appState.socket.on('user_offline', (username) => {
            if (appState.friendsData[username]) {
                appState.friendsData[username].isOnline = false;
                UIUtils.updateFriendsListUI();
            }
        });

        appState.socket.on('receive_public_key', async (data) => {
            const { username, publicKey } = data;
            console.log(`Clave pública recibida de ${username}`);
            if (username === appState.currentChatPartner) {
                if (!publicKey) {
                    UIUtils.appendMessage('Sistema', `Error: Clave pública vacía de ${username}`, false, true);
                    appState.keyExchangeInProgress[username] = false;
                    UIUtils.enableChatInput(false);
                    return;
                }
                try {
                    const importedPublicKey = await CryptoUtils.importPublicKeyFromPem(publicKey);
                    const aesKey = await CryptoUtils.generateAesKey();
                    appState.activeChatKeys[username] = aesKey;
                    const wrappedAesKey = await CryptoUtils.wrapAesKey(aesKey, importedPublicKey);
                    appState.socket.emit('private_message', {
                        receiver: appState.currentChatPartner,
                        encryptedMessage: wrappedAesKey,
                        iv: 'KEY_EXCHANGE'
                    });
                    UIUtils.appendMessage('Sistema', 'Conexión segura establecida', false, true);
                    appState.keyExchangeInProgress[username] = false;
                    UIUtils.enableChatInput(true);
                    setTimeout(() => UIUtils.loadChatHistory(username), 100);
                } catch (e) {
                    console.error('Error en intercambio:', e);
                    UIUtils.appendMessage('Sistema', `Error estableciendo chat seguro: ${e.message}`, false, true);
                    appState.keyExchangeInProgress[username] = false;
                    UIUtils.enableChatInput(false);
                }
            }
        });

        appState.socket.on('private_message', async (data) => {
            const { sender, encryptedMessage, iv, messageType, fileData } = data;
            if (iv === 'KEY_EXCHANGE') {
                if (appState.friendsData[sender]) {
                    try {
                        const aesKey = await CryptoUtils.unwrapAesKey(encryptedMessage, appState.rsaKeyPair.privateKey);
                        appState.activeChatKeys[sender] = aesKey;
                        appState.keyExchangeInProgress[sender] = false;
                        if (appState.currentChatPartner === sender) {
                            UIUtils.appendMessage('Sistema', 'Conexión segura establecida', false, true);
                            UIUtils.enableChatInput(true);
                            setTimeout(() => UIUtils.loadChatHistory(sender), 100);
                        }
                    } catch (e) {
                        console.error('Error descifrando clave:', e);
                        appState.keyExchangeInProgress[sender] = false;
                        if (appState.currentChatPartner === sender) {
                            UIUtils.appendMessage('Sistema', 'Error en chat seguro', false, true);
                            UIUtils.enableChatInput(false);
                        }
                    }
                }
                return;
            }

            if (appState.friendsData[sender] && appState.activeChatKeys[sender]) {
                try {
                    if (messageType === 'file' && fileData) {
                        const decryptedFileInfo = await CryptoUtils.decryptAes(encryptedMessage, iv, appState.activeChatKeys[sender]);
                        const fileInfo = JSON.parse(decryptedFileInfo);
                        const completeFileData = { ...fileInfo, data: fileData.data };
                        if (appState.currentChatPartner === sender) {
                            UIUtils.appendFileMessage(sender, completeFileData, false);
                        }
                    } else {
                        const decryptedMessage = await CryptoUtils.decryptAes(encryptedMessage, iv, appState.activeChatKeys[sender]);
                        if (appState.currentChatPartner === sender) {
                            UIUtils.appendMessage(sender, decryptedMessage, false);
                        }
                    }
                } catch (e) {
                    console.error('Error descifrando mensaje:', e);
                    if (appState.currentChatPartner === sender) {
                        UIUtils.appendMessage(sender, '[ERROR DESCIFRADO]', false);
                    }
                }
            }
        });

        appState.socket.on('chat_history', async (messages) => {
            if (!appState.currentChatPartner) return;
            console.log(`Recibido historial de ${messages.length} mensajes para ${appState.currentChatPartner}`);
            const systemMessages = Array.from(DOM.messagesDiv.querySelectorAll('.system'));
            systemMessages.forEach(msg => {
                if (!msg.textContent.includes('Conexión segura establecida')) msg.remove();
            });
            const aesKey = appState.activeChatKeys[appState.currentChatPartner];
            if (!aesKey) {
                console.log('No hay clave AES para descifrar historial');
                return;
            }
            for (const msg of messages) {
                if (msg.iv === 'KEY_EXCHANGE') continue;
                try {
                    const isSentByMe = msg.sender === appState.currentUser;
                    if (msg.messageType === 'file' && msg.file_data) {
                        const decryptedFileInfo = await CryptoUtils.decryptAes(msg.encryptedMessage, msg.iv, aesKey);
                        const fileInfo = JSON.parse(decryptedFileInfo);
                        const completeFileData = { ...fileInfo, data: msg.file_data };
                        UIUtils.appendFileMessage(msg.sender, completeFileData, isSentByMe);
                    } else {
                        const decryptedMessage = await CryptoUtils.decryptAes(msg.encryptedMessage, msg.iv, aesKey);
                        UIUtils.appendMessage(msg.sender, decryptedMessage, isSentByMe);
                    }
                } catch (e) {
                    console.error('Error descifrando mensaje del historial:', e);
                    UIUtils.appendMessage(msg.sender, '[ERROR DESCIFRADO]', msg.sender === appState.currentUser);
                }
            }
        });

        appState.socket.on('error_message', (message) => {
            console.error('Error servidor:', message);
            UIUtils.appendMessage('Sistema', `Error: ${message}`, false, true);
            if (message.includes('clave pública')) {
                setTimeout(async () => {
                    if (appState.rsaKeyPair && appState.rsaKeyPair.publicKey) {
                        try {
                            const pem = await CryptoUtils.exportPublicKeyAsPem(appState.rsaKeyPair.publicKey);
                            appState.socket.emit('send_public_key', pem);
                        } catch (e) {
                            console.error('Error reenvío clave:', e);
                        }
                    }
                }, 1000);
            }
        });

        appState.socket.on('disconnect', (reason) => {
            console.log('Socket desconectado:', reason);
            Object.keys(appState.keyExchangeInProgress).forEach(user => {
                appState.keyExchangeInProgress[user] = false;
            });
            if (appState.currentChatPartner) {
                UIUtils.enableChatInput(false);
            }
            if (reason === 'io server disconnect' && appState.authToken) {
                setTimeout(() => SocketUtils.connectSocket(), 2000);
            }
        });

        appState.socket.on('reconnect', () => {
            console.log('Socket reconectado');
            if (appState.currentChatPartner && !appState.activeChatKeys[appState.currentChatPartner]) {
                UIUtils.showChat(appState.currentChatPartner);
            } else if (appState.currentChatPartner && appState.activeChatKeys[appState.currentChatPartner]) {
                UIUtils.loadChatHistory(appState.currentChatPartner);
            }
        });
    },

    requestPublicKey(targetUsername) {
        if (appState.socket && appState.socket.connected) {
            console.log(`Solicitando clave pública de ${targetUsername}`);
            appState.socket.emit('request_public_key', targetUsername);
        } else {
            console.error('Socket no conectado');
            UIUtils.appendMessage('Sistema', 'Error de conexión', false, true);
            appState.keyExchangeInProgress[targetUsername] = false;
        }
    },

    sendFriendRequest(targetUsername) {
        if (appState.socket && appState.socket.connected) {
            appState.socket.emit('send_friend_request', targetUsername);
        }
    },

    respondFriendRequest(requestId, accept) {
        if (appState.socket && appState.socket.connected) {
            appState.socket.emit('respond_friend_request', { requestId, accept });
        }
    }
};

// Authentication and Main Logic
DOM.registerBtn.addEventListener('click', async () => {
    const username = DOM.usernameInput.value.trim();
    const password = DOM.passwordInput.value;
    const emailPattern = /^[a-zA-Z0-9._%+-]+@uni\.(pe|edu\.pe)$/;
    const passwordPattern = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

    if (!username || !password) {
        UIUtils.displayAuthMessage('Usuario y contraseña requeridos', true);
        return;
    }
    if (!emailPattern.test(username)) {
        UIUtils.displayAuthMessage('Debe usar un correo @uni.pe o @uni.edu.pe', true);
        return;
    }
    if (!passwordPattern.test(password)) {
        UIUtils.displayAuthMessage('La contraseña debe tener al menos 16 caracteres, incluyendo letras, números y caracteres especiales', true);
        return;
    }

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        UIUtils.displayAuthMessage(data.message, !response.ok);
    } catch (error) {
        UIUtils.displayAuthMessage('Error al registrarse', true);
    }
});

DOM.loginBtn.addEventListener('click', async () => {
    const username = DOM.usernameInput.value.trim();
    const password = DOM.passwordInput.value;
    if (!username || !password) {
        UIUtils.displayAuthMessage('Usuario y contraseña requeridos', true);
        return;
    }
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (response.ok) {
            appState.authToken = data.token;
            appState.currentUser = username;
            DOM.currentUserSpan.textContent = username.split('@')[0];
            UIUtils.showChatSection();
            try {
                await CryptoUtils.generateRsaKeyPair();
                SocketUtils.initializeSocket();
            } catch (cryptoError) {
                UIUtils.displayAuthMessage("Error de criptografía: " + cryptoError.message, true);
                return;
            }
            UIUtils.displayAuthMessage(data.message, false);
        } else {
            UIUtils.displayAuthMessage(data.message, true);
        }
    } catch (error) {
        UIUtils.displayAuthMessage('Error al iniciar sesión', true);
    }
});

DOM.logoutBtn.addEventListener('click', () => {
    appState.authToken = null;
    appState.currentUser = null;
    appState.rsaKeyPair = null;
    appState.activeChatKeys = {};
    appState.chatHistories = {};
    appState.friendsData = {};
    appState.keyExchangeInProgress = {};
    if (appState.socket) {
        appState.socket.disconnect();
        appState.socket = null;
    }
    UIUtils.clearMessages();
    DOM.usernameInput.value = '';
    DOM.passwordInput.value = '';
    DOM.authMessage.textContent = '';
    UIUtils.showAuthSection();
    console.log("User logged out.");
});

DOM.searchUsersInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.trim();
    if (searchTerm.length >= 2 && appState.socket && appState.socket.connected) {
        appState.socket.emit('search_users', searchTerm);
    } else {
        DOM.searchResultsDiv.innerHTML = '';
    }
});

DOM.sendMessageBtn.addEventListener('click', async () => {
    const message = DOM.messageInput.value.trim();
    if ((!message && !appState.selectedFile) || !appState.currentChatPartner || !appState.activeChatKeys[appState.currentChatPartner]) {
        if (!appState.activeChatKeys[appState.currentChatPartner]) {
            UIUtils.appendMessage('Sistema', 'Conexión segura no establecida', false, true);
        }
        return;
    }
    try {
        let messageData = {};
        if (appState.selectedFile) {
            UIUtils.appendMessage('Sistema', 'Subiendo archivo...', false, true);
            const fileData = await FileUtils.uploadFile(appState.selectedFile);
            const fileInfo = JSON.stringify({
                name: fileData.name,
                size: fileData.size,
                type: fileData.type
            });
            const { encryptedMessage, iv } = await CryptoUtils.encryptAes(fileInfo, appState.activeChatKeys[appState.currentChatPartner]);
            messageData = {
                receiver: appState.currentChatPartner,
                encryptedMessage,
                iv,
                messageType: 'file',
                fileData: { name: fileData.name, size: fileData.size, type: fileData.type, data: fileData.data }
            };
            appState.socket.emit('private_message', messageData);
            UIUtils.appendFileMessage(appState.currentUser, fileData, true);
            FileUtils.cancelFileSelection();
        } else if (message) {
            const { encryptedMessage, iv } = await CryptoUtils.encryptAes(message, appState.activeChatKeys[appState.currentChatPartner]);
            messageData = {
                receiver: appState.currentChatPartner,
                encryptedMessage,
                iv,
                messageType: 'text'
            };
            appState.socket.emit('private_message', messageData);
            UIUtils.appendMessage(appState.currentUser, message, true);
        }
        DOM.messageInput.value = '';
    } catch (e) {
        UIUtils.appendMessage('Sistema', `Error enviando: ${e.message}`, false, true);
    }
});

DOM.clearChatBtn.addEventListener('click', UIUtils.clearMessages);
DOM.closeChatBtn.addEventListener('click', UIUtils.closeChat);

// Expose global functions
window.FileUtils = FileUtils;