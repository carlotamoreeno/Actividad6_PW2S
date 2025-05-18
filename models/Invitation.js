const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  invitedEmail: {
    type: String,
    required: [true, 'El correo electrónico del invitado es obligatorio.'],
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Por favor, introduce un correo electrónico válido para el invitado.'],
  },
  companyName: {
    type: String,
    required: [true, 'El nombre de la empresa es obligatorio para la invitación.'],
    trim: true,
  },
  inviter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  expiration: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'expired', 'rejected'],
    default: 'pending',
  },
}, {
  timestamps: true,
});

invitationSchema.index({ invitedEmail: 1, companyName: 1, status: 1 });

const Invitation = mongoose.model('Invitation', invitationSchema);

module.exports = Invitation; 