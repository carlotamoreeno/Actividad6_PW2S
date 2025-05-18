const { generarPdfAlbaran } = require('../../services/pdfService');
const logger = require('../../utils/logger');

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('Servicio de PDF - pdfService', () => {
  describe('generarPdfAlbaran', () => {
    const datosAlbaranEjemplo = {
      _id: 'testAlbaranId123',
      numeroAlbaran: 'ALB-TEST-001',
      fecha: new Date(),
      cliente: {
        _id: 'clientTestId',
        nombre: 'Cliente de Prueba Unitario',
        nombreComercial: 'Cliente Prueba Unitario S.L.',
        direccion: 'Calle Ficticia 123, Ciudad Test'
      },
      proyecto: {
        _id: 'projectTestId',
        nombre: 'Proyecto de Prueba Unitario'
      },
      conceptos: [
        { descripcion: 'Concepto 1', cantidad: 2, precioUnitario: 50 },
        { descripcion: 'Concepto 2', cantidad: 1, precioUnitario: 100, unidad: 'hrs' },
      ],
      observaciones: 'Este es un albarán de prueba unitaria.',
    };

    it('debería generar un Buffer de PDF para datos de albarán válidos', async () => {
      const pdfBuffer = await generarPdfAlbaran(datosAlbaranEjemplo);
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('debería llamar a logger.info al iniciar y al finalizar exitosamente', async () => {
      await generarPdfAlbaran(datosAlbaranEjemplo);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Iniciando generación de PDF para albarán ID: ALB-TEST-001'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('PDF generado exitosamente para albarán ID: ALB-TEST-001'));
    });

    it('debería manejar datos de albarán mínimos (solo campos requeridos o con defaults en el servicio)', async () => {
      const datosMinimos = {
        _id: 'minAlbaranId',
      };
      const pdfBuffer = await generarPdfAlbaran(datosMinimos);
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('debería rechazar la promesa si ocurre un error interno en pdfmake (simulado)', async () => {
      const datosConError = { ...datosAlbaranEjemplo, _id: 'errorCase' };
      
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const loggerErrorSimulado = new Error('Error de logger simulado durante PDF');
      logger.info.mockImplementationOnce(() => { throw loggerErrorSimulado; });

      await expect(generarPdfAlbaran(datosConError)).rejects.toThrow('Error de logger simulado durante PDF');
      
      console.error = originalConsoleError;
      logger.info.mockReset();
      logger.error.mockReset();
    });

    it('debería generar PDF cuando cliente y proyecto son nulos', async () => {
        const datosSinClienteProyecto = {
            _id: 'noClienteProyectoId',
            numeroAlbaran: 'ALB-NCP-001',
            fecha: new Date(),
            cliente: null,
            proyecto: null,
            conceptos: [{descripcion: 'Test', cantidad: 1, precioUnitario: 10}],
        };
        const pdfBuffer = await generarPdfAlbaran(datosSinClienteProyecto);
        expect(pdfBuffer).toBeInstanceOf(Buffer);
        expect(pdfBuffer.length).toBeGreaterThan(0);
        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('PDF generado exitosamente para albarán ID: ALB-NCP-001'));
    });

  });
}); 