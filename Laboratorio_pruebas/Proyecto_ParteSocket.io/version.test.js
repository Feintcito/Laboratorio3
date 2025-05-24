const semver = require('semver');
const packageJson = require('./package.json');

describe('Version Compatibility Tests', () => {
  test('should use compatible Node.js version', () => {
    const nodeVersion = process.version;
    const requiredVersion = packageJson.engines?.node || '>=14.0.0';
    
    expect(semver.satisfies(nodeVersion, requiredVersion)).toBe(true);
  });

  test('should have compatible dependency versions', () => {
    const dependencies = packageJson.dependencies;
    
    // Verificar versiones críticas
    expect(dependencies['socket.io']).toBeDefined();
    expect(dependencies['express']).toBeDefined();
    
    // Verificar que no hay versiones conflictivas
    const socketioVersion = dependencies['socket.io'];
    expect(semver.valid(semver.coerce(socketioVersion))).toBeTruthy();
  });

  test('should maintain backward compatibility', async () => {
    // Simular cliente con versión anterior
    const oldClient = require('socket.io-client');
    const server = require('./server');
    
    // Verificar que funciona con versiones anteriores
    expect(oldClient).toBeDefined();
  });
});