const DeliveryNote = require('../models/DeliveryNote');
const Project = require('../models/Project');
const Client = require('../models/Client');
const { generarPdfAlbaran } = require('../services/pdfService');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const storagePdfFirmadosDir = path.join(__dirname, '../storage/ficheros-generados');

const ensureStorageDirExists = (dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      logger.info(`Creando directorio de almacenamiento en: ${dirPath}`);
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (error) {
    logger.error(`Error al crear directorio ${dirPath}:`, error);
    throw error;
  }
};

try {
  ensureStorageDirExists(storagePdfFirmadosDir);
} catch (err) {
  logger.error(`Error al crear directorio de PDFs firmados: ${err}`);
}

/**
 * @desc    Crear un nuevo albarán (simple o con múltiples líneas)
 * @route   POST /api/deliverynotes
 * @access  Private
 */
const crearAlbaran = async (req, res) => {
  try {
    const {
      numeroAlbaran,
      fechaEmision,
      proyectoId,
      proyecto,
      lineas,
      conceptos,
      observaciones,
      estado,
    } = req.body;
    const usuarioId = req.user.id;

    const lineasFinales = lineas || conceptos || [];
    const proyectoIdFinal = proyectoId || proyecto;

    if (!proyectoIdFinal || !lineasFinales || lineasFinales.length === 0) {
      return res.status(400).json({ message: 'Las líneas son obligatorias y deben ser un array no vacío.' });
    }

    // Verificar que el proyecto exista y pertenezca al usuario
    const proyectoExistente = await Project.findOne({ _id: proyectoIdFinal, usuario: usuarioId });
    if (!proyectoExistente) {
      return res.status(404).json({ message: 'Proyecto no encontrado o no pertenece al usuario.' });
    }

    // Obtener el cliente del proyecto para asegurar consistencia y guardarlo en el albarán
    const clienteDelProyecto = proyectoExistente.cliente;

    const nuevoAlbaran = new DeliveryNote({
      numeroAlbaran,
      fechaEmision,
      proyecto: proyectoIdFinal,
      cliente: clienteDelProyecto,
      usuario: usuarioId,
      lineas: lineasFinales,
      observaciones,
      estado,
    });

    await nuevoAlbaran.save();

    await nuevoAlbaran.populate([
        { path: 'proyecto', select: 'nombre estado' },
        { path: 'cliente', select: 'nombre' },
        { path: 'usuario', select: 'nombre email' }
    ]);

    res.status(201).json(nuevoAlbaran);

  } catch (error) {
    if (error.name === 'ValidationError') {
      const mensajes = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: mensajes.join(', ') });
    }
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: 'ID de proyecto inválido.' });
    }
    console.error('Error en crearAlbaran:', error);
    res.status(500).json({ message: 'Error del servidor al crear el albarán.', error: error.message });
  }
};

/**
 * @desc    Obtener todos los albaranes del usuario autenticado (opcionalmente filtrar por proyecto o cliente)
 * @route   GET /api/deliverynotes
 * @access  Private
 */
const obtenerAlbaranes = async (req, res) => {
  try {
    const query = { usuario: req.user.id };
    if (req.query.proyectoId) {
      query.proyecto = req.query.proyectoId;
    }
    if (req.query.clienteId) {
      query.cliente = req.query.clienteId;
    }

    const albaranes = await DeliveryNote.find(query)
      .populate('proyecto', 'nombre estado')
      .populate('cliente', 'nombre')
      .sort({ fechaEmision: -1 });

    res.status(200).json({ albaranes });
  } catch (error) {
    console.error('Error en obtenerAlbaranes:', error);
    res.status(500).json({ message: 'Error del servidor al obtener los albaranes.', error: error.message });
  }
};

/**
 * @desc    Obtener un albarán específico por su ID
 * @route   GET /api/deliverynotes/:id
 * @access  Private
 */
const obtenerAlbaranPorId = async (req, res) => {
  try {
    const albaran = await DeliveryNote.findOne({ _id: req.params.id, usuario: req.user.id })
      .populate('proyecto', 'nombre descripcion estado')
      .populate('cliente', 'nombre email telefono direccion')
      .populate('usuario', 'nombre email');

    if (!albaran) {
      return res.status(404).json({ message: 'Albarán no encontrado o no pertenece al usuario.' });
    }
    res.status(200).json(albaran);
  } catch (error) {
    console.error('Error en obtenerAlbaranPorId:', error);
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Albarán no encontrado (ID inválido).' });
    }
    res.status(500).json({ message: 'Error del servidor al obtener el albarán.', error: error.message });
  }
};

/**
 * @desc    Eliminar un albarán (lógicamente, solo si no está firmado)
 * @route   DELETE /api/deliverynotes/:id
 * @access  Private
 */
const eliminarAlbaran = async (req, res) => {
  try {
    const albaran = await DeliveryNote.findOne({ _id: req.params.id, usuario: req.user.id });

    if (!albaran) {
      return res.status(404).json({ message: 'Albarán no encontrado o no pertenece al usuario.' });
    }

    // Verificar si el albarán está firmado
    if (albaran.estado === 'Firmado') {
      return res.status(400).json({ message: 'No se puede eliminar un albarán que ya ha sido firmado.' });
    }
    
    // Verificar si ya está eliminado lógicamente
    if (albaran.eliminado) {
        return res.status(400).json({ message: 'El albarán ya ha sido eliminado.' });
    }

    // Realizar borrado lógico
    albaran.eliminado = true;
    albaran.fechaEliminacion = new Date();
    await albaran.save();

    res.status(200).json({ message: 'Albarán eliminado exitosamente.' });

  } catch (error) {
    console.error('Error en eliminarAlbaran:', error);
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Albarán no encontrado (ID inválido).' });
    }
    res.status(500).json({ message: 'Error del servidor al eliminar el albarán.', error: error.message });
  }
};

/**
 * @desc    Descargar un albarán en formato PDF
 * @route   GET /api/deliverynotes/:id/download-pdf
 * @access  Private
 */
const descargarAlbaranPdf = async (req, res) => {
  try {
    const albaran = await DeliveryNote.findOne({ _id: req.params.id, usuario: req.user.id })
      .populate('proyecto', 'nombre')
      .populate('cliente', 'nombre email direccion');

    if (!albaran) {
      return res.status(404).json({ message: 'Albarán no encontrado o no pertenece al usuario.' });
    }

    const datosAlbaranParaPdf = {
        ...albaran.toObject(),
        cliente: albaran.cliente ? albaran.cliente.toObject() : { nombre: 'Cliente no especificado'},
        proyecto: albaran.proyecto ? albaran.proyecto.toObject() : { nombre: 'Proyecto no especificado'}
    };

    const pdfBuffer = await generarPdfAlbaran(datosAlbaranParaPdf);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="albaran_${albaran.numeroAlbaran || albaran._id}.pdf"`);
    
    res.send(pdfBuffer);

  } catch (error) {
    logger.error(`Error en descargarAlbaranPdf para el albarán ${req.params.id}:`, error);
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Albarán no encontrado (ID inválido).' });
    }
    res.status(500).json({ message: 'Error del servidor al generar el PDF del albarán.', error: error.message });
  }
};

/**
 * @desc    Subir imagen de firma para un albarán
 * @route   PATCH /api/deliverynotes/:id/sign
 * @access  Private
 */
const subirFirmaAlbaran = async (req, res) => {
  const albaranId = req.params.id;
  const usuarioId = req.user.id;

  if (!req.file) {
    return res.status(400).json({ message: 'No se ha subido ningún archivo de firma.' });
  }

  try {
    const albaran = await DeliveryNote.findOne({ _id: albaranId, usuario: usuarioId });

    if (!albaran) {
      return res.status(404).json({ message: 'Albarán no encontrado o no pertenece al usuario.' });
    }

    if (albaran.estado === 'Firmado') {
      return res.status(400).json({ message: 'Este albarán ya ha sido firmado.' });
    }
    if (albaran.estado === 'Cancelado' || albaran.eliminado) {
      return res.status(400).json({ message: 'No se puede firmar un albarán cancelado o eliminado.' });
    }

    // Actualizar el albarán con la información de la firma
    albaran.rutaFirmaSimulada = req.file.path;
    albaran.estado = 'Firmado';
    albaran.fechaFirma = new Date();

    const albaranActualizado = await albaran.save();
    
    // Popular para la respuesta
    await albaranActualizado.populate([
        { path: 'proyecto', select: 'nombre estado' },
        { path: 'cliente', select: 'nombre' },
        { path: 'usuario', select: 'nombre email' }
    ]);

    logger.info(`Albarán ID: ${albaranId} firmado exitosamente por usuario ID: ${usuarioId}. Firma guardada en: ${req.file.path}`);
    res.status(200).json({
      message: 'Albarán firmado exitosamente.',
      albaran: albaranActualizado
    });

  } catch (error) {
    logger.error(`Error al firmar el albarán ID ${albaranId}:`, error);
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Albarán no encontrado (ID inválido).' });
    }
    res.status(500).json({ message: 'Error del servidor al firmar el albarán.', error: error.message });
  }
};

/**
 * @desc    "Subir" (guardar localmente) el PDF de un albarán firmado.
 * @route   POST /api/deliverynotes/:id/upload-signed-pdf
 * @access  Private
 */
const subirPdfFirmadoSimulado = async (req, res) => {
  const albaranId = req.params.id;
  const usuarioId = req.user.id;

  try {
    // Asegurar que el directorio existe
    ensureStorageDirExists(storagePdfFirmadosDir);

    const albaran = await DeliveryNote.findOne({ _id: albaranId, usuario: usuarioId })
      .populate('proyecto', 'nombre')
      .populate('cliente', 'nombre email direccion');

    if (!albaran) {
      return res.status(404).json({ message: 'Albarán no encontrado o no pertenece al usuario.' });
    }

    if (albaran.estado !== 'Firmado') {
      return res.status(400).json({ message: 'El albarán debe estar firmado antes de poder subir el PDF.' });
    }

    const datosAlbaranParaPdf = {
        ...albaran.toObject(),
        cliente: albaran.cliente ? albaran.cliente.toObject() : { nombre: 'Cliente no especificado'},
        proyecto: albaran.proyecto ? albaran.proyecto.toObject() : { nombre: 'Proyecto no especificado'}
    };
    
    const pdfBuffer = await generarPdfAlbaran(datosAlbaranParaPdf);

    const nombreArchivoPdf = `albaran_firmado_${albaran.numeroAlbaran || albaranId}_${Date.now()}.pdf`;
    const rutaCompletaPdf = path.join(storagePdfFirmadosDir, nombreArchivoPdf);

    fs.writeFileSync(rutaCompletaPdf, pdfBuffer);

    albaran.rutaPdfSimulado = rutaCompletaPdf; 
    await albaran.save();

    logger.info(`PDF firmado del albaran ID: ${albaranId} "subido" (guardado) a: ${rutaCompletaPdf}`);
    res.status(200).json({
      message: 'PDF del albarán firmado generado y guardado (simulado).',
      rutaPdf: rutaCompletaPdf,
      albaran: {
        _id: albaran._id,
        estado: albaran.estado,
        rutaPdfSimulado: albaran.rutaPdfSimulado
      }
    });

  } catch (error) {
    logger.error(`Error al "subir" PDF firmado del albarán ID ${albaranId}:`, error);
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Albarán no encontrado (ID inválido).' });
    }
    res.status(500).json({ message: 'Error del servidor al "subir" el PDF firmado del albarán.', error: error.message });
  }
};

module.exports = {
  crearAlbaran,
  obtenerAlbaranes,
  obtenerAlbaranPorId,
  eliminarAlbaran,
  descargarAlbaranPdf,
  subirFirmaAlbaran,
  subirPdfFirmadoSimulado
}; 