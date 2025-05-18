const Project = require('../models/Project');
const Client = require('../models/Client');

/**
 * @desc    Crear un nuevo proyecto
 * @route   POST /api/projects
 * @access  Private
 */
const crearProyecto = async (req, res) => {
  try {
    const { nombre, descripcion, estado, clienteId } = req.body;
    const usuarioId = req.user.id;

    if (!nombre || !clienteId) {
      return res.status(400).json({ message: 'El nombre del proyecto y el ID del cliente son obligatorios.' });
    }

    // Verificar que el cliente exista y pertenezca al usuario autenticado
    const clienteExistente = await Client.findOne({ _id: clienteId, usuario: usuarioId });
    if (!clienteExistente) {
      return res.status(404).json({ message: 'Cliente no encontrado o no pertenece al usuario.' });
    }

    const nuevoProyecto = new Project({
      nombre,
      descripcion,
      estado,
      cliente: clienteId,
      usuario: usuarioId,
    });

    await nuevoProyecto.save();
    res.status(201).json({ message: 'Proyecto creado exitosamente.', proyecto: nuevoProyecto });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const mensajes = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: mensajes.join(', ') });
    }
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: 'ID de cliente inválido.' });
    }
    console.error('Error en crearProyecto:', error);
    res.status(500).json({ message: 'Error del servidor al crear el proyecto.', error: error.message });
  }
};

/**
 * @desc    Obtener todos los proyectos del usuario autenticado (opcionalmente filtrar por cliente)
 * @route   GET /api/projects
 * @access  Private
 */
const obtenerProyectos = async (req, res) => {
  try {
    const query = { usuario: req.user.id };
    if (req.query.clienteId) {
      query.cliente = req.query.clienteId;
    }
    
    const includeArchived = req.query.includeArchived === 'true';
    let options = {};
    
    if (includeArchived) {
      options.withDeleted = true; 
    }
    
    const proyectos = await Project.find(query, null, options)
      .populate('cliente', 'nombre email');
    
    res.status(200).json(proyectos);

  } catch (error) {
    console.error('Error en obtenerProyectos:', error);
    res.status(500).json({ message: 'Error del servidor al obtener los proyectos.', error: error.message });
  }
};

/**
 * @desc    Obtener un proyecto específico por su ID
 * @route   GET /api/projects/:id
 * @access  Private
 */
const obtenerProyectoPorId = async (req, res) => {
  try {
    const proyecto = await Project.findOne({ _id: req.params.id, usuario: req.user.id })
                             .populate('cliente', 'nombre email telefono');
    if (!proyecto) {
      return res.status(404).json({ message: 'Proyecto no encontrado o no pertenece al usuario.' });
    }
    res.status(200).json(proyecto);
  } catch (error) {
    console.error('Error en obtenerProyectoPorId:', error);
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Proyecto no encontrado (ID inválido).' });
    }
    res.status(500).json({ message: 'Error del servidor al obtener el proyecto.', error: error.message });
  }
};

/**
 * @desc    Actualizar un proyecto existente
 * @route   PUT /api/projects/:id
 * @access  Private
 */
const actualizarProyecto = async (req, res) => {
  try {
    const { nombre, descripcion, estado, clienteId } = req.body;
    const proyectoId = req.params.id;
    const usuarioId = req.user.id;

    const proyecto = await Project.findOne({ _id: proyectoId, usuario: usuarioId });

    if (!proyecto) {
      return res.status(404).json({ message: 'Proyecto no encontrado o no pertenece al usuario.' });
    }

    // Actualizar campos
    proyecto.nombre = nombre || proyecto.nombre;
    proyecto.descripcion = descripcion !== undefined ? descripcion : proyecto.descripcion;
    proyecto.estado = estado || proyecto.estado;

    if (clienteId && clienteId.toString() !== proyecto.cliente.toString()) {
        const clienteExistente = await Client.findOne({ _id: clienteId, usuario: usuarioId });
        if (!clienteExistente) {
            return res.status(404).json({ message: 'Nuevo cliente no encontrado o no pertenece al usuario.' });
        }
        proyecto.cliente = clienteId;
    }

    const proyectoActualizado = await proyecto.save();
    await proyectoActualizado.populate('cliente', 'nombre email');
    
    res.status(200).json({ message: 'Proyecto actualizado exitosamente.', proyecto: proyectoActualizado });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const mensajes = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: mensajes.join(', ') });
    }
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'ID inválido para proyecto o cliente.' });
    }
    console.error('Error en actualizarProyecto:', error);
    res.status(500).json({ message: 'Error del servidor al actualizar el proyecto.', error: error.message });
  }
};

/**
 * @desc    Archivar un proyecto (soft delete)
 * @route   PATCH /api/projects/:id/archive
 * @access  Private
 */
const archivarProyecto = async (req, res) => {
  try {
    const proyecto = await Project.findOne({ _id: req.params.id, usuario: req.user.id });

    if (!proyecto) {
      return res.status(404).json({ message: 'Proyecto no encontrado o no pertenece al usuario.' });
    }

    if (proyecto.isArchived || proyecto.estado === 'Archivado') {
        return res.status(400).json({ message: 'El proyecto ya está archivado.' });
    }

    proyecto.estado = 'Archivado';
    proyecto.isArchived = true;
    proyecto.archivedAt = new Date();
    await proyecto.save();

    res.status(200).json({ message: 'Proyecto archivado exitosamente.', proyecto });
  } catch (error) {
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Proyecto no encontrado (ID inválido).' });
    }
    console.error('Error en archivarProyecto:', error);
    res.status(500).json({ message: 'Error del servidor al archivar el proyecto.', error: error.message });
  }
};

/**
 * @desc    Recuperar un proyecto archivado
 * @route   PATCH /api/projects/:id/recover
 * @access  Private
 */
const recuperarProyectoArchivado = async (req, res) => {
  try {
    const proyecto = await Project.findOne({ _id: req.params.id, usuario: req.user.id })
                                .setOptions({ withDeleted: true });

    if (!proyecto) {
      return res.status(404).json({ message: 'Proyecto no encontrado o no pertenece al usuario.' });
    }

    if (!proyecto.isArchived && proyecto.estado !== 'Archivado') {
      return res.status(400).json({ message: 'El proyecto no está archivado, no se puede recuperar.' });
    }

    proyecto.estado = 'Pendiente';
    proyecto.isArchived = false;
    proyecto.archivedAt = null;
    await proyecto.save();

    res.status(200).json({ message: 'Proyecto recuperado exitosamente.', proyecto });
  } catch (error) {
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Proyecto no encontrado (ID inválido).' });
    }
    console.error('Error en recuperarProyectoArchivado:', error);
    res.status(500).json({ message: 'Error del servidor al recuperar el proyecto.', error: error.message });
  }
};

/**
 * @desc    Borrado físico (hard delete) de un proyecto
 * @route   DELETE /api/projects/:id
 * @access  Private
 */
const hardDeleteProyecto = async (req, res) => {
  try {
    const proyecto = await Project.findOne({ _id: req.params.id, usuario: req.user.id });

    if (!proyecto) {
      return res.status(404).json({ message: 'Proyecto no encontrado o no pertenece al usuario.' });
    }

    await Project.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Proyecto eliminado permanentemente.' });
  } catch (error) {
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Proyecto no encontrado (ID inválido).' });
    }
    console.error('Error en hardDeleteProyecto:', error);
    res.status(500).json({ message: 'Error del servidor al eliminar físicamente el proyecto.', error: error.message });
  }
};

module.exports = {
  crearProyecto,
  obtenerProyectos,
  obtenerProyectoPorId,
  actualizarProyecto,
  archivarProyecto,
  recuperarProyectoArchivado,
  hardDeleteProyecto,
}; 