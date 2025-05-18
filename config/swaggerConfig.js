const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path'); 
const routesDir = path.join(__dirname, '..', 'routes');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Practica Unidad 6 (CMG)',
      version: '1.0.0',
      description: 'API para la gestión de albaranes, clientes, proyectos y usuarios. Documentación generada con Swagger.',
      contact: {
        name: 'Carlota',
        email: 'carlota.garcia@live.u-tad.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}/api`,
        description: 'Servidor de Desarrollo',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      }
    },
    security: [
        {
            bearerAuth: []
        }
    ]
  },
  apis: [], 
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec; 