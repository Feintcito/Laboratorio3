// __tests__/e2e/chat.e2e.test.js
const { test, expect } = require('@playwright/test');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuración de la URL base para el servidor de prueba
const BASE_URL = 'https://localhost:3000';
const DB_PATH = path.resolve(__dirname, '../../database.db');
let serverProcess;

// Limpiar la base de datos y asegurar que el servidor esté listo
test.beforeAll(async ({ request }) => {
    // 1. Asegurarse de que la base de datos esté limpia
    if (fs.existsSync(DB_PATH)) {
        fs.unlinkSync(DB_PATH);
        console.log('Cleaned up database.db before E2E tests.');
    }

    // 2. Iniciar el servidor Node.js en un proceso separado
    // Asegúrate de que tu `server.js` usa https
    serverProcess = spawn('node', ['server.js'], { cwd: path.resolve(__dirname, '../../') });

    serverProcess.stdout.on('data', (data) => {
        // console.log(`SERVER_STDOUT: ${data}`); // Descomentar para ver logs del servidor
    });
    serverProcess.stderr.on('data', (data) => {
        console.error(`SERVER_STDERR: ${data}`); // Mostrar errores del servidor
    });

    // Esperar a que el servidor esté listo (puedes ajustar el mensaje de log)
    await new Promise((resolve, reject) => {
        serverProcess.stdout.on('data', (data) => {
            if (data.toString().includes('Servidor HTTPS escuchando en')) {
                console.log('Server started for E2E tests.');
                resolve();
            }
        });
        serverProcess.on('error', (err) => reject(err));
        serverProcess.on('exit', (code) => {
            if (code !== 0 && code !== null) reject(new Error(`Server exited with code ${code}`));
        });
        // Timeout si el servidor no inicia
        setTimeout(() => reject(new Error('Server did not start in time.')), 30000); // 30 segundos de espera
    });

    // Pequeño retardo adicional para asegurar que Socket.IO esté completamente levantado
    await new Promise(resolve => setTimeout(resolve, 1000));
});

// Detener el servidor después de todas las pruebas
test.afterAll(async () => {
    if (serverProcess) {
        console.log('Stopping server process...');
        serverProcess.kill(); // Terminar el proceso del servidor
        await new Promise(resolve => setTimeout(resolve, 1000)); // Dar tiempo para que se cierre
    }
});

test.describe('Secure Chat Application E2E Tests', () => {

    test('should allow two users to register, login, chat securely, and see online users', async ({ browser }) => {
        // --- Usuario 1 (Page 1) ---
        const page1 = await browser.newPage();
        await page1.goto(BASE_URL, {
            waitUntil: 'networkidle',
            // IGNORAR ERRORES DE SSL para certificados autofirmados
            ignoreHTTPSErrors: true
        });

        // Asegurarse de que la API de criptografía esté disponible
        const cryptoApiAvailable1 = await page1.evaluate(() => {
            return typeof window.crypto !== 'undefined' && typeof window.crypto.subtle !== 'undefined';
        });
        expect(cryptoApiAvailable1).toBe(true);

        const user1 = 'e2eUser1_' + Date.now();
        const password = 'e2ePassword123';

        await page1.fill('#username', user1);
        await page1.fill('#password', password);
        await page1.click('#register-btn');
        await expect(page1.locator('#auth-message')).toContainText('Usuario registrado exitosamente.');

        await page1.click('#login-btn');
        await expect(page1.locator('#auth-message')).toContainText('Login exitoso.');
        await expect(page1.locator('#current-user')).toContainText(user1);
        await expect(page1.locator('#chat-section')).toBeVisible();

        // Esperar a que la clave pública se envíe al servidor (log en consola)
        await page1.waitForFunction(() => console.log('Enviando clave pública RSA al servidor...')); // Busca un log específico
        // Dar tiempo para que la clave se procese en el servidor
        await page1.waitForTimeout(500);


        // --- Usuario 2 (Page 2) ---
        const page2 = await browser.newPage();
        await page2.goto(BASE_URL, {
            waitUntil: 'networkidle',
            ignoreHTTPSErrors: true
        });

        const cryptoApiAvailable2 = await page2.evaluate(() => {
            return typeof window.crypto !== 'undefined' && typeof window.crypto.subtle !== 'undefined';
        });
        expect(cryptoApiAvailable2).toBe(true);

        const user2 = 'e2eUser2_' + Date.now();
        await page2.fill('#username', user2);
        await page2.fill('#password', password);
        await page2.click('#register-btn');
        await expect(page2.locator('#auth-message')).toContainText('Usuario registrado exitosamente.');

        await page2.click('#login-btn');
        await expect(page2.locator('#auth-message')).toContainText('Login exitoso.');
        await expect(page2.locator('#current-user')).toContainText(user2);
        await expect(page2.locator('#chat-section')).toBeVisible();

        await page2.waitForFunction(() => console.log('Enviando clave pública RSA al servidor...'));
        await page2.waitForTimeout(500);

        // Verificar usuarios online
        await expect(page1.locator('#online-users')).toContainText(user2);
        await expect(page2.locator('#online-users')).toContainText(user1);


        // --- Iniciar chat desde User1 ---
        await page1.fill('#target-user', user2);
        await page1.click('#start-chat-btn');
        await expect(page1.locator('#chat-partner')).toContainText(user2);
        await expect(page1.locator('#private-chat-window')).toBeVisible();
        await expect(page1.locator('#message-input')).toBeDisabled(); // Deshabilitado hasta intercambio de claves

        // Esperar mensajes de sistema en la consola de User1 que indiquen el intercambio de claves
        await page1.waitForFunction(
            (partner) => document.querySelector('#messages').innerText.includes(`Solicitando clave pública de ${partner}...`),
            user2
        );
        // Esperar el mensaje de inicio de chat seguro
        await page1.waitForFunction(
            (partner) => document.querySelector('#messages').innerText.includes(`Iniciando chat seguro con ${partner}...`),
            user2
        );

        // Esperar mensajes de sistema en la consola de User2 que indiquen la recepción y descifrado de la clave
        await page2.waitForFunction(
            (partner) => document.querySelector('#messages').innerText.includes(`Chat seguro establecido con ${partner}.`),
            user1
        );

        // Verificar que el input de mensaje se habilita para ambos
        await expect(page1.locator('#message-input')).toBeEnabled();
        await expect(page2.locator('#message-input')).toBeEnabled();

        // --- User1 envía un mensaje ---
        const message1 = "¡Hola User2, soy User1!";
        await page1.fill('#message-input', message1);
        await page1.click('#send-message-btn');
        await expect(page1.locator('#messages')).toContainText(`e2eUser1: ${message1}`);

        // --- User2 recibe el mensaje y responde ---
        await expect(page2.locator('#messages')).toContainText(`e2eUser1: ${message1}`); // User2 ve el mensaje de User1

        const message2 = "¡Hola User1, soy User2!";
        await page2.fill('#message-input', message2);
        await page2.click('#send-message-btn');
        await expect(page2.locator('#messages')).toContainText(`e2eUser2: ${message2}`);

        // --- User1 recibe el mensaje de User2 ---
        await expect(page1.locator('#messages')).toContainText(`e2eUser2: ${message2}`);

        console.log('E2E Test completed successfully: Users chatted securely.');
    });

    test('should show error if target user not found or no public key', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'networkidle', ignoreHTTPSErrors: true });
        const user = 'testUserNotFound_' + Date.now();
        await page.fill('#username', user);
        await page.fill('#password', 'password');
        await page.click('#register-btn');
        await page.click('#login-btn');
        await expect(page.locator('#chat-section')).toBeVisible();

        await page.fill('#target-user', 'nonExistentUser');
        await page.click('#start-chat-btn');

        await expect(page.locator('#messages')).toContainText('Error del servidor: Clave pública no encontrada para nonExistentUser');
        await expect(page.locator('#message-input')).toBeDisabled();
    });
});