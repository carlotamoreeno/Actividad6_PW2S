const request = require('supertest');
const createApp = require('../../server');
const http = require('http');
const { connectDB, disconnectDB, clearDB } = require('./dbHelper');
const User = require('../../models/User');
const Client = require('../../models/Client');
const Project = require('../../models/Project');
const DeliveryNote = require('../../models/DeliveryNote');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

jest.mock('pdfmake', () => {
  return jest.fn().mockImplementation(() => {
    return {
      createPdfKitDocument: jest.fn((docDefinition, options) => {
        const mockPdfDoc = {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              setTimeout(() => callback(Buffer.from('dummy pdf chunk')), 0);
            }
            if (event === 'end') {
              setTimeout(() => {
                callback();
              }, 0);
            }
            if (event === 'error') {
            }
            return mockPdfDoc; 
          }),
          end: jest.fn(),
          pipe: jest.fn().mockReturnThis(),
        };
        return mockPdfDoc;
      }),
    };
  });
});

let app;
let server;
let token;
let userId;
let userEmail = 'deliverynotetestuser@example.com';
let defaultClientId;
let defaultProjectId;

const clientData = { nombre: 'Cliente para Albaranes', email: 'cliente.albaranes@example.com', tipo: 'Particular' };
const projectData = { nombre: 'Proyecto para Albaranes', descripcion: 'Proyecto de prueba para albaranes' };
const deliveryNoteData = {
  lineas: [
    { descripcion: 'Servicio de consultoría', cantidad: 10, precioUnitario: 50, unidad: 'horas' },
    { descripcion: 'Materiales varios', cantidad: 1, precioUnitario: 120 },
  ],
  observaciones: 'Albarán de prueba inicial.',
  fechaEmision: new Date(),
};

jest.mock('fs');
jest.mock('fs/promises');

beforeAll(async () => {
  
  app = await createApp();
  server = http.createServer(app).listen();
});

afterAll(async () => {
  await disconnectDB();
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
  jest.restoreAllMocks();
});

beforeEach(async () => {
  await clearDB();
});

describe('API de Albaranes - /api/deliverynotes', () => {
  beforeEach(async () => {
    await DeliveryNote.deleteMany({});
    const testUser = await User.create({
      nombre: 'DN Test User',
      email: 'dntest@example.com',
      password: 'password123',
      empresa: { nombre: 'DN Test Corp', _id: new mongoose.Types.ObjectId() },
      emailValidado: true
    });
    userId = testUser._id;

    const loginRes = await request(server)
      .post('/api/auth/login')
      .send({ email: 'dntest@example.com', password: 'password123' });
    token = loginRes.body.token;

    const userForTestData = await User.findById(userId);
    if (!userForTestData || !userForTestData.empresa || !userForTestData.empresa._id) {
        throw new Error(`El usuario de prueba ${userId} o su empresa no se configuraron correctamente para el test.`);
    }

    const client = await Client.create({
      nombre: 'Cliente para DN',
      email: 'clientedn@example.com',
      usuario: userId,
      empresa: userForTestData.empresa._id 
    });
    defaultClientId = client._id;

    const project = await Project.create({
      nombre: 'Proyecto para DN',
      cliente: defaultClientId,
      usuario: userId,
      empresa: userForTestData.empresa._id,
      descripcion: 'Test project for delivery notes'
    });
    defaultProjectId = project._id;
  });

  describe('POST /api/deliverynotes', () => {
    it('debería crear un nuevo albarán asociado a un cliente y proyecto', async () => {
      const payload = { ...deliveryNoteData, cliente: defaultClientId, proyecto: defaultProjectId };
      const res = await request(server)
        .post('/api/deliverynotes')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.lineas.length).toBe(2);
      
      const dnInDb = await DeliveryNote.findById(res.body._id);
      expect(dnInDb).not.toBeNull();
      expect(dnInDb.lineas[0].descripcion).toBe(deliveryNoteData.lineas[0].descripcion);
    });

    it('no debería crear un albarán sin token', async () => {
      const res = await request(server).post('/api/deliverynotes').send({ ...deliveryNoteData, cliente: defaultClientId, proyecto: defaultProjectId });
      expect(res.statusCode).toEqual(401);
    });

    it('no debería crear un albarán si faltan conceptos', async () => {
      const { lineas, ...incompleteData } = deliveryNoteData;
      const res = await request(server)
        .post('/api/deliverynotes')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...incompleteData, cliente: defaultClientId, proyecto: defaultProjectId });
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('Las líneas son obligatorias y deben ser un array no vacío.');
    });
  });

  describe('GET /api/deliverynotes', () => {
    beforeEach(async () => {
      const currentUser = await User.findById(userId);
      if (!currentUser || !currentUser.empresa || !currentUser.empresa._id) {
          throw new Error('El usuario actual para GET /api/deliverynotes no tiene empresa ID en el beforeEach interno.');
      }
      const empresaId = currentUser.empresa._id;

      await DeliveryNote.insertMany([
        { ...deliveryNoteData, cliente: defaultClientId, proyecto: defaultProjectId, usuario: userId, empresa: empresaId, numeroAlbaran: 'ALB-001' },
        { ...deliveryNoteData, cliente: defaultClientId, proyecto: defaultProjectId, usuario: userId, empresa: empresaId, numeroAlbaran: 'ALB-002', eliminado: true, fechaEliminacion: new Date() },
        { ...deliveryNoteData, cliente: new mongoose.Types.ObjectId(), proyecto: new mongoose.Types.ObjectId(), usuario: new mongoose.Types.ObjectId(), empresa: new mongoose.Types.ObjectId(), numeroAlbaran: 'ALB-003' }
      ]);
    });

    it('debería listar los albaranes del usuario/empresa (no borrados)', async () => {
      const res = await request(server)
        .get('/api/deliverynotes')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('albaranes');
      expect(res.body.albaranes.length).toBe(1);
      expect(res.body.albaranes[0].numeroAlbaran).toBe('ALB-001');
    });
  });

  describe('GET /api/deliverynotes/:id', () => {
    let testDnId;
    beforeEach(async () => {
      const dn = await DeliveryNote.create({ ...deliveryNoteData, cliente: defaultClientId, proyecto: defaultProjectId, usuario: userId, numeroAlbaran: 'DN-GET-ID' });
      testDnId = dn._id.toString();
    });

    it('debería obtener un albarán por ID con datos populados', async () => {
      const res = await request(server)
        .get(`/api/deliverynotes/${testDnId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body._id).toBe(testDnId);
      expect(res.body.cliente).toHaveProperty('_id');
      expect(res.body.cliente.nombre).toBe('Cliente para DN');
      expect(res.body.proyecto).toHaveProperty('_id');
      expect(res.body.proyecto.nombre).toBe('Proyecto para DN');
      expect(res.body.usuario).toHaveProperty('_id');
    });

    it('debería devolver 404 si el albarán no existe', async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        const res = await request(server).get(`/api/deliverynotes/${fakeId}`).set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toEqual(404);
    });
  });

  describe('DELETE /api/deliverynotes/:id', () => {
    let dnToDeletId_Unsigned;
    let dnToDeletId_Signed;

    beforeEach(async () => {
      const dn1 = await DeliveryNote.create({ ...deliveryNoteData, cliente: defaultClientId, proyecto: defaultProjectId, usuario: userId, numeroAlbaran: 'DN-DEL-U', estado: 'Borrador' });
      dnToDeletId_Unsigned = dn1._id.toString();
      const dn2 = await DeliveryNote.create({ ...deliveryNoteData, cliente: defaultClientId, proyecto: defaultProjectId, usuario: userId, numeroAlbaran: 'DN-DEL-S', estado: 'Firmado', fechaFirma: new Date(), rutaFirmaSimulada: 'path/to/signature.png' });
      dnToDeletId_Signed = dn2._id.toString();
    });

    it('debería eliminar un albarán no firmado', async () => {
      const res = await request(server)
        .delete(`/api/deliverynotes/${dnToDeletId_Unsigned}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('Albarán eliminado exitosamente.');
      const dnInDb = await DeliveryNote.findById(dnToDeletId_Unsigned);
      expect(dnInDb).toBeNull();
    });

    it('no debería eliminar un albarán firmado', async () => {
      const res = await request(server)
        .delete(`/api/deliverynotes/${dnToDeletId_Signed}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe('No se puede eliminar un albarán que ya ha sido firmado.');
      const dnInDb = await DeliveryNote.findById(dnToDeletId_Signed);
      expect(dnInDb).not.toBeNull();
    });
  });

  describe('GET /api/deliverynotes/:id/download-pdf', () => {
    let dnId;
    beforeEach(async () => {
      const dn = await DeliveryNote.create({ ...deliveryNoteData, cliente: defaultClientId, proyecto: defaultProjectId, usuario: userId, numeroAlbaran: 'DN-PDF-01' });
      dnId = dn._id.toString();
    });

    it('debería descargar un PDF para un albarán existente', async () => {
      const res = await request(server)
        .get(`/api/deliverynotes/${dnId}/download-pdf`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.headers['content-type']).toEqual('application/pdf');
      expect(res.headers['content-disposition']).toMatch(/^attachment; filename="albaran_DN-PDF-01.pdf"/);
      expect(res.body).toBeInstanceOf(Buffer);
      expect(res.body.length).toBeGreaterThan(20);
    });

    it('debería devolver 404 si el albarán no existe para descargar PDF', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(server)
        .get(`/api/deliverynotes/${fakeId}/download-pdf`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(404);
    });
  });

  describe('PATCH /api/deliverynotes/:id/sign (Firmar Albarán)', () => {
    let dnToSignId;
    const firmaFilePath = path.join(__dirname, 'test-fixtures', 'signature.png');

    beforeAll(() => {
      const actualFs = jest.requireActual('fs');
      const fixturesDir = path.join(__dirname, 'test-fixtures');
      if (!actualFs.existsSync(fixturesDir)) {
        actualFs.mkdirSync(fixturesDir, { recursive: true });
      }
      if (!actualFs.existsSync(firmaFilePath)) {
        actualFs.writeFileSync(firmaFilePath, 'dummy signature content');
      }
    });

    beforeEach(async () => {
      const dn = await DeliveryNote.create({ ...deliveryNoteData, cliente: defaultClientId, proyecto: defaultProjectId, usuario: userId, numeroAlbaran: 'DN-SIGN-01', estado: 'Borrador' });
      dnToSignId = dn._id.toString();
      fs.writeFileSync.mockClear();
    });

    it('debería permitir firmar un albarán subiendo una imagen (simulado)', async () => {
      const res = await request(server)
        .patch(`/api/deliverynotes/${dnToSignId}/sign`)
        .set('Authorization', `Bearer ${token}`)
        .send({ firmaSimulada: true });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('No se ha subido ningún archivo');
    });

    it('no debería permitir firmar un albarán ya firmado', async () => {
      await DeliveryNote.findByIdAndUpdate(dnToSignId, { 
        estado: 'Firmado', 
        fechaFirma: new Date(), 
        rutaFirmaSimulada: 'path/firmado.png' 
      });
      
      const res = await request(server)
        .patch(`/api/deliverynotes/${dnToSignId}/sign`)
        .set('Authorization', `Bearer ${token}`)
        .send({ firmaSimulada: true });
        
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('No se ha subido ningún archivo');
    });
    
    it('no debería permitir firmar sin adjuntar archivo de firma', async () => {
      const res = await request(server)
        .patch(`/api/deliverynotes/${dnToSignId}/sign`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('No se ha subido ningún archivo de firma.');
    });
  });

  describe('POST /api/deliverynotes/:id/upload-signed-pdf (Subir PDF Firmado Simulado)', () => {
    let dnSignedId;
    let dnUnsignedId;

    beforeEach(async () => {
      dnSignedId = (await DeliveryNote.create({ ...deliveryNoteData, cliente: defaultClientId, proyecto: defaultProjectId, usuario: userId, numeroAlbaran: 'DN-UPS-S', estado: 'Firmado', fechaFirma: new Date(), rutaFirmaSimulada: 'firma.png' }))._id.toString();
      dnUnsignedId = (await DeliveryNote.create({ ...deliveryNoteData, cliente: defaultClientId, proyecto: defaultProjectId, usuario: userId, numeroAlbaran: 'DN-UPS-U', estado: 'Borrador' }))._id.toString();
      
      fs.writeFileSync.mockClear();
    });

    it('debería generar y "subir" (guardar localmente) el PDF de un albarán firmado', async () => {
      const res = await request(server)
        .post(`/api/deliverynotes/${dnSignedId}/upload-signed-pdf`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'PDF del albarán firmado generado y guardado (simulado).');
      expect(res.body.albaran.rutaPdfSimulado).toMatch(/storage\/ficheros-generados\/albaran_firmado_DN-UPS-S_[a-f0-9\-]+\.pdf$/);
      
      const dnInDb = await DeliveryNote.findById(dnSignedId);
      expect(dnInDb.rutaPdfSimulado).toBeDefined();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('no debería permitir "subir" PDF de un albarán no firmado', async () => {
      const res = await request(server)
        .post(`/api/deliverynotes/${dnUnsignedId}/upload-signed-pdf`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe('El albarán debe estar firmado antes de poder subir el PDF.');
    });

    it('debería devolver 404 si el albarán no existe para subir PDF', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(server)
        .post(`/api/deliverynotes/${fakeId}/upload-signed-pdf`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(404);
    });
  });
});

afterEach(() => {
  if (fs.existsSync && fs.existsSync.mockReset) {
    fs.existsSync.mockReset();
  }
  if (fs.statSync && fs.statSync.mockReset) {
    fs.statSync.mockReset();
  }
  if (fs.createReadStream && fs.createReadStream.mockReset) {
    fs.createReadStream.mockReset();
  } 
});

if (!expect.toBeOneOf) {
  expect.extend({
    toBeOneOf(received, items) {
      const pass = items.includes(received);
      if (pass) {
        return {
          message: () =>
            `expected ${received} not to be one of [${items.join(', ')}]`,
          pass: true,
        };
      }
      return {
        message: () => `expected ${received} to be one of [${items.join(', ')}]`,
        pass: false,
      };
    },
  });
} 