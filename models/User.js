const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio.'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'El correo electrónico es obligatorio.'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Por favor, introduce un correo electrónico válido.'],
  },
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria.'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres.'],
  },
  empresa: {
    _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId(), auto: true },
    nombre: { type: String, trim: true, default: null },
    direccion: { type: String, trim: true, default: null },
    cif: { type: String, trim: true, default: null },
    telefono: { type: String, trim: true, default: null },
    emailEmpresa: { type: String, trim: true, lowercase: true, default: null }, 
    web: { type: String, trim: true, default: null },
  },
  validado: {
    type: Boolean,
    default: false,
  },
  tokenValidacionEmail: {
    type: String,
  },
  expiracionTokenValidacionEmail: {
    type: Date,
  },
  tokenReseteoPassword: {
    type: String,
  },
  expiracionTokenReseteoPassword: {
    type: Date,
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

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.compararPassword = async function (passwordIntroducida) {
  return await bcrypt.compare(passwordIntroducida, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User; 