const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre del proyecto es obligatorio.'],
    trim: true,
  },
  descripcion: {
    type: String,
    trim: true,
  },
  estado: {
    type: String,
    enum: ['Pendiente', 'En Progreso', 'Completado', 'Archivado', 'Cancelado'],
    default: 'Pendiente',
  },
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'El cliente es obligatorio para el proyecto.'],
    ref: 'Client',
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  isArchived: {
    type: Boolean,
    default: false,
  },
  archivedAt: {
    type: Date,
    default: null,
  },
  eliminado: {
    type: Boolean,
    default: false,
  },
  fechaEliminacion: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

projectSchema.pre(/^find/, function(next) {
  if (this.getOptions().withDeleted !== true) {
    this.where({ isArchived: false });
  }
  next();
});

const Project = mongoose.model('Project', projectSchema);

module.exports = Project; 