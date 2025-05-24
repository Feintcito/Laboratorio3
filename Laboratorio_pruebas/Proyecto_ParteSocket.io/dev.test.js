const { spawn } = require('child_process');
const request = require('supertest');

describe('Development Environment Tests', () => {
  test('should start server without errors', (done) => {
    const server = spawn('node', ['server.js'], {
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    let output = '';
    server.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('Servidor ejecutándose')) {
        server.kill();
        done();
      }
    });
    
    server.stderr.on('data', (data) => {
      console.error(`Error: ${data}`);
      server.kill();
      done(new Error(`Server failed to start: ${data}`));
    });
    
    setTimeout(() => {
      server.kill();
      done(new Error('Server timeout'));
    }, 10000);
  });

  test('should serve static files', async () => {
    const app = require('./server');
    const response = await request(app).get('/');
    
    expect(response.status).toBe(200);
    expect(response.text).toContain('<!DOCTYPE html>');
  });

  test('should handle invalid routes', async () => {
    const app = require('./server');
    const response = await request(app).get('/nonexistent');
    
    expect(response.status).toBe(404);
  });
});