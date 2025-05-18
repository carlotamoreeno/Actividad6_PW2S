const logger = require('../../utils/logger');

describe('Utilidad de Logger - logger.js', () => {
  it('debería exportar un objeto logger con métodos info, warn, y error', () => {
    expect(logger).toBeInstanceOf(Object);
    expect(logger.info).toBeInstanceOf(Function);
    expect(logger.warn).toBeInstanceOf(Function);
    expect(logger.error).toBeInstanceOf(Function);
  });

  it('el método logger.info() debería ejecutarse sin errores', () => {
    expect(() => logger.info('Mensaje de prueba para info')).not.toThrow();
  });

  it('el método logger.warn() debería ejecutarse sin errores', () => {
    expect(() => logger.warn('Mensaje de prueba para warn')).not.toThrow();
  });

  it('el método logger.error() debería ejecutarse sin errores', () => {
    expect(() => logger.error('Mensaje de prueba para error')).not.toThrow();
  });

  it('el método logger.error() debería poder loguear un objeto Error', () => {
    expect(() => logger.error('Error con objeto:', new Error('Error de prueba'))).not.toThrow();
  });

}); 