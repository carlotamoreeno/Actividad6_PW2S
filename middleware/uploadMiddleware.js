const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Directorio de almacenamiento para las firmas
const storageFirmasDir = path.join(__dirname, '../storage/firmas');

// Asegurarse de que el directorio de almacenamiento exista
if (!fs.existsSync(storageFirmasDir)) {
  try {
    fs.mkdirSync(storageFirmasDir, { recursive: true });
    logger.info(`Directorio de almacenamiento para firmas creado en: ${storageFirmasDir}`);
  } catch (error) {
    logger.error(`Error al crear el directorio de almacenamiento para firmas en ${storageFirmasDir}:`, error);
  }
}

// Configuración de almacenamiento
const storageConfig = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, storageFirmasDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const albaranId = req.params.id || 'unknown_id';
    cb(null, `firma-${albaranId}-${uniqueSuffix}${extension}`);
  }
});

// Filtro de archivos para aceptar solo imágenes
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    logger.warn(`Intento de subida de archivo no soportado: ${file.originalname} (mimetype: ${file.mimetype})`);
    cb(new Error('Solo se permiten archivos de imagen (JPEG, PNG, GIF, etc.).'), false);
  }
};
const uploadFirma = multer({
  storage: storageConfig,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 
  }
}).single('firma');

module.exports = {
  uploadFirma
}; 