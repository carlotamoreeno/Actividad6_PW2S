const request = require('supertest');
const app = require('../../server');
const http = require('http');
const { connectDB, disconnectDB, clearDB } = require('./dbHelper');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

let server;
let testUsers = {};

beforeAll(async () => {
  await connectDB();
  server = http.createServer(app).listen();
}, 60000);

// Después de todos los tests, desconectar la BD y el servidor
afterAll(async () => {
  await disconnectDB();
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
}, 60000);

beforeEach(async () => {
  await clearDB();
  await setupTestUsers();
}, 60000);

// Función para configurar usuarios de prueba
const setupTestUsers = async () => {
  try {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const validatedUser = await User.create({
      nombre: 'Usuario Validado',
      email: 'pruebajuan@test.com',
      password: hashedPassword,
      emailValidado: true
    });
    
    const pendingUser = await User.create({
      nombre: 'Usuario Pendiente',
      email: 'pruebapepe@test.com',
      password: hashedPassword,
      emailValidado: false,
      validacionToken: 'token-validacion-123'
    });

    const companyUser = await User.create({
      nombre: 'Usuario Empresa',
      email: 'compania@test.com',
      password: hashedPassword,
      emailValidado: true,
      empresa: {
        nombre: 'Empresa Test',
        direccion: 'Calle Prueba 123',
        telefono: '123456789',
        email: 'info@empresatest.com',
        cif: 'B12345678',
        web: 'www.empresatest.com'
      }
    });

    const noCompanyUser = await User.create({
      nombre: 'Usuario Sin Empresa',
      email: 'nocompania@test.com',
      password: hashedPassword,
      emailValidado: true
    });

    const resetUser = await User.create({
      nombre: 'Usuario Reset',
      email: 'reset@test.com',
      password: hashedPassword,
      emailValidado: true,
      resetPasswordToken: 'reset-token-123',
      resetPasswordExpires: Date.now() + 3600000
    });

    const deletedUser = await User.create({
      nombre: 'Usuario Eliminado',
      email: 'eliminado@test.com',
      password: hashedPassword,
      emailValidado: true,
      isDeleted: true,
      deletedAt: new Date()
    });

    testUsers = {
      validatedUser,
      pendingUser,
      companyUser,
      noCompanyUser,
      resetUser,
      deletedUser
    };

    Object.keys(testUsers).forEach(key => {
      testUsers[key].generateAuthToken = () => {
        return jwt.sign({ id: testUsers[key]._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
      };
    });

  } catch (error) {
    console.error('Error en setupTestUsers:', error);
    throw error;
  }
};

describe('API de Autenticación - /api/user', () => {
  const testUser = {
    nombre: 'Test User Register',
    email: 'testregister@example.com',
    password: 'password123',
  };

  describe('POST /api/auth/register (Registro de Usuario)', () => {
    const registrationUserEmail = 'testregister@example.com';
    const testUser = {
      nombre: 'Test User Register',
      email: registrationUserEmail,
      password: 'password123',
      nombreEmpresa: 'TestEmpresa',
    };

    beforeEach(async () => {
      await clearDB();
    });

    it('debería registrar un nuevo usuario exitosamente y devolver un token', async () => {
      const res = await request(server)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('message', 'Usuario registrado exitosamente. Por favor, revisa tu email para validar tu cuenta.');
      expect(res.body).toHaveProperty('token');
      expect(res.body.usuario).toMatchObject({
        nombre: testUser.nombre,
        email: testUser.email,
        validado: false,
      });

      const userInDb = await User.findOne({ email: testUser.email });
      expect(userInDb).not.toBeNull();
      expect(userInDb.nombre).toBe(testUser.nombre);
      expect(userInDb.password).not.toBe(testUser.password);
    }, 120000);

    it('debería fallar al registrar un usuario con un email ya existente', async () => {
      await request(server)
        .post('/api/auth/register')
        .send(testUser);

      const res = await request(server)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'El usuario ya existe.');
    });

    it('debería fallar si faltan campos requeridos (ej. email)', async () => {
      const { email, ...incompleteUser } = testUser;
      const res = await request(server)
        .post('/api/auth/register')
        .send(incompleteUser);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('errors');
      expect(Array.isArray(res.body.errors)).toBe(true);
      const emailErrorRegister = res.body.errors.find(err => err.path === 'email' || err.param === 'email');
      expect(emailErrorRegister).toBeDefined();
      expect(emailErrorRegister.msg).toMatch(/El correo electrónico es obligatorio|Debe proporcionar un correo electrónico válido/);
    });
  });

  describe('POST /api/auth/login (Login de Usuario)', () => {
    const loginUserEmail = 'testlogin@example.com';
    beforeEach(async () => {
      await User.create({
        nombre: 'Test LoginUser',
        email: loginUserEmail,
        password: 'password123',
        emailValidado: true,
      });
    });

    it('debería loguear un usuario existente con credenciales correctas y devolver un token', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ email: loginUserEmail, password: 'password123' });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Login exitoso.');
      expect(res.body).toHaveProperty('token');
      expect(res.body.usuario).toMatchObject({
        nombre: 'Test LoginUser',
        email: loginUserEmail,
      });
      expect(res.body.usuario).not.toHaveProperty('password');
    });

    it('debería fallar el login con contraseña incorrecta', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ email: loginUserEmail, password: 'wrongpassword' });
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'Credenciales inválidas.');
    });

    it('debería fallar el login con un email no registrado', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ email: 'donotexist@example.com', password: 'password123' });
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'Credenciales inválidas.');
    });

    it('debería fallar el login si faltan campos (ej. email o contraseña)', async () => {
      // Caso 1: Falta la contraseña
      let res = await request(server).post('/api/auth/login').send({ email: loginUserEmail });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('errors');
      expect(Array.isArray(res.body.errors)).toBe(true);
      const passwordError = res.body.errors.find(err => err.path === 'password' || err.param === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError.msg).toContain('La contraseña es obligatoria');


      // Caso 2: Falta el email
      res = await request(server).post('/api/auth/login').send({ password: 'password123' });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('errors');
      expect(Array.isArray(res.body.errors)).toBe(true);
      const emailErrorLogin = res.body.errors.find(err => err.path === 'email' || err.param === 'email');
      expect(emailErrorLogin).toBeDefined();
      expect(emailErrorLogin.msg).toMatch(/El correo electrónico es obligatorio|Debe proporcionar un correo electrónico válido/);
    });

    it('debería fallar el login si el usuario está soft-deleted (isDeleted: true)', async () => {
      const deletedUserEmail = 'deletedlogin@example.com';
      await User.create({
        nombre: 'Soft Deleted User',
        email: deletedUserEmail,
        password: 'password123',
        isDeleted: true,
        deletedAt: new Date()
      });

      const res = await request(server)
        .post('/api/auth/login')
        .send({
          email: deletedUserEmail,
          password: 'password123',
        });
      
      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('message', 'Esta cuenta ha sido eliminada. Por favor, contacta al soporte si crees que es un error.');
    });
  });

  describe('PUT /api/user/validation (Validación de Email)', () => {
    let validationToken;
    const validationUserEmail = 'validation@example.com';

    beforeEach(async () => {
      const userToValidate = {
        nombre: 'Validate User',
        email: validationUserEmail,
        password: 'password123',
      };
      await request(server).post('/api/auth/register').send(userToValidate);
      const userInDb = await User.findOne({ email: validationUserEmail });
      expect(userInDb).not.toBeNull();
      expect(userInDb.tokenValidacionEmail).toBeDefined();
      validationToken = userInDb.tokenValidacionEmail;
    });

    it('debería validar un usuario con un token válido', async () => {
      const res = await request(server)
        .put('/api/user/validation')
        .send({ token: validationToken });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Correo electrónico validado exitosamente.');

      const userInDb = await User.findOne({ email: validationUserEmail });
      expect(userInDb.validado).toBe(true);
      expect(userInDb.tokenValidacionEmail).toBeUndefined();
    });

    it('debería fallar la validación con un token inválido o expirado', async () => {
      const res = await request(server)
        .put('/api/user/validation')
        .send({ token: 'invalidtoken123' });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'Token de validación inválido o expirado.');
    });

    it('debería fallar si el token no se proporciona', async () => {
      const res = await request(server)
        .put('/api/user/validation')
        .send({});
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'Token de validación no proporcionado.');
    });

    it('debería fallar si el correo ya ha sido validado', async () => {
      await request(server).put('/api/user/validation').send({ token: validationToken });
      const res = await request(server)
        .put('/api/user/validation')
        .send({ token: validationToken });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe('Token de validación inválido o expirado.');
    });
  });

  describe('POST /api/auth/request-password-reset (Solicitud de Reseteo de Contraseña)', () => {
    const resetUserEmail = 'resetrequest@example.com';
    beforeEach(async () => {
      await User.create({
        nombre: 'Reset Request User',
        email: resetUserEmail,
        password: 'password123',
        validado: true
      });
    });

    it('debería devolver un mensaje de éxito si el email existe y generar token de reseteo', async () => {
      const res = await request(server)
        .post('/api/auth/request-password-reset')
        .send({ email: resetUserEmail });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Si tu correo electrónico está registrado, recibirás un enlace para resetear tu contraseña.');
      const userInDb = await User.findOne({ email: resetUserEmail });
      expect(userInDb.tokenReseteoPassword).toBeDefined();
      expect(userInDb.expiracionTokenReseteoPassword).toBeDefined();
    });

    it('debería devolver el mismo mensaje de éxito si el email NO existe (para no revelar existencia)', async () => {
      const res = await request(server)
        .post('/api/auth/request-password-reset')
        .send({ email: 'nonexistent@example.com' });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Si tu correo electrónico está registrado, recibirás un enlace para resetear tu contraseña.');
    });

    it('debería fallar si no se proporciona email', async () => {
      const res = await request(server)
        .post('/api/auth/request-password-reset')
        .send({});
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'El correo electrónico es requerido.');
    });
  });

  describe('POST /api/auth/reset-password (Reseteo de Contraseña)', () => {
    let resetToken;
    const userToResetEmail = 'userresetting@example.com';
    const newPassword = 'newSecurePassword123';

    beforeEach(async () => {
      const tempResetToken = require('crypto').randomBytes(20).toString('hex');
      await User.create({
        nombre: 'User Resetting Password',
        email: userToResetEmail,
        password: 'oldPassword123',
        validado: true,
        tokenReseteoPassword: tempResetToken,
        expiracionTokenReseteoPassword: new Date(Date.now() + 3600000)
      });
      resetToken = tempResetToken;
    });

    it('debería resetear la contraseña con un token válido y nueva contraseña', async () => {
      const res = await request(server)
        .post('/api/auth/reset-password')
        .send({ token: resetToken, nuevaPassword: newPassword });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Contraseña actualizada exitosamente.');

      const userInDb = await User.findOne({ email: userToResetEmail });
      expect(userInDb.tokenReseteoPassword).toBeUndefined();
      const isNewPasswordCorrect = await userInDb.compararPassword(newPassword);
      expect(isNewPasswordCorrect).toBe(true);
    });

    it('debería fallar si el token es inválido o expirado', async () => {
      const res = await request(server)
        .post('/api/auth/reset-password')
        .send({ token: 'invalidTokenXYZ', nuevaPassword: newPassword });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'Token de reseteo inválido o expirado.');
    });

    it('debería fallar si falta el token o la nueva contraseña', async () => {
      let res = await request(server).post('/api/auth/reset-password').send({ nuevaPassword: 'somepassword' });
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('El token y la nueva contraseña son requeridos');

      res = await request(server).post('/api/auth/reset-password').send({ token: 'sometoken' });
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('El token y la nueva contraseña son requeridos');
    });

    it('debería fallar si la nueva contraseña es demasiado corta', async () => {
       const res = await request(server)
        .post('/api/auth/reset-password')
        .send({ token: resetToken, nuevaPassword: '123' });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'La nueva contraseña debe tener al menos 6 caracteres.');
    });
  });

  describe('GET /api/user/me', () => {
    let token;
    let userId;

    beforeEach(async () => {
      const userResponse = await request(server)
        .post('/api/auth/register')
        .send({
          nombre: 'Test User Profile',
          email: 'profile@example.com',
          password: 'password123',
          nombreEmpresa: 'TestEmpresaProfile'
        });
      userId = userResponse.body.usuario._id;
      
      const user = await User.findOne({ email: 'profile@example.com' });
      user.emailValidado = true;
      user.tokenValidacionEmail = null;
      await user.save();

      const loginResponse = await request(server)
        .post('/api/auth/login')
        .send({
          email: 'profile@example.com',
          password: 'password123'
        });
      token = loginResponse.body.token;
    });

    it('debería obtener el perfil del usuario autenticado', async () => {
      const res = await request(server)
        .get('/api/user/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('usuario');
      expect(res.body.usuario.email).toBe('profile@example.com');
      expect(res.body.usuario._id).toBe(userId);
    });

    it('no debería obtener el perfil si no se provee token', async () => {
      const res = await request(server)
        .get('/api/user/me');
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'No autorizado, token no proporcionado o formato incorrecto.');
    });

    it('no debería obtener el perfil si el token es inválido', async () => {
      const res = await request(server)
        .get('/api/user/me')
        .set('Authorization', 'Bearer tokeninvalido123');

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'No autorizado, token inválido');
    });
  });

  describe('PATCH /api/user', () => {
    let token;
    let userId;

    beforeEach(async () => {
      const userResponse = await request(server)
        .post('/api/auth/register')
        .send({
          nombre: 'Update User',
          email: 'update@example.com',
          password: 'password123',
        });
      
      const user = await User.findOne({ email: 'update@example.com' });
      user.emailValidado = true;
      user.tokenValidacionEmail = null;
      await user.save();
      userId = user._id.toString();

      const loginResponse = await request(server)
        .post('/api/auth/login')
        .send({
          email: 'update@example.com',
          password: 'password123'
        });
      token = loginResponse.body.token;
    });

    it('debería actualizar el nombre del usuario autenticado', async () => {
      const res = await request(server)
        .patch('/api/user')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Updated Name' });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('usuario');
      expect(res.body.usuario.nombre).toBe('Updated Name');
      expect(res.body.usuario.email).toBe('update@example.com');

      const updatedUser = await User.findById(userId);
      expect(updatedUser.nombre).toBe('Updated Name');
    });

    it('debería actualizar el email del usuario autenticado (y requerir nueva validación)', async () => {
      const res = await request(server)
        .patch('/api/user')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'newupdate@example.com' });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.usuario.email).toBe('newupdate@example.com');
      expect(res.body.usuario.emailValidado).toBe(false);
      expect(res.body.usuario).toHaveProperty('tokenValidacionEmail');

      const updatedUser = await User.findById(userId);
      expect(updatedUser.email).toBe('newupdate@example.com');
      expect(updatedUser.emailValidado).toBe(false);
      expect(updatedUser.tokenValidacionEmail).not.toBeNull();
    });

    it('no debería permitir actualizar el password con esta ruta', async () => {
      const res = await request(server)
        .patch('/api/user')
        .set('Authorization', `Bearer ${token}`)
        .send({ password: 'newpassword123' });

      expect(res.statusCode).toEqual(200);
      const user = await User.findById(userId);
      const isMatch = await bcrypt.compare('newpassword123', user.password);
      expect(isMatch).toBe(false);
    });
     it('no debería actualizar si no se provee token', async () => {
      const res = await request(server)
        .patch('/api/user')
        .send({ nombre: 'No Auth Update' });
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'No autorizado, token no proporcionado o formato incorrecto.');
    });
  });

  describe('PATCH /api/user/company', () => {
    let token;
    let userId;

    beforeEach(async () => {
      await request(server)
        .post('/api/auth/register')
        .send({
          nombre: 'Company User',
          email: 'companyuser@example.com',
          password: 'password123',
          nombreEmpresa: 'Old Company'
        });

      const user = await User.findOne({ email: 'companyuser@example.com' });
      user.emailValidado = true;
      await user.save();
      userId = user._id.toString();

      const loginResponse = await request(server)
        .post('/api/auth/login')
        .send({
          email: 'companyuser@example.com',
          password: 'password123'
        });
      token = loginResponse.body.token;
    });

    it('debería actualizar la información de la empresa del usuario', async () => {
      const res = await request(server)
        .patch('/api/user/company')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombreEmpresa: 'New Awesome Company',
          direccionEmpresa: '123 Main St',
          infoAdicionalEmpresa: { sector: 'Tech' }
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('usuario');
      expect(res.body.usuario.empresa.nombre).toBe('New Awesome Company');
      expect(res.body.usuario.empresa.direccion).toBe('123 Main St');
      expect(res.body.usuario.empresa.infoAdicional.sector).toBe('Tech');

      const updatedUser = await User.findById(userId);
      expect(updatedUser.empresa.nombre).toBe('New Awesome Company');
      expect(updatedUser.empresa.direccion).toBe('123 Main St');
    });

    it('debería manejar campos opcionales no provistos', async () => {
      const res = await request(server)
        .patch('/api/user/company')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombreEmpresa: 'Only Name Company' });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.usuario.empresa.nombre).toBe('Only Name Company');
      
      const updatedUser = await User.findById(userId);
      expect(updatedUser.empresa.nombre).toBe('Only Name Company');
      expect(updatedUser.empresa.direccion).toBeUndefined();
    });

    it('no debería actualizar si no se provee token', async () => {
      const res = await request(server)
        .patch('/api/user/company')
        .send({ nombreEmpresa: 'No Auth Company' });
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'No autorizado, token no proporcionado o formato incorrecto.');
    });
  });

  describe('PATCH /api/user/change-password', () => {
    let token;
    const oldPassword = 'password123';
    const newPassword = 'newpassword456';

    beforeEach(async () => {
      await request(server)
        .post('/api/auth/register')
        .send({
          nombre: 'Password Change User',
          email: 'changepw@example.com',
          password: oldPassword,
        });

      const user = await User.findOne({ email: 'changepw@example.com' });
      user.emailValidado = true;
      await user.save();
      
      const loginResponse = await request(server)
        .post('/api/auth/login')
        .send({ email: 'changepw@example.com', password: oldPassword });
      token = loginResponse.body.token;
    });

    it('debería cambiar la contraseña del usuario autenticado', async () => {
      const res = await request(server)
        .patch('/api/user/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: oldPassword,
          newPassword: newPassword
        });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Contraseña actualizada correctamente.');

      const loginRes = await request(server)
        .post('/api/auth/login')
        .send({ email: 'changepw@example.com', password: newPassword });
      expect(loginRes.statusCode).toEqual(200);
      expect(loginRes.body).toHaveProperty('token');
    });

    it('no debería cambiar la contraseña si la contraseña actual es incorrecta', async () => {
      const res = await request(server)
        .patch('/api/user/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'wrongoldpassword',
          newPassword: newPassword
        });
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'La contraseña actual es incorrecta.');
    });

    it('no debería cambiar la contraseña si la nueva contraseña es demasiado corta', async () => {
      const res = await request(server)
        .patch('/api/user/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: oldPassword,
          newPassword: 'short'
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('errors'); 
      const passwordError = res.body.errors.find(err => err.param === 'newPassword' || err.path === 'newPassword');
      expect(passwordError).toBeDefined();
      expect(passwordError.msg).toContain('La nueva contraseña debe tener al menos');
    });

    it('no debería cambiar la contraseña si faltan campos', async () => {
      const res = await request(server)
        .patch('/api/user/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: oldPassword });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('errors');
    });
     it('no debería cambiar contraseña si no se provee token', async () => {
      const res = await request(server)
        .patch('/api/user/change-password')
        .send({ currentPassword: oldPassword, newPassword: newPassword });
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'No autorizado, token no proporcionado o formato incorrecto.');
    });
  });

  describe('PATCH /api/user/me/soft-delete', () => {
    let token;
    let userId;

    beforeEach(async () => {
      const email = 'softdelete@example.com';
      await request(server)
        .post('/api/auth/register')
        .send({ nombre: 'Soft Delete User', email, password: 'password123' });

      const user = await User.findOne({ email });
      user.emailValidado = true;
      await user.save();
      userId = user._id.toString();

      const loginResponse = await request(server)
        .post('/api/auth/login')
        .send({ email, password: 'password123' });
      token = loginResponse.body.token;
    });

    it('debería realizar un soft delete del usuario autenticado', async () => {
      const res = await request(server)
        .patch('/api/user/me/soft-delete')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Usuario marcado como eliminado correctamente.');

      const deletedUser = await User.findById(userId);
      expect(deletedUser.isDeleted).toBe(true);
      expect(deletedUser.deletedAt).not.toBeNull();

      const loginAttempt = await request(server)
        .post('/api/auth/login')
        .send({ email: 'softdelete@example.com', password: 'password123' });
      expect(loginAttempt.statusCode).toEqual(403);
      expect(loginAttempt.body).toHaveProperty('message', 'Esta cuenta ha sido eliminada. Por favor, contacta al soporte si crees que es un error.');
    });

    it('no debería permitir soft delete sin token', async () => {
      const res = await request(server)
        .patch('/api/user/me/soft-delete');
      
      expect(res.statusCode).toEqual(401);
    });
  });

});