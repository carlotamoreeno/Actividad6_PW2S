const User = require('../models/User');
const Invitation = require('../models/Invitation');
const crypto = require('crypto');
const { enviarEmailInvitacionCompania } = require('../services/emailService');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

/**
 * @desc    Obtener el perfil del usuario autenticado
 * @route   GET /api/user/me
 * @access  Private
 */
const obtenerPerfilUsuario = async (req, res) => {
  try {
    const usuario = await User.findById(req.user.id).select('-password');

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    res.status(200).json({ usuario });
  } catch (error) {
    console.error('Error en obtenerPerfilUsuario:', error);
    res.status(500).json({ message: 'Error del servidor al obtener el perfil del usuario.', error: error.message });
  }
};

/**
 * @desc    Actualizar el perfil del usuario autenticado
 * @route   PATCH /api/user
 * @access  Private
 */
const actualizarPerfilUsuario = async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    const usuarioId = req.user.id;

    const usuario = await User.findById(usuarioId);

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    // Actualizar campos si se proporcionan
    if (nombre) {
      usuario.nombre = nombre;
    }
    if (email) {
      // Verificar si el nuevo email ya está en uso por otro usuario
      if (email.toLowerCase() !== usuario.email.toLowerCase()) {
        const emailExistente = await User.findOne({ email: email.toLowerCase() });
        if (emailExistente) {
          return res.status(400).json({ message: 'El correo electrónico ya está en uso.'});
        }
      }
      usuario.email = email;
      usuario.emailValidado = false;
    }
    if (password) {
      usuario.password = password;
    }

    const usuarioActualizado = await usuario.save();

    const usuarioParaResponder = { ...usuarioActualizado.toObject() };
    delete usuarioParaResponder.password;

    res.status(200).json({
      message: 'Perfil actualizado exitosamente.',
      usuario: usuarioParaResponder,
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const mensajes = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: mensajes.join(', ') });
    }
    console.error('Error en actualizarPerfilUsuario:', error);
    res.status(500).json({ message: 'Error del servidor al actualizar el perfil.', error: error.message });
  }
};

/**
 * @desc    Gestionar (actualizar) la empresa asociada al perfil del usuario autenticado
 * @route   PATCH /api/user/company
 * @access  Private
 */
const gestionarEmpresaUsuario = async (req, res) => {
  try {
    const { nombreEmpresa, direccionEmpresa, telefonoEmpresa, emailEmpresa, cifEmpresa, webEmpresa } = req.body;
    const usuarioId = req.user.id;

    const usuario = await User.findById(usuarioId);

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    if (nombreEmpresa !== undefined) {
      usuario.empresa.nombre = nombreEmpresa.trim();
    }
    
    if (direccionEmpresa !== undefined) {
      usuario.empresa.direccion = direccionEmpresa.trim();
    }
    
    if (telefonoEmpresa !== undefined) {
      usuario.empresa.telefono = telefonoEmpresa.trim();
    }
    
    if (emailEmpresa !== undefined) {
      usuario.empresa.emailEmpresa = emailEmpresa.trim().toLowerCase();
    }
    
    if (cifEmpresa !== undefined) {
      usuario.empresa.cif = cifEmpresa.trim();
    }
    
    if (webEmpresa !== undefined) {
      usuario.empresa.web = webEmpresa.trim();
    }

    const usuarioActualizado = await usuario.save();

    const usuarioParaResponder = { ...usuarioActualizado.toObject() };
    delete usuarioParaResponder.password;

    res.status(200).json({
      message: 'Empresa asociada actualizada exitosamente.',
      usuario: usuarioParaResponder,
    });

  } catch (error) {
    console.error('Error en gestionarEmpresaUsuario:', error);
    res.status(500).json({ message: 'Error del servidor al actualizar la empresa asociada.', error: error.message });
  }
};

/**
 * @desc    Validar el correo electrónico de un usuario usando un token.
 * @route   PUT /api/user/validation
 * @access  Public (el token es la autenticación)
 */
const validarCorreoUsuario = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: 'Token de validación no proporcionado.' });
  }

  try {
    const usuario = await User.findOne({
      tokenValidacionEmail: token,
      expiracionTokenValidacionEmail: { $gt: Date.now() },
    });

    if (!usuario) {
      return res.status(400).json({ message: 'Token de validación inválido o expirado.' });
    }

    if (usuario.validado) {
      return res.status(400).json({ message: 'El correo electrónico ya ha sido validado.' });
    }

    usuario.validado = true;
    usuario.tokenValidacionEmail = undefined;
    usuario.expiracionTokenValidacionEmail = undefined;

    await usuario.save();

    logger.info(`Correo validado exitosamente para el usuario: ${usuario.email}`);
    res.status(200).json({ message: 'Correo electrónico validado exitosamente.' });

  } catch (error) {
    logger.error('Error al validar el correo electrónico:', error);
    res.status(500).json({ message: 'Error del servidor al validar el correo electrónico.', error: error.message });
  }
};

/**
 * @desc    Cambiar la contraseña de un usuario autenticado.
 * @route   PATCH /api/user/change-password
 * @access  Private
 */
const cambiarPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const usuarioId = req.user.id;

  const errores = [];
  if (!currentPassword) {
    errores.push({ 
      value: '',
      msg: 'La contraseña actual es obligatoria',
      param: 'currentPassword',
      location: 'body'
    });
  }
  
  if (!newPassword) {
    errores.push({ 
      value: '',
      msg: 'La nueva contraseña es obligatoria',
      param: 'newPassword',
      location: 'body'
    });
  } else if (newPassword.length < 6) {
    errores.push({ 
      value: newPassword,
      msg: 'La nueva contraseña debe tener al menos 6 caracteres',
      param: 'newPassword',
      location: 'body'
    });
  }

  if (errores.length > 0) {
    return res.status(400).json({ errors: errores });
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'La contraseña actual y la nueva contraseña son requeridas.' });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({ message: 'La nueva contraseña no puede ser igual a la contraseña actual.' });
  }

  try {
    const usuario = await User.findById(usuarioId);

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const esPasswordCorrecta = await usuario.compararPassword(currentPassword);
    if (!esPasswordCorrecta) {
      return res.status(401).json({ message: 'La contraseña actual es incorrecta.' });
    }

    usuario.password = newPassword;
    await usuario.save();

    logger.info(`Contraseña cambiada correctamente para el usuario: ${usuario.email}`);
    res.status(200).json({ message: 'Contraseña actualizada correctamente.' });

  } catch (error) {
    logger.error(`Error al cambiar la contraseña para el usuario ${usuarioId}:`, error);
    res.status(500).json({ message: 'Error del servidor al cambiar la contraseña.', error: error.message });
  }
};

/**
 * @desc    Eliminación lógica (soft delete) del usuario autenticado
 * @route   PATCH /api/user/me/soft-delete
 * @access  Private
 */
const softDeleteUsuario = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const usuario = await User.findById(usuarioId);

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    if (usuario.isDeleted) {
      return res.status(400).json({ message: 'La cuenta ya ha sido eliminada lógicamente.' });
    }

    usuario.isDeleted = true;
    usuario.deletedAt = Date.now();

    await usuario.save();
    logger.info(`Usuario ${usuario.email} (ID: ${usuarioId}) marcado como eliminado (soft delete).`);
    res.status(200).json({ message: 'Usuario marcado como eliminado correctamente.' });

  } catch (error) {
    logger.error(`Error en softDeleteUsuario para el usuario ${req.user.id}:`, error);
    res.status(500).json({ message: 'Error del servidor al intentar la eliminación lógica de la cuenta.', error: error.message });
  }
};

/**
 * @desc    Eliminación física (hard delete) de un usuario (potencialmente para admin)
 * @route   DELETE /api/user/:id/hard-delete 
 * @access  Private (Admin - requiere protección de ruta adicional)
 */
const hardDeleteUsuario = async (req, res) => {
  try {
    const usuarioId = req.params.id; 
    
    if (!mongoose.Types.ObjectId.isValid(usuarioId)) {
        return res.status(400).json({ message: 'El ID de usuario proporcionado no es válido.' });
    }

    const usuario = await User.findById(usuarioId);

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado para eliminación física.' });
    }

    await User.findByIdAndDelete(usuarioId);
    logger.info(`Usuario (ID: ${usuarioId}) eliminado físicamente (hard delete). Email: ${usuario.email}`);
    res.status(200).json({ message: `Usuario con ID ${usuarioId} ha sido eliminado permanentemente.` });

  } catch (error) {
    logger.error(`Error en hardDeleteUsuario para el ID ${req.params.id}:`, error);
    res.status(500).json({ message: 'Error del servidor al intentar la eliminación física del usuario.', error: error.message });
  }
};

/**
 * @desc    Invitar a un usuario a unirse a la compañía del usuario autenticado.
 * @route   POST /api/user/invite-to-company
 * @access  Private
 */
const invitarUsuarioACompania = async (req, res) => {
  const { emailInvitado } = req.body;
  const idUsuarioInvitador = req.user.id;

  try {
    const invitador = await User.findById(req.user.id);

    if (!invitador) {
      return res.status(404).json({ message: 'Usuario invitador no encontrado.' });
    }

    // Verificar que el invitador tiene una empresa
    if (!invitador.empresa || !invitador.empresa.nombre || invitador.empresa.nombre.trim() === '') {
      return res.status(400).json({ message: 'El usuario que invita debe pertenecer a una empresa.' });
    }

    const nombreEmpresaInvitador = invitador.empresa.nombre;

    if (!emailInvitado || !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(emailInvitado)) {
        return res.status(400).json({ message: 'El correo electrónico del invitado es inválido o no fue proporcionado.' });
    }

    // Verificar si el invitado es el mismo invitador
    if (invitador.email === emailInvitado.toLowerCase()) {
        return res.status(400).json({ message: 'No puedes invitarte a ti mismo a la compañía.' });
    }

    // 1. Verificar si ya existe una invitación PENDIENTE para este email a esta empresa
    const invitacionExistente = await Invitation.findOne({
      invitedEmail: emailInvitado.toLowerCase(),
      companyName: nombreEmpresaInvitador,
      status: 'pending'
    });

    if (invitacionExistente) {
      return res.status(400).json({ message: `Ya existe una invitación pendiente para ${emailInvitado} a la empresa ${nombreEmpresaInvitador}.` });
    }

    // 2. Verificar si el usuario invitado ya existe y si pertenece a alguna empresa
    const usuarioInvitadoExistente = await User.findOne({ email: emailInvitado.toLowerCase() });

    if (usuarioInvitadoExistente && usuarioInvitadoExistente.empresa && usuarioInvitadoExistente.empresa.trim() !== '') {
      return res.status(400).json({
        message: `El usuario ${emailInvitado} ya pertenece a la empresa '${usuarioInvitadoExistente.empresa}'. No puede ser invitado.`
      });
    }

    // 3. Generar token y crear la invitación
    const tokenInvitacion = crypto.randomBytes(32).toString('hex');
    const expiracionToken = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const nuevaInvitacion = new Invitation({
      invitedEmail: emailInvitado.toLowerCase(),
      companyName: nombreEmpresaInvitador,
      inviter: idUsuarioInvitador,
      token: tokenInvitacion,
      expiration: expiracionToken,
      status: 'pending',
    });

    await nuevaInvitacion.save();

    enviarEmailInvitacionCompania(emailInvitado, invitador.nombre, nombreEmpresaInvitador, tokenInvitacion)
      .then(emailResult => {
        if (emailResult && emailResult.success) {
          logger.info(`Email de invitación enviado a ${emailInvitado} para la empresa ${nombreEmpresaInvitador} por ${invitador.email}`);
        } else {
          logger.warn(`Fallo el envío de email de invitación a ${emailInvitado} para ${nombreEmpresaInvitador}: ${emailResult ? emailResult.message : 'Resultado inesperado del servicio de email'}`);
        }
      })
      .catch(error => {
        logger.error(`Error inesperado al intentar enviar email de invitación a ${emailInvitado} para ${nombreEmpresaInvitador}:`, error);
      });

    res.status(201).json({
      message: `Invitación enviada exitosamente a ${emailInvitado} para unirse a la empresa ${nombreEmpresaInvitador}.`,
      invitacionId: nuevaInvitacion._id
    });

  } catch (error) {
    logger.error(`Error en invitarUsuarioACompania por ${req.user.email}:`, error);
    if (error.name === 'ValidationError') {
        const mensajes = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ message: mensajes.join(', ') });
    }
    res.status(500).json({ message: 'Error del servidor al intentar invitar al usuario.', error: error.message });
  }
};

/**
 * @desc    Aceptar una invitación para unirse a una compañía.
 * @route   POST /api/user/accept-company-invitation
 * @access  Private (Usuario autenticado)
 */
const aceptarInvitacionCompania = async (req, res) => {
  const { token } = req.body;
  const usuarioIdAutenticado = req.user.id;

  if (!token) {
    return res.status(400).json({ message: 'El token de invitación es requerido.' });
  }

  try {
    const usuarioAutenticado = await User.findById(usuarioIdAutenticado);
    if (!usuarioAutenticado) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const invitacion = await Invitation.findOne({
      token,
      invitedEmail: usuarioAutenticado.email,
      status: 'pending'
    });

    if (!invitacion) {
      return res.status(400).json({ message: 'Invitación no válida, no encontrada o ya no está pendiente.' });
    }

    // Verificar expiración del token
    if (invitacion.expiration < new Date()) {
      invitacion.status = 'expired';
      await invitacion.save();
      return res.status(400).json({ message: 'La invitación ha caducado.' });
    }

    // Verificar si el usuario ya pertenece a una empresa
    if (usuarioAutenticado.empresa && usuarioAutenticado.empresa.trim() !== '') {
      if (usuarioAutenticado.empresa.toLowerCase() === invitacion.companyName.toLowerCase()){
        invitacion.status = 'accepted';
        await invitacion.save();
        return res.status(200).json({ message: `Ya perteneces a la empresa ${invitacion.companyName}.`});
      }
      return res.status(400).json({ message: `Ya perteneces a la empresa '${usuarioAutenticado.empresa}'. No puedes unirte a otra.` });
    }

    // Actualizar usuario y la invitación
    usuarioAutenticado.empresa = invitacion.companyName;
    await usuarioAutenticado.save();

    invitacion.status = 'accepted';
    await invitacion.save();

    logger.info(`Usuario ${usuarioAutenticado.email} aceptó invitación a la empresa ${invitacion.companyName}.`);
    res.status(200).json({
      message: `Te has unido exitosamente a la empresa ${invitacion.companyName}.`,
      usuario: {
        id: usuarioAutenticado._id,
        nombre: usuarioAutenticado.nombre,
        email: usuarioAutenticado.email,
        empresa: usuarioAutenticado.empresa,
        validado: usuarioAutenticado.validado
      }
    });

  } catch (error) {
    logger.error(`Error en aceptarInvitacionCompania para usuario ${req.user.email} con token ${token}:`, error);
    res.status(500).json({ message: 'Error del servidor al intentar aceptar la invitación.', error: error.message });
  }
};

module.exports = {
  obtenerPerfilUsuario,
  actualizarPerfilUsuario,
  gestionarEmpresaUsuario,
  validarCorreoUsuario,
  cambiarPassword,
  softDeleteUsuario,
  hardDeleteUsuario,
  invitarUsuarioACompania,
  aceptarInvitacionCompania
}; 