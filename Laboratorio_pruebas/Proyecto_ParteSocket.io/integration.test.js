const request = require('supertest');
const http = require('http');
const socketIO = require('socket.io');
const Client = require('socket.io-client');

describe('Socket.io Integration Tests', () => {
  let server;
  let io;
  let clientSocket1;
  let clientSocket2;

  beforeAll((done) => {
    const app = require('./server');
    server = http.createServer(app);
    io = socketIO(server);
    
    server.listen(() => {
      const port = server.address().port;
      clientSocket1 = new Client(`http://localhost:${port}`);
      clientSocket2 = new Client(`http://localhost:${port}`);
      
      let connectionsCount = 0;
      const checkDone = () => {
        connectionsCount++;
        if (connectionsCount === 2) done();
      };
      
      clientSocket1.on('connect', checkDone);
      clientSocket2.on('connect', checkDone);
    });
  });

  afterAll(() => {
    server.close();
    clientSocket1.close();
    clientSocket2.close();
  });

  test('should handle multiple users in the same room', (done) => {
    const roomName = 'testRoom';
    let messagesReceived = 0;
    
    // Usuario 1 se registra y se une a la sala
    clientSocket1.emit('register', 'user1');
    clientSocket1.emit('joinRoom', roomName);
    
    // Usuario 2 se registra y se une a la sala
    clientSocket2.emit('register', 'user2');
    clientSocket2.emit('joinRoom', roomName);
    
    // Usuario 1 envía un mensaje
    setTimeout(() => {
      clientSocket1.emit('chatMessage', 'Hello from user1');
    }, 100);
    
    // Ambos usuarios deberían recibir el mensaje
    clientSocket1.on('message', (data) => {
      expect(data.text).toBe('Hello from user1');
      messagesReceived++;
      if (messagesReceived === 2) done();
    });
    
    clientSocket2.on('message', (data) => {
      expect(data.text).toBe('Hello from user1');
      messagesReceived++;
      if (messagesReceived === 2) done();
    });
  });

  test('should handle typing indicators', (done) => {
    clientSocket1.emit('typing', true);
    
    clientSocket2.on('userTyping', (data) => {
      expect(data.isTyping).toBe(true);
      expect(data.username).toBe('user1');
      done();
    });
  });

  test('should handle user disconnection', (done) => {
    const tempClient = new Client(`http://localhost:${server.address().port}`);
    
    tempClient.on('connect', () => {
      tempClient.emit('register', 'tempUser');
      tempClient.emit('joinRoom', 'testRoom');
      
      setTimeout(() => {
        tempClient.close();
      }, 100);
    });
    
    clientSocket1.on('userLeft', (data) => {
      expect(data.username).toBe('tempUser');
      done();
    });
  });
});