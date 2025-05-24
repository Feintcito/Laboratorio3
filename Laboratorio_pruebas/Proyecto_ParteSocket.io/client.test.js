/**
 * @jest-environment jsdom
 */

// Simular Socket.io client
const mockSocket = {
  emit: jest.fn(),
  on: jest.fn(),
  id: 'mock-socket-id'
};

global.io = jest.fn(() => mockSocket);

// Mock DOM elements
document.body.innerHTML = `
  <input id="username-input" />
  <button id="login-btn">Login</button>
  <input id="message-input" />
  <form id="chat-form">
    <input id="message-input" />
    <button type="submit">Send</button>
  </form>
  <div id="messages"></div>
`;

// Importar el código del cliente
require('./public/client.js');

describe('Client Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should emit register event when login button is clicked', () => {
    const usernameInput = document.getElementById('username-input');
    const loginBtn = document.getElementById('login-btn');
    
    usernameInput.value = 'testUser';
    loginBtn.click();
    
    expect(mockSocket.emit).toHaveBeenCalledWith('register', 'testUser');
  });

  test('should display message correctly', () => {
    const message = {
      id: 1,
      user: 'testUser',
      text: 'Hello, world!',
      timestamp: new Date().toISOString()
    };
    
    // Simular recepción de mensaje
    const messageHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'message'
    )[1];
    
    messageHandler(message);
    
    const messagesContainer = document.getElementById('messages');
    expect(messagesContainer.children.length).toBeGreaterThan(0);
  });

  test('should validate empty message input', () => {
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    
    messageInput.value = '';
    
    const submitEvent = new Event('submit');
    chatForm.dispatchEvent(submitEvent);
    
    expect(mockSocket.emit).not.toHaveBeenCalledWith('chatMessage', '');
  });
});