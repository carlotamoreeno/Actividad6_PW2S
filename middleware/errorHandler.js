const logger = require('../utils/logger'); 

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  if (statusCode >= 500) {
    logger.error(`Error ${statusCode} en ${req.method} ${req.originalUrl} - ${err.message}`, err);
  }

  res.status(statusCode);

  res.json({
    message: err.message || 'Ha ocurrido un error en el servidor.',
    stack: process.env.NODE_ENV === 'production' ? 'ok' : err.stack,
  });
};

const notFoundHandler = (req, res, next) => {
  const error = new Error(`Ruta no encontrada - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = { errorHandler, notFoundHandler }; 