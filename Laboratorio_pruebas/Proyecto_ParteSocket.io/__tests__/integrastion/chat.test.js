
// __tests__/integration/chat.test.js
const { createServer } = require('https');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const fs = require('fs');
const sqlite3 = require('sqlite3'); // No verbose, solo para el setup/teardown
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Importa las funciones del cliente que quieres probar.
// Esto asume que client.js está diseñado para ser importable o que estas funciones están expuestas globalmente en un JSDOM
// Para un test de integración, a menudo necesitas re-implementar o mockear las funciones de window.crypto.subtle
// Aquí, para simplificar, usaremos mocks para Web Crypto API si solo probamos la lógica del chat.
// Si quieres probar la criptografía de punta a punta en Jest, es más complejo y requeriría JSDOM completo o un polyfill.
// Para este ejemplo, mocaremos las llamadas a window.crypto.subtle en el cliente para centrarnos en el flujo de Socket.IO.

// Mock global para window.crypto.subtle para que client.js no falle en Jest
const mockCryptoSubtle = {
  generateKey: jest.fn(() => Promise.resolve({
    publicKey: 'mockPublicKeyObject',
    privateKey: 'mockPrivateKeyObject'
  })),
  exportKey: jest.fn(() => Promise.resolve(new ArrayBuffer(0))), // Mock a Buffer vacío
  importKey: jest.fn(() => Promise.resolve('mockKeyObject')),
  encrypt: jest.fn(() => Promise.resolve(new ArrayBuffer(0))),
  decrypt: jest.fn(() => Promise.resolve(new TextEncoder().encode('decrypted message').buffer)),
  wrapKey: jest.fn(() => Promise.resolve(new ArrayBuffer(0))),
  unwrapKey: jest.fn(() => Promise.resolve('mockAesKeyObject')),
};

const mockCrypto = {
    subtle: mockCryptoSubtle,
    getRandomValues: jest.fn(() => new Uint8Array(12)), // Mock para IV
};

Object.defineProperty(global, 'window', {
    value: {
        crypto: mockCrypto,
        TextEncoder: TextEncoder, // Necesario para TextEncoder
        TextDecoder: TextDecoder, // Necesario para TextDecoder
        atob: global.atob, // atob/btoa están en Node.js 16+
        btoa: global.btoa,
    }
});

// Importar el client.js después de mockear window.crypto
const {
    generateRsaKeyPair, exportPublicKeyAsPem, importPublicKeyFromPem,
    generateAesKey, encryptAes, decryptAes,
    wrapAesKey, unwrapAesKey
} = require('../../public/client'); // Ajusta la ruta si es necesario

// Mock del módulo del servidor para la función 'io.use' y 'io.on'
// Esto evita cargar todo el Express y HTTP/HTTPS server real.
// Para una prueba de integración más "real", iniciaríamos el servidor completo.
// Pero para aislar la lógica de Socket.IO, mockearlo es útil.

// Vamos a crear una instancia real del servidor para este test
let io;
let httpServer;
let clientSocket1;
let clientSocket2;
let db;

const DB_PATH = './test_database.db'; // Usa una DB de prueba para no borrar la real

// Certificados para el servidor de prueba HTTPS
const httpsOptions = {
    key: fs.readFileSync('./key.pem'),
    cert: fs.readFileSync('./cert.pem')
};

const JWT_SECRET = 'test_jwt_secret_integration'; // Secreto JWT para pruebas de integración

beforeAll((done) => {
    // Limpiar y configurar la DB de prueba
    if (fs.existsSync(DB_PATH)) {
        fs.unlinkSync(DB_PATH);
    }
    db = new sqlite3.Database(DB_PATH);
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            publicKey TEXT
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender TEXT,
            receiver TEXT,
            encryptedMessage TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, done); // Llama a done cuando la DB esté lista
    });

    // Iniciar el servidor Socket.IO de prueba
    httpServer = createServer(httpsOptions); // Crea un servidor HTTPS
    io = new Server(httpServer);

    // Mockear la lógica de autenticación JWT del servidor
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication required.'));
        }
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (err) {
            next(new Error('Invalid token.'));
        }
    });

    // Cargar y adjuntar la lógica del servidor de Socket.IO real
    // En un proyecto real, separamos la lógica de Socket.IO en un módulo
    // para poder importarlo y adjuntarlo a la instancia de 'io' de prueba.
    // Para este ejemplo, copiaremos/adaptaremos partes relevantes aquí.
    const connectedUsers = {};

    io.on('connection', (socket) => {
        connectedUsers[socket.user.username] = socket.id;
        io.emit('online_users', Object.keys(connectedUsers));

        socket.on('send_public_key', (publicKey) => {
            db.run('UPDATE users SET publicKey = ? WHERE username = ?', [publicKey, socket.user.username]);
        });

        socket.on('request_public_key', (targetUsername) => {
            db.get('SELECT publicKey FROM users WHERE username = ?', [targetUsername], (err, row) => {
                if (row && row.publicKey) {
                    socket.emit('receive_public_key', { username: targetUsername, publicKey: row.publicKey });
                }
            });
        });

        socket.on('private_message', (data) => {
            const { receiver, encryptedMessage, iv } = data;
            const sender = socket.user.username;
            if (connectedUsers[receiver]) {
                io.to(connectedUsers[receiver]).emit('private_message', { sender, encryptedMessage, iv });
            }
            db.run('INSERT INTO messages (sender, receiver, encryptedMessage) VALUES (?, ?, ?)', [sender, receiver, encryptedMessage]);
        });

        socket.on('disconnect', () => {
            delete connectedUsers[socket.user.username];
            io.emit('online_users', Object.keys(connectedUsers));
        });
    });

    httpServer.listen(4000, () => { // Puerto de prueba para Socket.IO
        done();
    });
});

afterAll((done) => {
    io.close();
    httpServer.close(() => {
        if (db) {
            db.close(() => {
                if (fs.existsSync(DB_PATH)) {
                    fs.unlinkSync(DB_PATH); // Limpia la DB de prueba
                }
                done();
            });
        } else {
            done();
        }
    });
});

describe('Chat Integration Tests', () => {
    beforeEach(() => {
        // Reinicia los mocks de crypto antes de cada test para aislar los estados
        for (const key in mockCryptoSubtle) {
            if (typeof mockCryptoSubtle[key] === 'function') {
                mockCryptoSubtle[key].mockClear();
            }
        }
        mockCrypto.getRandomValues.mockClear();
    });

    test('should allow two users to connect and exchange keys and messages', async () => {
        const user1 = { username: 'user1', password: 'password1' };
        const user2 = { username: 'user2', password: 'password2' };

        // 1. Registrar usuarios (simulando API de registro)
        const hashedPassword1 = await bcrypt.hash(user1.password, 10);
        await new Promise((resolve, reject) => {
            db.run('INSERT INTO users (username, password) VALUES (?, ?)', [user1.username, hashedPassword1], (err) => {
                if (err) reject(err); else resolve();
            });
        });

        const hashedPassword2 = await bcrypt(user2.password, 10);
        await new Promise((resolve, reject) => {
            db.run('INSERT INTO users (username, password) VALUES (?, ?)', [user2.username, hashedPassword2], (err) => {
                if (err) reject(err); else resolve();
            });
        });

        // 2. Generar tokens JWT para la conexión de Socket.IO
        const token1 = jwt.sign({ id: 1, username: user1.username }, JWT_SECRET, { expiresIn: '1h' });
        const token2 = jwt.sign({ id: 2, username: user2.username }, JWT_SECRET, { expiresIn: '1h' });

        // 3. Conectar clientes Socket.IO
        clientSocket1 = Client('https://localhost:4000', {
            rejectUnauthorized: false, // NECESARIO para certificados autofirmados
            auth: { token: token1 },
            transports: ['websocket'],
        });

        clientSocket2 = Client('https://localhost:4000', {
            rejectUnauthorized: false, // NECESARIO para certificados autofirmados
            auth: { token: token2 },
            transports: ['websocket'],
        });

        // Esperar conexiones
        await new Promise(resolve => clientSocket1.on('connect', resolve));
        await new Promise(resolve => clientSocket2.on('connect', resolve));

        expect(clientSocket1.connected).toBe(true);
        expect(clientSocket2.connected).toBe(true);

        // Esperar lista de usuarios online
        let onlineUsers1 = [];
        let onlineUsers2 = [];
        clientSocket1.on('online_users', (users) => { onlineUsers1 = users; });
        clientSocket2.on('online_users', (users) => { onlineUsers2 = users; });
        await new Promise(resolve => setTimeout(resolve, 100)); // Give time for online_users event

        expect(onlineUsers1).toContain(user2.username);
        expect(onlineUsers2).toContain(user1.username);

        // 4. Generar y enviar claves públicas RSA (mockeadas)
        const user1PublicKeyPem = await generateRsaKeyPair(); // Llama al mock
        const user2PublicKeyPem = await generateRsaKeyPair(); // Llama al mock

        clientSocket1.emit('send_public_key', user1PublicKeyPem);
        clientSocket2.emit('send_public_key', user2PublicKeyPem);

        // Esperar que las claves se guarden en DB (asíncrono)
        await new Promise(resolve => setTimeout(resolve, 100));

        // 5. User1 solicita clave pública de User2
        clientSocket1.emit('request_public_key', user2.username);

        // Esperar que User1 reciba la clave pública de User2
        let receivedPublicKeyData = null;
        clientSocket1.on('receive_public_key', (data) => {
            receivedPublicKeyData = data;
        });
        await new Promise(resolve => setTimeout(resolve, 100)); // Dar tiempo para el evento

        expect(receivedPublicKeyData).toBeDefined();
        expect(receivedPublicKeyData.username).toBe(user2.username);
        expect(receivedPublicKeyData.publicKey).toBe(user2PublicKeyPem);

        // Simular el proceso de intercambio de clave AES y envío de mensaje
        // Esto es donde los mocks de crypto.subtle entran en juego
        const mockAesKey = 'mock_aes_key_object';
        mockCryptoSubtle.generateKey.mockResolvedValueOnce(mockAesKey); // Mock para la generación de AES Key de user1

        const wrappedAesKeyMock = 'mock_wrapped_aes_key';
        mockCryptoSubtle.wrapKey.mockResolvedValueOnce(new ArrayBuffer(10)); // mock wrapKey a buffer
        global.window.btoa.mockReturnValueOnce(wrappedAesKeyMock); // Mock btoa para la clave envuelta

        // User1 "envuelve" la clave AES y la envía como 'KEY_EXCHANGE'
        await importPublicKeyFromPem(receivedPublicKeyData.publicKey); // Importa la clave pública del otro usuario (mock)
        const aesKeyUser1 = await generateAesKey(); // Genera la clave AES (mock)
        const wrappedKeyPayload = await wrapAesKey(aesKeyUser1, 'mockPublicKeyObject'); // Envuelve la clave (mock)

        // Mock para la recepción y desenvolvimiento de la clave AES por user2
        mockCryptoSubtle.unwrapKey.mockResolvedValueOnce(mockAesKey); // Mock para el unwrap de User2

        const user2ReceivedMessages = [];
        clientSocket2.on('private_message', (data) => {
            user2ReceivedMessages.push(data);
        });

        clientSocket1.emit('private_message', {
            receiver: user2.username,
            encryptedMessage: wrappedKeyPayload,
            iv: 'KEY_EXCHANGE'
        });

        await new Promise(resolve => setTimeout(resolve, 100)); // Dar tiempo para el evento

        expect(user2ReceivedMessages.length).toBe(1);
        expect(user2ReceivedMessages[0].iv).toBe('KEY_EXCHANGE');
        expect(user2ReceivedMessages[0].encryptedMessage).toBe(wrappedKeyPayload);

        // Simular que user2 "desenvuelve" la clave AES
        await unwrapAesKey(user2ReceivedMessages[0].encryptedMessage, 'mockPrivateKeyObject'); // Desenvuelve (mock)

        // Ahora, User1 envía un mensaje de chat real
        const message = "Hello from User1!";
        const { encryptedMessage: encryptedMsg1, iv: iv1 } = await encryptAes(message, aesKeyUser1); // Cifra (mock)

        clientSocket1.emit('private_message', {
            receiver: user2.username,
            encryptedMessage: encryptedMsg1,
            iv: iv1
        });

        await new Promise(resolve => setTimeout(resolve, 100)); // Dar tiempo para el evento

        expect(user2ReceivedMessages.length).toBe(2);
        expect(user2ReceivedMessages[1].sender).toBe(user1.username);
        expect(user2ReceivedMessages[1].iv).toBe(iv1);
        expect(user2ReceivedMessages[1].encryptedMessage).toBe(encryptedMsg1);

        // Simular que User2 descifra el mensaje
        const decryptedMsg2 = await decryptAes(encryptedMsg1, iv1, mockAesKey);
        expect(decryptedMsg2).toBe('decrypted message'); // Debido al mock de decryptAes

        // Limpiar
        clientSocket1.disconnect();
        clientSocket2.disconnect();
    }, 10000); // Aumenta el timeout para pruebas asíncronas
});