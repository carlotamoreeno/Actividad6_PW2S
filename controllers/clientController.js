const Client = require('../models/Client');
const User = require('../models/User');

/**
 * @desc    Crear un nuevo cliente
 * @route   POST /api/clients
 * @access  Private
 */
const crearCliente = async (req, res) => {
  try {
    const { nombre, email, telefono, direccion } = req.body;
    const usuarioId = req.user.id;

    if (!nombre) {
      return res.status(400).json({ message: 'El nombre del cliente es obligatorio.' });
    }

    // Obtener la empresa del usuario para asignarla al cliente
    const usuario = await User.findById(usuarioId);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const nuevoCliente = new Client({
      nombre,
      email,
      telefono,
      direccion,
      usuario: usuarioId,
      empresa: usuario.empresa ? usuario.empresa._id : null,
      isDeleted: false
    });

    await nuevoCliente.save();
    
    // Enviamos el cliente como respuesta directo
    res.status(201).json(nuevoCliente);

  } catch (error) {
    if (error.name === 'ValidationError') {
      const mensajes = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: mensajes.join(', ') });
    }
    console.error('Error en crearCliente:', error);
    res.status(500).json({ message: 'Error del servidor al crear el cliente.', error: error.message });
  }
};

/**
 * @desc    Obtener todos los clientes del usuario autenticado
 * @route   GET /api/clients
 * @access  Private
 */
const obtenerClientes = async (req, res) => {
  try {
    const incluirEliminados = req.query.includeDeleted === 'true';
    let query = { usuario: req.user.id };
    
    if (!incluirEliminados) {
      query.isDeleted = { $ne: true };
    }
    
    const clientes = await Client.find(query);
    
    // Devolvemos los clientes en un objeto anidado
    res.status(200).json({ clientes });
  } catch (error) {
    console.error('Error en obtenerClientes:', error);
    res.status(500).json({ message: 'Error del servidor al obtener los clientes.', error: error.message });
  }
};

/**
 * @desc    Obtener un cliente específico por su ID
 * @route   GET /api/clients/:id
 * @access  Private
 */
const obtenerClientePorId = async (req, res) => {
  try {
    const cliente = await Client.findOne({ _id: req.params.id, usuario: req.user.id, isDeleted: { $ne: true } });

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado.' });
    }
    res.status(200).json(cliente);
  } catch (error) {
    console.error('Error en obtenerClientePorId:', error);
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Cliente no encontrado (ID inválido).' });
    }
    res.status(500).json({ message: 'Error del servidor al obtener el cliente.', error: error.message });
  }
};

/**
 * @desc    Actualizar un cliente existente
 * @route   PUT /api/clients/:id
 * @access  Private
 */
const actualizarCliente = async (req, res) => {
  try {
    const { nombre, email, telefono, direccion } = req.body;
    const clienteId = req.params.id;
    const usuarioId = req.user.id;

    // Encontrar cliente y actualizar en una sola operación con nuevo, ttrue para devolver el documento actualizado
    const clienteActualizado = await Client.findOneAndUpdate(
      { _id: clienteId, usuario: usuarioId, isDeleted: { $ne: true } },
      { 
        $set: { 
          nombre: nombre || undefined,
          email: email !== undefined ? email : undefined,
          telefono: telefono !== undefined ? telefono : undefined,
          ...(direccion ? { direccion } : {})
        } 
      },
      { new: true, runValidators: true }
    );

    if (!clienteActualizado) {
      return res.status(404).json({ message: 'Cliente no encontrado o no pertenece al usuario.' });
    }

    // Devolvemos directamente el cliente actualizado
    res.status(200).json(clienteActualizado);

  } catch (error) {
    if (error.name === 'ValidationError') {
      const mensajes = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: mensajes.join(', ') });
    }
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Cliente no encontrado (ID inválido).' });
    }
    console.error('Error en actualizarCliente:', error);
    res.status(500).json({ message: 'Error del servidor al actualizar el cliente.', error: error.message });
  }
};

/**
 * @desc    Borrado lógico (soft delete) de un cliente
 * @route   DELETE /api/clients/:id/soft
 * @access  Private
 */
const softDeleteCliente = async (req, res) => {
  try {
    const cliente = await Client.findOne({ _id: req.params.id, usuario: req.user.id, isDeleted: { $ne: true } });

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado o no pertenece al usuario.' });
    }

    cliente.isDeleted = true;
    cliente.deletedAt = new Date();
    await cliente.save();

    res.status(200).json({ message: 'Cliente marcado como eliminado (soft delete).' });
  } catch (error) {
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Cliente no encontrado (ID inválido).' });
    }
    console.error('Error en softDeleteCliente:', error);
    res.status(500).json({ message: 'Error del servidor al realizar el soft delete del cliente.', error: error.message });
  }
};

/**
 * @desc    Recuperar un cliente archivado (soft deleted)
 * @route   PATCH /api/clients/:id/recover
 * @access  Private
 */
const recuperarClienteArchivado = async (req, res) => {
  try {
    // Buscamos un cliente que esté eliminado y sea del usuario
    const cliente = await Client.findOne({ _id: req.params.id, usuario: req.user.id, isDeleted: true });

    if (!cliente) {
      return res.status(400).json({ message: 'El cliente no está eliminado (soft delete), no se puede recuperar.' });
    }

    cliente.isDeleted = false;
    cliente.deletedAt = null;
    await cliente.save();

    res.status(200).json({ message: 'Cliente recuperado exitosamente.' });
  } catch (error) {
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Cliente no encontrado (ID inválido).' });
    }
    console.error('Error en recuperarClienteArchivado:', error);
    res.status(500).json({ message: 'Error del servidor al recuperar el cliente.', error: error.message });
  }
};

/**
 * @desc    Borrado físico (hard delete) de un cliente
 * @route   DELETE /api/clients/:id/hard
 * @access  Private
 */
const hardDeleteCliente = async (req, res) => {
  try {
    // Para el hard delete, buscamos incluyendo los borrados lógicamente
    const cliente = await Client.findOne({ _id: req.params.id, usuario: req.user.id });

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado o no pertenece al usuario.' });
    }

    // Borrado físico del cliente
    await Client.deleteOne({ _id: req.params.id, usuario: req.user.id });

    res.status(200).json({ message: 'Cliente eliminado permanentemente (hard delete).' });
  } catch (error) {
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Cliente no encontrado (ID inválido).' });
    }
    console.error('Error en hardDeleteCliente:', error);
    res.status(500).json({ message: 'Error del servidor al realizar el hard delete del cliente.', error: error.message });
  }
};

module.exports = {
  crearCliente,
  obtenerClientes,
  obtenerClientePorId,
  actualizarCliente,
  softDeleteCliente,
  recuperarClienteArchivado,
  hardDeleteCliente
}; 