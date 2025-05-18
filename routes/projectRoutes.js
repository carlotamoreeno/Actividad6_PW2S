const express = require('express');
const router = express.Router();
const {
  crearProyecto,
  obtenerProyectos,
  obtenerProyectoPorId,
  actualizarProyecto,
  archivarProyecto,
  recuperarProyectoArchivado,
  hardDeleteProyecto,
} = require('../controllers/projectController');
const { protegerRuta } = require('../middleware/authMiddleware');
const { validarProyecto } = require('../middleware/validationMiddleware');

/**
 * @swagger
 * tags:
 *   name: Proyectos
 *   description: Endpoints para la gestión de proyectos.
 */

router.use(protegerRuta);

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Crear un nuevo proyecto.
 *     tags: [Proyectos]
 *     security:
 *       - bearerAuth: []
 *     description: Crea un nuevo proyecto asociado al usuario autenticado y a un cliente existente.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProjectInput'
 *     responses:
 *       201:
 *         description: Proyecto creado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProjectOutput'
 *       400:
 *         description: Datos de entrada inválidos (ej. clienteId no existe, campos requeridos faltantes).
 *       401:
 *         description: No autorizado.
 *       404:
 *         description: Cliente especificado no encontrado.
 */
router.post('/', validarProyecto, crearProyecto);

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: Obtener listado de proyectos.
 *     tags: [Proyectos]
 *     security:
 *       - bearerAuth: []
 *     description: Devuelve una lista de proyectos del usuario autenticado, opcionalmente filtrados por cliente o estado.
 *     parameters:
 *       - in: query
 *         name: clienteId
 *         schema:
 *           type: string
 *         description: Filtrar proyectos por ID de cliente.
 *         example: "60564fd75450ae0015812f38"
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [Planificado, En progreso, Completado, En espera, Cancelado]
 *         description: Filtrar proyectos por estado.
 *         example: "En progreso"
 *       - in: query
 *         name: incluirArchivados
 *         schema:
 *           type: boolean
 *         description: Si es true, incluye los proyectos archivados.
 *         example: false
 *     responses:
 *       200:
 *         description: Lista de proyectos obtenida exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProjectOutput'
 *       401:
 *         description: No autorizado.
 */
router.get('/', obtenerProyectos);

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: Obtener un proyecto por ID.
 *     tags: [Proyectos]
 *     security:
 *       - bearerAuth: []
 *     description: Devuelve los detalles de un proyecto específico.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del proyecto a obtener.
 *         example: "6056504f5450ae0015812f39"
 *     responses:
 *       200:
 *         description: Detalles del proyecto obtenidos exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProjectOutput'
 *       401:
 *         description: No autorizado.
 *       404:
 *         description: Proyecto no encontrado.
 */
router.get('/:id', obtenerProyectoPorId);

/**
 * @swagger
 * /projects/{id}:
 *   put:
 *     summary: Actualizar un proyecto existente.
 *     tags: [Proyectos]
 *     security:
 *       - bearerAuth: []
 *     description: Actualiza la información de un proyecto específico. Solo los campos proporcionados serán actualizados.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del proyecto a actualizar.
 *         example: "6056504f5450ae0015812f39"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProjectInput' # Reutilizamos ProjectInput, campos no obligatorios
 *     responses:
 *       200:
 *         description: Proyecto actualizado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProjectOutput'
 *       400:
 *         description: Datos de entrada inválidos.
 *       401:
 *         description: No autorizado.
 *       404:
 *         description: Proyecto no encontrado o cliente asociado no encontrado (si se cambia clienteId).
 */
router.put('/:id', validarProyecto, actualizarProyecto);

/**
 * @swagger
 * /projects/{id}/archive:
 *   patch:
 *     summary: Archivar un proyecto (soft delete).
 *     tags: [Proyectos]
 *     security:
 *       - bearerAuth: []
 *     description: Marca un proyecto como archivado (isArchived = true).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del proyecto a archivar.
 *         example: "6056504f5450ae0015812f39"
 *     responses:
 *       200:
 *         description: Proyecto archivado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProjectOutput' # Devuelve el proyecto actualizado
 *       401:
 *         description: No autorizado.
 *       404:
 *         description: Proyecto no encontrado.
 */
router.patch('/:id/archive', archivarProyecto);

/**
 * @swagger
 * /projects/{id}/recover:
 *   patch:
 *     summary: Recuperar un proyecto archivado.
 *     tags: [Proyectos]
 *     security:
 *       - bearerAuth: []
 *     description: Restaura un proyecto que fue previamente archivado.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del proyecto a recuperar.
 *         example: "6056504f5450ae0015812f39"
 *     responses:
 *       200:
 *         description: Proyecto recuperado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProjectOutput' # Devuelve el proyecto actualizado
 *       401:
 *         description: No autorizado.
 *       404:
 *         description: Proyecto no encontrado o no está archivado.
 */
router.patch('/:id/recover', recuperarProyectoArchivado);

/**
 * @swagger
 * /projects/{id}:
 *   delete:
 *     summary: Borrado físico (permanente) de un proyecto.
 *     tags: [Proyectos]
 *     security:
 *       - bearerAuth: []
 *     description: Elimina permanentemente un proyecto de la base de datos. Esta acción es irreversible.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del proyecto a eliminar permanentemente.
 *         example: "6056504f5450ae0015812f39"
 *     responses:
 *       200:
 *         description: Proyecto eliminado permanentemente.
 *       401:
 *         description: No autorizado.
 *       404:
 *         description: Proyecto no encontrado.
 */
router.delete('/:id', hardDeleteProyecto);

module.exports = router; 