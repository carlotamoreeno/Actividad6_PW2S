const mongoose = require('mongoose');
const User = require('../../models/User');
const Client = require('../../models/Client');
const Project = require('../../models/Project');
const DeliveryNote = require('../../models/DeliveryNote');
const Invitation = require('../../models/Invitation');

const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    console.warn('[dbHelper] connectDB: Se esperaba que Mongoose ya estuviera conectado por tests/setup.js. Intentando conectar...');
    if (process.env.MONGODB_URI) {
      try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('[dbHelper] connectDB: Conexión de fallback a MONGODB_URI exitosa.');
      } catch (err) {
        console.error('[dbHelper] connectDB: Fallback connection error:', err);
        throw err;
      }
    } else {
      console.error('[dbHelper] connectDB: MONGODB_URI no está definida, no se puede intentar conexión de fallback.');
      throw new Error('MongoDB no conectado y MONGODB_URI no disponible en dbHelper.connectDB');
    }
  }
};

const disconnectDB = async () => {
};

const clearDB = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      console.warn('[dbHelper] clearDB: Mongoose no conectado. Intentando conectar antes de limpiar.');
      await connectDB();
      if (mongoose.connection.readyState === 0) {
         console.error('[dbHelper] clearDB: No se pudo conectar a la BD. No se puede limpiar.');
         return;
      }
    }
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  } catch (err) {
    console.error('[dbHelper] clearDB: Error limpiando MongoDB en memoria:', err.message);
  }
};

module.exports = { connectDB, disconnectDB, clearDB }; 