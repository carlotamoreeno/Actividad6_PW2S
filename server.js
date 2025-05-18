require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path'); 
const { conectarDB } = require('./db/mongoose.js');

// Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swaggerConfig');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const clientRoutes = require('./routes/clientRoutes');
const projectRoutes = require('./routes/projectRoutes');
const deliveryNoteRoutes = require('./routes/deliveryNoteRoutes');

const app = express();

// Función asíncrona para crear y configurar la aplicación
const createApp = async () => {
  await conectarDB();

  // Middlewares
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    app.use(morgan('dev'));
  }

  // Rutas de la API
  app.use('/api/auth', authRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/clients', clientRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/deliverynotes', deliveryNoteRoutes);

  app.use('/storage', express.static(path.join(__dirname, '..', 'storage')));

  // Ruta de prueba
  app.get('/', (req, res) => {
    res.json({ message: 'API de Albaranes funcionando correctamente!!!' });
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  return app;
};

// Si el archivo se ejecuta directamente se inicia el servidor
if (require.main === module) {
  const PORT = process.env.PORT || 5001;
  createApp().then(appInstance => {
    appInstance.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
      console.log(`Accede a la API en http://localhost:${PORT}`);
    });
  }).catch(err => {
    console.error("Error al iniciar la aplicación:", err);
    process.exit(1);
  });
}

module.exports = createApp;