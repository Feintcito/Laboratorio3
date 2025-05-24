const request = require('supertest');
const http = require('http');
const socketIO = require('socket.io');
const Client = require('socket.io-client');

describe('Socket.io Server Unit Tests', () => {
  let server;
  let io;
  let clientSocket;

  beforeAll((done) => {
    const app = require('./server');
    server = http.createServer(app);
    io = socketIO(server);
    
    server.listen(() => {
      const port = server.address().port;
      clientSocket = new Client(`http://localhost:${port}`);
      
      io.on('connection', (socket) => {
        socket.on('register', (username) => {
          socket.emit('registered', { id: socket.id, username });
        });
      });
      
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    server.close();
    clientSocket.close();
  });

  test('should register user correctly', (done) => {
    const testUsername = 'testUser';
    
    clientSocket.emit('register', testUsername);
    
    clientSocket.on('registered', (data) => {
      expect(data.username).toBe(testUsername);
      expect(data.id).toBeDefined();
      done();
    });
  });

  test('should handle chat messages', (done) => {
    const testMessage = 'Hello, world!';
    
    clientSocket.emit('chatMessage', testMessage);
    
    clientSocket.on('message', (data) => {
      expect(data.text).toBe(testMessage);
      expect(data.timestamp).toBeDefined();
      done();
    });
  });

  test('should handle room joining', (done) => {
    const roomName = 'testRoom';
    
    clientSocket.emit('joinRoom', roomName);
    
    clientSocket.on('roomHistory', (messages) => {
      expect(Array.isArray(messages)).toBe(true);
      done();
    });
  });
});