const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre del cliente es obligatorio.'],
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^$|^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Por favor, introduce un correo electrónico válido para el cliente.'],
  },
  telefono: {
    type: String,
    trim: true,
  },
  direccion: {
    calle: { type: String, trim: true },
    ciudad: { type: String, trim: true },
    codigoPostal: { type: String, trim: true },
    provincia: { type: String, trim: true },
    pais: { type: String, trim: true, default: 'España' },
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  empresa: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

const Client = mongoose.model('Client', clientSchema);

module.exports = Client; 