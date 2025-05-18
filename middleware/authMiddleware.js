const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const protegerRuta = async (req, res, next) => {
  let token;

  // Verificar si hay header de autorización y si comienza con Bearer
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Si el token no existe
  if (!token) {
    logger.warn('Intento de acceso a ruta protegida sin token.');
    return res.status(401).json({ message: 'No autorizado, token no proporcionado o formato incorrecto.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    try {
      req.user = await User.findById(decoded.id).select('-password');
  
      if (!req.user) {
        logger.warn(`Usuario no encontrado para token válido. ID: ${decoded.id}`);
        return res.status(401).json({ message: 'No autorizado, usuario no encontrado.' });
      }
      
      if (req.user.isDeleted) {
        logger.warn(`Intento de acceso de usuario eliminado. ID: ${req.user._id}`);
        req.user = null;
        return res.status(403).json({ message: 'Acceso prohibido, cuenta de usuario eliminada o inactiva.' });
      }

      next();
    } catch (dbError) {
      logger.error(`Error en protegerRuta durante User.findById: ${dbError.message}`, { token });
      return res.status(500).json({ 
        message: 'Error del servidor al verificar la autenticación.',
        detalles: dbError.message
      });
    }
  } catch (jwtError) {
    logger.error(`Error en protegerRuta durante jwt.verify: ${jwtError.message}`, { token });
    return res.status(401).json({ message: 'No autorizado, token inválido.' });
  }
};

module.exports = {
  protegerRuta
}; 