const express = require('express');
const router = express.Router();
const {
  obtenerPerfilUsuario,
  actualizarPerfilUsuario,
  gestionarEmpresaUsuario,
  validarCorreoUsuario,
  cambiarPassword,
  softDeleteUsuario,
  hardDeleteUsuario,
  invitarUsuarioACompania,
  aceptarInvitacionCompania,
} = require('../controllers/userController');
const { protegerRuta } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Usuarios
 *   description: Endpoints para la gestión de usuarios y perfiles.
 */

/**
 * @swagger
 * /user/validation:
 *   put:
 *     summary: Validar el correo electrónico del usuario.
 *     tags: [Usuarios]
 *     description: Valida la cuenta de un usuario utilizando un token enviado por correo.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 description: Token de validación recibido por correo.
 *     responses:
 *       200:
 *         description: Correo electrónico validado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Token de validación no proporcionado, inválido o expirado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/validation', validarCorreoUsuario);

// Middleware de protección para las rutas siguientes
router.use(protegerRuta);

/**
 * @swagger
 * /user/me:
 *   get:
 *     summary: Obtener el perfil del usuario autenticado.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     description: Devuelve la información del perfil del usuario que realiza la solicitud (autenticado mediante token JWT).
 *     responses:
 *       200:
 *         description: Perfil del usuario obtenido exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 usuario:
 *                   $ref: '#/components/schemas/UserOutput'
 *       401:
 *         description: No autorizado (token no proveído o inválido).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Prohibido (ej. usuario eliminado).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/me', obtenerPerfilUsuario);

/**
 * @swagger
 * /user:
 *   patch:
 *     summary: Actualizar el perfil del usuario autenticado.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     description: Permite al usuario autenticado actualizar su información de perfil (nombre, email, etc., pero no contraseña ni empresa directamente por esta vía).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Juan Pérez Actualizado"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "juan.perez.actualizado@example.com"
 *                 description: Si se actualiza el email, se requerirá nueva validación.
 *     responses:
 *       200:
 *         description: Perfil actualizado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Perfil actualizado exitosamente."
 *                 usuario:
 *                   $ref: '#/components/schemas/UserOutput'
 *       400:
 *         description: Datos de entrada inválidos.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/', /* validarActualizacionPerfil, */ actualizarPerfilUsuario);

/**
 * @swagger
 * /user/company:
 *   patch:
 *     summary: Gestionar la empresa asociada al usuario.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     description: Permite al usuario autenticado crear o actualizar la información de su empresa asociada.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombreEmpresa:
 *                 type: string
 *                 example: "Mi Nueva Empresa S.A."
 *               direccionEmpresa:
 *                 type: string
 *                 example: "Calle Innovación 123, Parque Tecnológico"
 *               cifEmpresa:
 *                 type: string
 *                 example: "B12345678"
 *               telefonoEmpresa:
 *                 type: string
 *                 example: "912345678"
 *               emailEmpresa:
 *                 type: string
 *                 format: email
 *                 example: "contacto@minuevaempresa.com"
 *               webEmpresa:
 *                 type: string
 *                 format: url
 *                 example: "https://www.minuevaempresa.com"
 *               infoAdicional:
 *                 type: object
 *                 description: Cualquier otra información relevante de la empresa.
 *                 example: { sector: "Tecnología", logoUrl: "https://link.to/logo.png" }
 *     responses:
 *       200:
 *         description: Información de la empresa actualizada/creada exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Información de la empresa actualizada."
 *                 usuario:
 *                   $ref: '#/components/schemas/UserOutput' # El usuario con la empresa actualizada
 *       400:
 *         description: Datos de entrada inválidos.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado.
 */
router.patch('/company', /* validarGestionEmpresa, */ gestionarEmpresaUsuario);

/**
 * @swagger
 * /user/change-password:
 *   patch:
 *     summary: Cambiar la contraseña del usuario autenticado.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     description: Permite al usuario autenticado cambiar su contraseña actual por una nueva.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 example: "passwordActual123"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: "nuevaPasswordSegura456"
 *     responses:
 *       200:
 *         description: Contraseña actualizada correctamente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Contraseña actual incorrecta, nueva contraseña no cumple requisitos, o campos faltantes.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado.
 */
router.patch('/change-password', /* TODO: add validation, */ cambiarPassword);

/**
 * @swagger
 * /user/me/soft-delete:
 *   patch:
 *     summary: Marcar la cuenta del usuario autenticado como eliminada (soft delete).
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     description: Realiza una eliminación lógica de la cuenta del usuario. El usuario no podrá iniciar sesión.
 *     responses:
 *       200:
 *         description: Usuario marcado como eliminado correctamente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       401:
 *         description: No autorizado.
 */
router.patch('/me/soft-delete', softDeleteUsuario);

/**
 * @swagger
 * /user/{id}/hard-delete:
 *   delete:
 *     summary: Eliminar permanentemente la cuenta de un usuario (hard delete).
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: [] # Se asume que un admin debe hacer esto, se necesitaría un control de rol adicional.
 *     description: Realiza una eliminación física de la cuenta de un usuario. Esta acción es irreversible. **Requiere permisos de administrador.**
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: El ID del usuario a eliminar.
 *         example: "60564fcb5450ae0015812f36"
 *     responses:
 *       200:
 *         description: Usuario eliminado permanentemente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       401:
 *         description: No autorizado.
 *       403:
 *         description: Prohibido (ej. el usuario autenticado no es administrador).
 *       404:
 *         description: Usuario no encontrado.
 */
router.delete('/:id/hard-delete', hardDeleteUsuario);

/**
 * @swagger
 * /user/invite-to-company:
 *   post:
 *     summary: Invitar a un usuario a unirse a la compañía.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     description: El usuario autenticado (que debe pertenecer a una empresa) invita a otro usuario (por email) a unirse a su compañía.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "usuario.invitado@example.com"
 *                 description: Email del usuario a invitar.
 *     responses:
 *       200:
 *         description: Invitación enviada correctamente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Error en la solicitud (ej. el invitador no tiene empresa, email inválido).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado.
 *       404:
 *         description: Usuario a invitar no encontrado en el sistema.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/invite-to-company', invitarUsuarioACompania);

/**
 * @swagger
 * /user/accept-company-invitation:
 *   post:
 *     summary: Aceptar una invitación para unirse a una compañía.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     description: El usuario autenticado utiliza un token de invitación para unirse a una compañía.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 example: "invitationToken123abc..."
 *                 description: Token de invitación recibido.
 *     responses:
 *       200:
 *         description: Invitación aceptada. Usuario unido a la empresa.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invitación aceptada. Te has unido a la empresa."
 *                 usuario:
 *                   $ref: '#/components/schemas/UserOutput' # Usuario con la empresa actualizada.
 *       400:
 *         description: Error en la solicitud (ej. token inválido/expirado, usuario ya en una empresa).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado.
 */
router.post('/accept-company-invitation', aceptarInvitacionCompania);

module.exports = router; 