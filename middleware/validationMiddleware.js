const { body, validationResult } = require('express-validator');

const manejarErroresValidacion = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join(', ');
    return res.status(400).json({ message: errorMessages, errors: errors.array() });
  }
  next();
};

// Reglas de validación para el registro de usuario
const validarRegistro = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio.')
    .isString().withMessage('El nombre debe ser una cadena de texto.'),
  body('email')
    .trim()
    .notEmpty().withMessage('El correo electrónico es obligatorio.')
    .isEmail().withMessage('Debe proporcionar un correo electrónico válido.')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria.')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.'),
  body('empresa')
    .optional({ checkFalsy: true })
    .trim()
    .isString().withMessage('El nombre de la empresa debe ser una cadena de texto.'),
  manejarErroresValidacion,
];

// Reglas de validación para el login de usuario
const validarLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('El correo electrónico es obligatorio.')
    .isEmail().withMessage('Debe proporcionar un correo electrónico válido.')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria.'),
  manejarErroresValidacion,
];

// Reglas de validación para Clientes
const validarCliente = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre del cliente es obligatorio.')
    .isString().withMessage('El nombre del cliente debe ser una cadena de texto.')
    .isLength({ min: 2, max: 100 }).withMessage('El nombre del cliente debe tener entre 2 y 100 caracteres.'),
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail().withMessage('Debe proporcionar un correo electrónico válido para el cliente.')
    .normalizeEmail(),
  body('telefono')
    .optional({ checkFalsy: true })
    .trim()
    .isString().withMessage('El teléfono debe ser una cadena de texto.')
    .isLength({ min: 5, max: 20 }).withMessage('El teléfono debe tener entre 5 y 20 caracteres.'),
  body('cifNif')
    .optional({ checkFalsy: true })
    .trim()
    .isString().withMessage('El CIF/NIF debe ser una cadena de texto.')
    .isLength({ min: 5, max: 20 }).withMessage('El CIF/NIF debe tener entre 5 y 20 caracteres.'),
  body('tipo')
    .optional({ checkFalsy: true })
    .isIn(['Empresa', 'Particular', 'Autónomo']).withMessage('Tipo de cliente inválido.'),
  body('direccionFacturacion.calle').optional({ checkFalsy: true }).trim().isString(),
  body('direccionFacturacion.ciudad').optional({ checkFalsy: true }).trim().isString(),
  body('direccionFacturacion.codigoPostal').optional({ checkFalsy: true }).trim().isPostalCode('ES').withMessage('Código postal de facturación inválido para España.'),
  body('direccionFacturacion.provincia').optional({ checkFalsy: true }).trim().isString(),
  body('direccionFacturacion.pais').optional({ checkFalsy: true }).trim().isString(),
  manejarErroresValidacion,
];

// Reglas de validación para Proyectos
const validarProyecto = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre del proyecto es obligatorio.')
    .isString().withMessage('El nombre del proyecto debe ser una cadena de texto.')
    .isLength({ min: 3, max: 150 }).withMessage('El nombre del proyecto debe tener entre 3 y 150 caracteres.'),
  body('descripcion')
    .optional({ checkFalsy: true })
    .trim()
    .isString().withMessage('La descripción debe ser una cadena de texto.'),
  body('clienteId')
    .notEmpty().withMessage('El ID del cliente es obligatorio para el proyecto.')
    .isMongoId().withMessage('El ID del cliente debe ser un ID de MongoDB válido.'),
  body('fechaInicio')
    .optional({ checkFalsy: true })
    .isISO8601().toDate().withMessage('La fecha de inicio debe ser una fecha válida.'),
  body('fechaFinPrevista')
    .optional({ checkFalsy: true })
    .isISO8601().toDate().withMessage('La fecha de fin prevista debe ser una fecha válida.')
    .custom((value, { req }) => {
      if (req.body.fechaInicio && value < req.body.fechaInicio) {
        throw new Error('La fecha de fin prevista no puede ser anterior a la fecha de inicio.');
      }
      return true;
    }),
  body('estado')
    .optional({ checkFalsy: true })
    .isIn(['Pendiente', 'En Progreso', 'Completado', 'Archivado', 'Cancelado']).withMessage('Estado del proyecto inválido.'),
  body('presupuesto')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('El presupuesto debe ser un valor numérico.')
    .toFloat(),
  manejarErroresValidacion,
];

// Reglas de validación para Albaranes
const validarAlbaran = [
  body('cliente')
    .notEmpty().withMessage('El ID del cliente es obligatorio para el albarán.')
    .isMongoId().withMessage('El ID del cliente debe ser un ID de MongoDB válido.'),
  body('proyecto')
    .notEmpty().withMessage('El ID del proyecto es obligatorio para el albarán.')
    .isMongoId().withMessage('El ID del proyecto debe ser un ID de MongoDB válido.'),
  body('fechaEmision')
    .notEmpty().withMessage('La fecha de emisión es obligatoria.')
    .isISO8601().toDate().withMessage('La fecha de emisión debe ser una fecha válida.'),
  body('lineas')
    .isArray({ min: 1 }).withMessage('Las líneas son obligatorias y deben ser un array no vacío.'),
  body('lineas.*.descripcion')
    .trim()
    .notEmpty().withMessage('La descripción de cada línea es obligatoria.')
    .isString().withMessage('La descripción de la línea debe ser texto.'),
  body('lineas.*.cantidad')
    .notEmpty().withMessage('La cantidad de cada línea es obligatoria.')
    .isNumeric().withMessage('La cantidad debe ser un número.')
    .toFloat(),
  body('lineas.*.precioUnitario')
    .notEmpty().withMessage('El precio unitario de cada línea es obligatorio.')
    .isNumeric().withMessage('El precio unitario debe ser un número.')
    .toFloat(),
  body('lineas.*.unidad')
    .optional({ checkFalsy: true })
    .trim()
    .isString().withMessage('La unidad de la línea debe ser texto.'),
  body('lineas.*.iva')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('El IVA debe ser un número (porcentaje).' )
    .toFloat(),
  body('observaciones')
    .optional({ checkFalsy: true })
    .trim()
    .isString().withMessage('Las observaciones deben ser texto.'),
  body('estado')
    .optional({ checkFalsy: true })
    .isIn(['Borrador', 'Emitido', 'Firmado', 'Cancelado']).withMessage('Estado del albarán inválido.'),
  manejarErroresValidacion,
];

module.exports = {
  validarRegistro,
  validarLogin,
  validarCliente,
  validarProyecto,
  validarAlbaran,
}; 