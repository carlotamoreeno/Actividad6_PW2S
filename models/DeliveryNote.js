const mongoose = require('mongoose');

const deliveryNoteSchema = new mongoose.Schema({
  numeroAlbaran: {
    type: String,
    trim: true,
  },
  fechaEmision: {
    type: Date,
    required: [true, 'La fecha de emisión es obligatoria.'],
    default: Date.now,
  },
  proyecto: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'El proyecto es obligatorio.'],
    ref: 'Project',
  },
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'El cliente es obligatorio.'],
    ref: 'Client',
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  lineas: [
    {
      descripcion: {
        type: String,
        required: [true, 'La descripción de la línea es obligatoria.'],
        trim: true,
      },
      cantidad: {
        type: Number,
        required: [true, 'La cantidad es obligatoria.'],
        min: [0, 'La cantidad no puede ser negativa.'],
        default: 1,
      },
      unidad: { type: String, trim: true, default: 'unidad' },
      precioUnitario: {
        type: Number,
        min: [0, 'El precio no puede ser negativo.'],
        default: 0,
      },
    },
  ],
  observaciones: {
    type: String,
    trim: true,
  },
  estado: {
    type: String,
    enum: ['Borrador', 'Emitido', 'Firmado', 'Cancelado'],
    default: 'Borrador',
  },
  rutaFirmaSimulada: {
    type: String,
    trim: true,
  },
  fechaFirma: {
    type: Date,
  },
  rutaPdfSimulado: {
    type: String,
    trim: true,
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

deliveryNoteSchema.pre(/^find/, function(next) {
  if (this.getOptions().withDeleted !== true) {
    this.where({ eliminado: false });
  }
  next();
});

const DeliveryNote = mongoose.model('DeliveryNote', deliveryNoteSchema);

module.exports = DeliveryNote; 