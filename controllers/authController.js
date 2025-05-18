const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); 
const { enviarEmailValidacion, enviarEmailReseteoPassword } = require('../services/emailService');
const logger = require('../utils/logger');
require('dotenv').config();

// Función para generar un token JWT
const generarToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

/**
 * @desc    Registrar un nuevo usuario
 * @route   POST /api/user/register
 * @access  Public
 */
const registrarUsuario = async (req, res) => {
  const { nombre, email, password, empresaNombre } = req.body;

  try {
    let usuario = await User.findOne({ email });
    if (usuario) {
      return res.status(400).json({ message: 'El usuario ya existe.' });
    }

    // Generar token de validación
    const tokenValidacion = crypto.randomBytes(20).toString('hex');
    const expiracionTokenValidacion = Date.now() + 3600000; 

    usuario = new User({
      nombre,
      email,
      password,
      empresa: empresaNombre ? { nombre: empresaNombre } : {},
      tokenValidacionEmail: tokenValidacion, 
      expiracionTokenValidacionEmail: expiracionTokenValidacion,
    });

    await usuario.save();

    enviarEmailValidacion(usuario.email, usuario.nombre, usuario.tokenValidacionEmail)
      .then(emailResult => {
        if (emailResult && emailResult.success) {
          logger.info(`Correo de validación enviado a ${usuario.email} durante el registro.`);
        } else {
          logger.warn(`Fallo el envío de email de validación para ${usuario.email} durante el registro: ${emailResult ? emailResult.message : 'Resultado inesperado del servicio de email'}`);
        }
      })
      .catch(error => {
        logger.error(`Error inesperado al intentar enviar correo de validación para ${usuario.email} durante el registro:`, error);
      });

    // Generar JWT para el login automático o para que el cliente lo use
    const payload = {
      id: usuario.id,
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
      (error, token) => {
        if (error) throw error;
        res.status(201).json({
          message: 'Usuario registrado exitosamente. Por favor, revisa tu email para validar tu cuenta.',
          token,
          usuario: {
            id: usuario.id,
            nombre: usuario.nombre,
            email: usuario.email,
            validado: usuario.validado,
            empresa: usuario.empresa,
          },
        });
      }
    );

  } catch (error) {
    if (error.name === 'ValidationError') {
      const mensajes = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: mensajes.join(', ') });
    }
    console.error('Error en registrarUsuario:', error);
    res.status(500).json({ message: 'Error del servidor al intentar registrar el usuario.', error: error.message });
  }
};

/**
 * @desc    Autenticar (login) un usuario existente
 * @route   POST /api/user/login
 * @access  Public
 */
const loginUsuario = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar que los campos necesarios estén presentes
    if (!email || !password) {
      return res.status(400).json({ message: 'Por favor, incluye email y contraseña.' });
    }

    // Buscar al usuario por email
    const usuario = await User.findOne({ email });

    // Si el usuario no existe
    if (!usuario) {
      logger.warn(`Login: Usuario no encontrado - ${email}`);
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    // Verificar si la cuenta está marcada como eliminada
    if (usuario.isDeleted) {
      logger.warn(`Intento de login de cuenta eliminada: ${email}`);
      return res.status(403).json({ message: 'Esta cuenta ha sido eliminada. Por favor, contacta al soporte si crees que es un error.' });
    }

    logger.info(`Login: Usuario encontrado ${usuario.email}, comparando password.`)
    const passwordsCoinciden = await usuario.compararPassword(password);
    logger.info(`Login: Passwords coinciden para ${usuario.email}: ${passwordsCoinciden}`)

    // Si el usuario no existe o la contraseña no coincide (usando el método del modelo)
    if (!passwordsCoinciden) {
      logger.warn(`Login: Contraseña incorrecta para ${usuario.email}`);
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    // Generar token JWT
    const token = generarToken(usuario._id);

    // No devolver la contraseña en la respuesta
    const usuarioParaResponder = { ...usuario.toObject() };
    delete usuarioParaResponder.password;

    res.status(200).json({
      message: 'Login exitoso.',
      usuario: usuarioParaResponder,
      token,
    });

  } catch (error) {
    console.error('Error en loginUsuario:', error);
    res.status(500).json({ message: 'Error del servidor al intentar iniciar sesión.', error: error.message });
  }
};

/**
 * @desc    Solicitar reseteo de contraseña
 * @route   POST /api/auth/request-password-reset
 * @access  Public
 */
const solicitarReseteoPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'El correo electrónico es requerido.' });
  }

  try {
    const usuario = await User.findOne({ email });

    if (usuario) {
      const tokenReseteo = crypto.randomBytes(20).toString('hex');
      usuario.tokenReseteoPassword = tokenReseteo;
      usuario.expiracionTokenReseteoPassword = Date.now() + 3600000;
      await usuario.save();

      // Enviar correo con el token (sin bloquear la respuesta)
      enviarEmailReseteoPassword(usuario.email, usuario.nombre, tokenReseteo)
        .then(emailResult => {
          if (emailResult && emailResult.success) {
            logger.info(`Correo de reseteo de contraseña enviado a ${usuario.email}.`);
          } else {
            logger.warn(`Fallo el envío de email de reseteo de contraseña para ${usuario.email}: ${emailResult ? emailResult.message : 'Resultado inesperado del servicio de email'}`);
          }
        })
        .catch(error => {
          logger.error(`Error inesperado al intentar enviar email de reseteo para ${usuario.email}:`, error);
        });

      res.json({ message: 'Si tu correo electrónico está registrado, recibirás un enlace para resetear tu contraseña.' });

    }
  } catch (error) {
    logger.error('Error en solicitarReseteoPassword:', error);
    res.status(500).json({ message: 'Error del servidor al solicitar el reseteo de contraseña.' });
  }
};

/**
 * @desc    Resetear la contraseña usando un token
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetearPassword = async (req, res) => {
  const { token, nuevaPassword } = req.body;

  if (!token || !nuevaPassword) {
    return res.status(400).json({ message: 'El token y la nueva contraseña son requeridos.' });
  }
  if (nuevaPassword.length < 6) {
    return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
  }

  try {
    const usuario = await User.findOne({
      tokenReseteoPassword: token,
      expiracionTokenReseteoPassword: { $gt: Date.now() },
    });

    if (!usuario) {
      return res.status(400).json({ message: 'Token de reseteo inválido o expirado.' });
    }

    usuario.password = nuevaPassword;
    usuario.tokenReseteoPassword = undefined; 
    usuario.expiracionTokenReseteoPassword = undefined;
    usuario.validado = true;

    await usuario.save();

    logger.info(`Contraseña reseteada exitosamente para el usuario: ${usuario.email}`);
    res.status(200).json({ message: 'Contraseña actualizada exitosamente.' });

  } catch (error) {
    logger.error('Error en resetearPassword:', error);
    if (error.name === 'ValidationError') {
      const mensajes = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: mensajes.join(', ') });
    }
    res.status(500).json({ message: 'Error del servidor al resetear la contraseña.' });
  }
};

module.exports = {
  registrarUsuario,
  loginUsuario,
  solicitarReseteoPassword,
  resetearPassword,
}; 