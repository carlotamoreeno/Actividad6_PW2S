const express = require('express');
const router = express.Router();
const {
  crearAlbaran,
  obtenerAlbaranes,
  obtenerAlbaranPorId,
  eliminarAlbaran,
  descargarAlbaranPdf,
  subirFirmaAlbaran,
  subirPdfFirmadoSimulado,
} = require('../controllers/deliveryNoteController');
const { protegerRuta } = require('../middleware/authMiddleware');
const { uploadFirma } = require('../middleware/uploadMiddleware');
const { validarAlbaran } = require('../middleware/validationMiddleware');

/**
 * @swagger
 * tags:
 *   name: Albaranes
 *   description: Endpoints para la gestión de albaranes (Delivery Notes).
 */

router.use(protegerRuta);

/**
 * @swagger
 * /deliverynotes:
 *   post:
 *     summary: Crear un nuevo albarán.
 *     tags: [Albaranes]
 *     security:
 *       - bearerAuth: []
 *     description: Crea uno o más albaranes asociados al usuario, cliente y proyecto.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeliveryNoteInput' # Podría ser un array si se permite creación múltiple en una request
 *     responses:
 *       201:
 *         description: Albarán(es) creado(s) exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeliveryNoteOutput' # O array de DeliveryNoteOutput
 *       400:
 *         description: Datos de entrada inválidos.
 *       401:
 *         description: No autorizado.
 *       404:
 *         description: Cliente o Proyecto asociado no encontrado.
 */
router.post('/', validarAlbaran, crearAlbaran);

/**
 * @swagger
 * /deliverynotes:
 *   get:
 *     summary: Obtener listado de albaranes.
 *     tags: [Albaranes]
 *     security:
 *       - bearerAuth: []
 *     description: Devuelve una lista de albaranes del usuario autenticado, con opciones de filtrado.
 *     parameters:
 *       - in: query
 *         name: clienteId
 *         schema:
 *           type: string
 *         description: Filtrar albaranes por ID de cliente.
 *       - in: query
 *         name: proyectoId
 *         schema:
 *           type: string
 *         description: Filtrar albaranes por ID de proyecto.
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [Pendiente, Firmado, Facturado, Cancelado]
 *         description: Filtrar albaranes por estado.
 *     responses:
 *       200:
 *         description: Lista de albaranes obtenida exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DeliveryNoteOutput'
 *       401:
 *         description: No autorizado.
 */
router.get('/', obtenerAlbaranes);

/**
 * @swagger
 * /deliverynotes/{id}:
 *   get:
 *     summary: Obtener un albarán por ID.
 *     tags: [Albaranes]
 *     security:
 *       - bearerAuth: []
 *     description: Devuelve los detalles de un albarán específico, con datos asociados populados.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del albarán a obtener.
 *     responses:
 *       200:
 *         description: Detalles del albarán obtenidos exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeliveryNoteOutput'
 *       401:
 *         description: No autorizado.
 *       404:
 *         description: Albarán no encontrado.
 */
router.get('/:id', obtenerAlbaranPorId);

/**
 * @swagger
 * /deliverynotes/{id}:
 *   delete:
 *     summary: Eliminar un albarán.
 *     tags: [Albaranes]
 *     security:
 *       - bearerAuth: []
 *     description: Elimina un albarán si no está firmado. (Implementa soft delete o hard delete según la lógica del controlador).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del albarán a eliminar.
 *     responses:
 *       200:
 *         description: Albarán eliminado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: No se puede eliminar un albarán firmado.
 *       401:
 *         description: No autorizado.
 *       404:
 *         description: Albarán no encontrado.
 */
router.delete('/:id', eliminarAlbaran);

/**
 * @swagger
 * /deliverynotes/{id}/download-pdf:
 *   get:
 *     summary: Descargar un albarán en formato PDF.
 *     tags: [Albaranes]
 *     security:
 *       - bearerAuth: []
 *     description: Genera y devuelve el albarán en formato PDF.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del albarán para generar el PDF.
 *     responses:
 *       200:
 *         description: PDF del albarán generado exitosamente.
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: No autorizado.
 *       404:
 *         description: Albarán no encontrado.
 *       500:
 *         description: Error al generar el PDF.
 */
router.get('/:id/download-pdf', descargarAlbaranPdf);

/**
 * @swagger
 * /deliverynotes/{id}/sign:
 *   patch:
 *     summary: Firmar un albarán subiendo una imagen.
 *     tags: [Albaranes]
 *     security:
 *       - bearerAuth: []
 *     description: Sube una imagen de firma, la asocia al albarán y actualiza su estado a 'Firmado'.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del albarán a firmar.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               firma:
 *                 type: string
 *                 format: binary
 *                 description: Archivo de imagen de la firma (PNG, JPG).
 *     responses:
 *       200:
 *         description: Albarán firmado y actualizado correctamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 albaran:
 *                   $ref: '#/components/schemas/DeliveryNoteOutput'
 *       400:
 *         description: No se subió archivo, albarán ya firmado, o error de validación.
 *       401:
 *         description: No autorizado.
 *       404:
 *         description: Albarán no encontrado.
 */
router.patch('/:id/sign', uploadFirma, subirFirmaAlbaran);

/**
 * @swagger
 * /deliverynotes/{id}/upload-signed-pdf:
 *   post:
 *     summary: Simular la subida de un PDF firmado de un albarán.
 *     tags: [Albaranes]
 *     security:
 *       - bearerAuth: []
 *     description: Para un albarán ya marcado como 'Firmado', este endpoint simula la generación y "subida" (guardado local) de su PDF final.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del albarán firmado cuyo PDF se va a "subir".
 *     responses:
 *       200:
 *         description: PDF del albarán firmado generado y guardado (simulado).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 albaran:
 *                   $ref: '#/components/schemas/DeliveryNoteOutput' # Albarán con la ruta al PDF simulado actualizada
 *       400:
 *         description: El albarán no está firmado o error al generar el PDF.
 *       401:
 *         description: No autorizado.
 *       404:
 *         description: Albarán no encontrado.
 */
router.post('/:id/upload-signed-pdf', subirPdfFirmadoSimulado);

// Rutas para firma, descarga PDF, etc. se añadirán aquí
// Ejemplo:
// router.post('/:id/sign', firmarAlbaran);
// router.get('/:id/download-pdf', descargarAlbaranPdf);

module.exports = router; 