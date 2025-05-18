const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.test') });

let mongoServer;

jest.setTimeout(60000);

process.env.JWT_SECRET = process.env.JWT_SECRET || '81d9cccdf76862a4d674b16dd8bb7f26dbe99851af0a6606789f0271fad57ff5';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
process.env.PASSWORD_RESET_EXPIRES = process.env.PASSWORD_RESET_EXPIRES || '10m';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
process.env.NODE_ENV = 'test';

const firmasStorageDir = path.resolve(__dirname, '..', 'storage', 'firmas');
if (!fs.existsSync(firmasStorageDir)) {
  try {
    fs.mkdirSync(firmasStorageDir, { recursive: true });
    console.log(`[TESTS SETUP] Directorio de almacenamiento para firmas creado en: ${firmasStorageDir}`);
  } catch (err) {
    console.error(`[TESTS SETUP] Error creando directorio ${firmasStorageDir}:`, err);
  }
}

let dbConnection = null;

beforeAll(async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('[setup.js] Ya existe una conexión a MongoDB, reutilizando');
      return;
    }
    
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    process.env.MONGODB_URI_FOR_TESTS = mongoUri;
    process.env.MONGODB_URI = mongoUri;
    
    dbConnection = await mongoose.connect(mongoUri);
    console.log(`MongoDB Memory Server (setup.js) iniciado en: ${mongoUri}`);
  } catch (e) {
    console.error("Error conectando a MongoMemoryServer en setup.js:", e);
    throw e;
  }
}, 90000);

afterAll(async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    if (mongoServer) {
      await mongoServer.stop();
      mongoServer = null;
    }
    
    console.log('Conexión a MongoDB Memory Server (setup.js) cerrada correctamente');
  } catch (e) {
    console.error("Error desconectando MongoMemoryServer en setup.js:", e);
  }
}, 90000);

afterEach(async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
    }
  } catch (error) {
    console.error('Error al limpiar colecciones en afterEach:', error);
  }
}, 30000); 