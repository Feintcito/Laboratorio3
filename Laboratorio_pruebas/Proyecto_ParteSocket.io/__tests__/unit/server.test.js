// __tests__/unit/server.test.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock para simular la base de datos si fuera necesario para tests unitarios más complejos
// Para estos ejemplos simples de bcrypt/jwt, no lo necesitamos
// const sqlite3 = require('sqlite3').verbose();
// jest.mock('sqlite3', () => {
//   const mDatabase = {
//     get: jest.fn(),
//     run: jest.fn(),
//     close: jest.fn(),
//   };
//   return {
//     verbose: () => ({
//       Database: jest.fn(() => mDatabase),
//     }),
//   };
// });

describe('Backend Unit Tests', () => {
  const JWT_SECRET = 'test_jwt_secret'; // Usa un secreto de prueba para Jest

  describe('Bcrypt Hashing', () => {
    test('should correctly hash and compare passwords', async () => {
      const password = 'mySecretPassword123';
      const hashedPassword = await bcrypt.hash(password, 10);
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password); // Hashed password should not be plain text

      const isMatch = await bcrypt.compare(password, hashedPassword);
      expect(isMatch).toBe(true);

      const isMismatch = await bcrypt.compare('wrongPassword', hashedPassword);
      expect(isMismatch).toBe(false);
    });
  });

  describe('JWT Token', () => {
    test('should generate and verify a valid token', () => {
      const payload = { id: 1, username: 'testuser' };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
      expect(token).toBeDefined();

      const decoded = jwt.verify(token, JWT_SECRET);
      expect(decoded.id).toBe(payload.id);
      expect(decoded.username).toBe(payload.username);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    test('should throw error for invalid token', () => {
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJ0ZXN0dXNlciIsImlhdCI6MTY3ODgyNzYwMCwiZXhwIjoxNjc4ODI4MDAwfQ.invalid_signature';
      expect(() => jwt.verify(invalidToken, JWT_SECRET)).toThrow();
    });

    test('should throw error for expired token', () => {
      const expiredToken = jwt.sign({ id: 1, username: 'testuser' }, JWT_SECRET, { expiresIn: '0s' });
      // Wait a bit for the token to actually expire
      return new Promise(resolve => setTimeout(() => {
        expect(() => jwt.verify(expiredToken, JWT_SECRET)).toThrow('jwt expired');
        resolve();
      }, 100)); // Give it 100ms to expire
    });
  });
});