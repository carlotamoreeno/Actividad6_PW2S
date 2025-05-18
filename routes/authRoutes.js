const express = require('express');
const router = express.Router();
const {
  registrarUsuario,
  loginUsuario,
  solicitarReseteoPassword,
  resetearPassword,
} = require('../controllers/authController');
const { validarRegistro, validarLogin } = require('../middleware/validationMiddleware');

/*
 * @swagger
 * tags:
 *   name: Autenticación
 *   description: Endpoints para registro, login y gestión de contraseñas.
 */

/*
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registrar un nuevo usuario.
 *     tags: [Autenticación]
 *     description: Crea una nueva cuenta de usuario. Se enviará un correo para validación.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - email
 *               - password
 *               - nombreEmpresa
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Juan Pérez"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "juan.perez@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "password123"
 *                 minLength: 6
 *               nombreEmpresa:
 *                 type: string
 *                 example: "Empresa Ejemplo S.L."
 *               rol:
 *                 type: string
 *                 example: "usuario"
 *                 description: Rol del usuario (opcional, por defecto 'usuario')
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente. Se requiere validación por email.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Usuario registrado exitosamente. Por favor, revisa tu email para validar tu cuenta."
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 usuario:
 *                   $ref: '#/components/schemas/UserOutput' # Referencia a un esquema de usuario
 *       400:
 *         description: Error en la solicitud (ej. email ya existe, datos inválidos).
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
router.post('/register', validarRegistro, registrarUsuario);

/*
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Autenticar (login) un usuario.
 *     tags: [Autenticación]
 *     description: Inicia sesión para un usuario existente y devuelve un token JWT.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "juan.perez@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login exitoso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Login exitoso."
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 usuario:
 *                   $ref: '#/components/schemas/UserOutput'
 *       400:
 *         description: Solicitud inválida (ej. campos faltantes).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Credenciales inválidas.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Acceso prohibido (ej. cuenta eliminada o no validada).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', validarLogin, loginUsuario);

/*
 * @swagger
 * /auth/request-password-reset:
 *   post:
 *     summary: Solicitar reseteo de contraseña.
 *     tags: [Autenticación]
 *     description: Envía un email al usuario con un enlace para resetear su contraseña si el email existe en el sistema.
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
 *                 example: "usuario@example.com"
 *     responses:
 *       200:
 *         description: Solicitud procesada. Si el email existe, se enviará un correo.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Si tu correo electrónico está registrado, recibirás un enlace para resetear tu contraseña."
 *       400:
 *         description: Email no proporcionado.
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
router.post('/request-password-reset', solicitarReseteoPassword);

/*
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Resetear la contraseña.
 *     tags: [Autenticación]
 *     description: Permite a un usuario establecer una nueva contraseña utilizando un token de reseteo válido.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - nuevaPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: "a1b2c3d4e5f6..."
 *                 description: Token recibido en el correo de reseteo.
 *               nuevaPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: "nuevaPasswordSegura123"
 *     responses:
 *       200:
 *         description: Contraseña actualizada exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Token inválido/expirado, contraseña no cumple requisitos, o campos faltantes.
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
router.post('/reset-password', resetearPassword);

module.exports = router; 