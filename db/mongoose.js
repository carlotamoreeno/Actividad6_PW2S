const mongoose = require('mongoose');

const getEffectiveMongoUri = () => {
  if (process.env.NODE_ENV === 'test') {
    const mongoUriForTests = process.env.MONGODB_URI_FOR_TESTS;
    if (!mongoUriForTests) {
      console.error('ERROR CRÍTICO: Estamos en entorno de pruebas pero MONGODB_URI_FOR_TESTS no está configurado. Comprueba tests/setup.js.');
      return null; 
    }
    return mongoUriForTests;
  } else {
    const mongoUriEnv = process.env.MONGODB_URI_ATLAS || process.env.MONGODB_URI;
    if (!mongoUriEnv) {
      console.error('Error: La variable de entorno MONGODB_URI_ATLAS o MONGODB_URI no está definida para el entorno actual.');
      console.error('Asegúrate de tener un archivo .env con la URI de conexión a MongoDB o configurar MONGODB_URI_ATLAS.');
      return null;
    }
    return mongoUriEnv;
  }
};

const conectarDB = async () => {
  const effectiveMongoUri = getEffectiveMongoUri();

  if (!effectiveMongoUri) {
    console.error('[DB Connect] MongoDB URI no se puede determinar. Abortando intento de conexión.');
    process.exit(1);
  }

  try {
    if (mongoose.connection.readyState === 0) { 
      await mongoose.connect(effectiveMongoUri, {
      });
    }
  } catch (error) {
    console.error(`[DB Connect] Error al conectar a MongoDB (${effectiveMongoUri}):`, error);
    process.exit(1);
  }
};

// Desconectar de la base de datos
const desconectarDB = async () => {
  try {
    await mongoose.disconnect();
  } catch (error) {
    console.error('[DB Connect] Error al desconectar de MongoDB:', error);
  }
};

module.exports = { conectarDB, desconectarDB, mongooseInstance: mongoose };