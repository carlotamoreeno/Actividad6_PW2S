const express = require('express');
const router = express.Router();
const {
  crearCliente,
  obtenerClientes,
  obtenerClientePorId,
  actualizarCliente,
  softDeleteCliente,
  recuperarClienteArchivado,
  hardDeleteCliente,
} = require('../controllers/clientController');
const { protegerRuta } = require('../middleware/authMiddleware');
const { validarCliente } = require('../middleware/validationMiddleware');

/**
 * @swagger
 * tags:
 *   name: Clientes
 *   description: Endpoints para la gestión de clientes.
 */

router.use(protegerRuta);

/**
 * @swagger
 * /clients:
 *   post:
 *     summary: Crear un nuevo cliente.
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     description: Crea un nuevo cliente asociado al usuario autenticado o su empresa.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientInput'
 *     responses:
 *       201:
 *         description: Cliente creado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClientOutput'
 *       400:
 *         description: Datos de entrada inválidos.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado.
 */
router.post('/', validarCliente, crearCliente);

/**
 * @swagger
 * /clients:
 *   get:
 *     summary: Obtener listado de clientes.
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     description: Devuelve una lista de todos los clientes asociados al usuario autenticado o su empresa. Permite filtrar por clientes archivados.
 *     parameters:
 *       - in: query
 *         name: incluirArchivados
 *         schema:
 *           type: boolean
 *         description: Si es true, incluye los clientes archivados (soft-deleted) en la lista.
 *         example: false
 *     responses:
 *       200:
 *         description: Lista de clientes obtenida exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ClientOutput'
 *       401:
 *         description: No autorizado.
 */
router.get('/', obtenerClientes);

/**
 * @swagger
 * /clients/{id}:
 *   get:
 *     summary: Obtener un cliente por ID.
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     description: Devuelve los detalles de un cliente específico si pertenece al usuario autenticado o su empresa.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del cliente a obtener.
 *         example: "60564fd75450ae0015812f38"
 *     responses:
 *       200:
 *         description: Detalles del cliente obtenidos exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClientOutput'
 *       401:
 *         description: No autorizado.
 *       404:
 *         description: Cliente no encontrado.
 */
router.get('/:id', obtenerClientePorId);

/**
 * @swagger
 * /clients/{id}:
 *   put:
 *     summary: Actualizar un cliente existente (PUT).
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     description: Actualiza la información de un cliente específico mediante PUT.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del cliente a actualizar.
 *         example: "60564fd75450ae0015812f38"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientInput'
 *     responses:
 *       200:
 *         description: Cliente actualizado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClientOutput'
 *       400:
 *         description: Datos de entrada inválidos.
 *       401:
 *         description: No autorizado.
 *       404:
 *         description: Cliente no encontrado.
 */
router.put('/:id', validarCliente, actualizarCliente);

/**
 * @swagger
 * /clients/{id}:
 *   patch:
 *     summary: Actualizar un cliente existente (PATCH).
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     description: Actualiza la información de un cliente específico. Solo los campos proporcionados serán actualizados.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del cliente a actualizar.
 *         example: "60564fd75450ae0015812f38"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientInput' # Reutilizamos ClientInput, aunque no todos los campos son obligatorios en PATCH
 *     responses:
 *       200:
 *         description: Cliente actualizado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClientOutput'
 *       400:
 *         description: Datos de entrada inválidos.
 *       401:
 *         description: No autorizado.
 *       404:
 *         description: Cliente no encontrado.
 */
router.patch('/:id', validarCliente, actualizarCliente);

/**
 * @swagger
 * /clients/{id}/soft:
 *   delete:
 *     summary: Borrado lógico (archivar) de un cliente.
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     description: Marca un cliente como eliminado (isDeleted = true) pero no lo borra permanentemente de la base de datos.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del cliente a archivar.
 *         example: "60564fd75450ae0015812f38"
 *     responses:
 *       200:
 *         description: Cliente marcado como eliminado (soft delete).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       401:
 *         description: No autorizado.
 *       404:
 *         description: Cliente no encontrado.
 */
router.delete('/:id/soft', softDeleteCliente);

/**
 * @swagger
 * /clients/{id}/recover:
 *   patch:
 *     summary: Recuperar un cliente archivado.
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     description: Restaura un cliente que fue previamente archivado (soft-deleted).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del cliente a recuperar.
 *         example: "60564fd75450ae0015812f38"
 *     responses:
 *       200:
 *         description: Cliente recuperado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClientOutput'
 *       401:
 *         description: No autorizado.
 *       404:
 *         description: Cliente no encontrado o no está archivado.
 */
router.patch('/:id/recover', recuperarClienteArchivado);

/**
 * @swagger
 * /clients/{id}/hard:
 *   delete:
 *     summary: Borrado físico (permanente) de un cliente.
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     description: Elimina permanentemente un cliente de la base de datos. Esta acción es irreversible.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del cliente a eliminar permanentemente.
 *         example: "60564fd75450ae0015812f38"
 *     responses:
 *       200:
 *         description: Cliente eliminado permanentemente (hard delete).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       401:
 *         description: No autorizado.
 *       404:
 *         description: Cliente no encontrado.
 */
router.delete('/:id/hard', hardDeleteCliente);

module.exports = router; 