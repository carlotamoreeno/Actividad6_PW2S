const request = require('supertest');
const mongoose = require('mongoose');
const createApp = require('../../server');
const User = require('../../models/User');
const Client = require('../../models/Client');

describe('API de Clientes', () => {
  let app;
  
  beforeAll(async () => {
    app = await createApp();
    console.log('Aplicación inicializada correctamente');
  }, 30000);
  
  beforeEach(async () => {
    await Client.deleteMany({});
    await User.deleteMany({ email: 'test.client@example.com' });
  });
  
  test('Debería requerir autenticación para acceder a clientes', async () => {
    const response = await request(app)
      .get('/api/clients');
    
    expect(response.status).toBe(401);
  });
  
  test('Debería permitir el flujo completo de gestión de clientes', async () => {
    const userData = {
      nombre: 'Usuario Test Cliente',
      email: 'test.client@example.com',
      password: 'Password123',
      emailValidado: true
    };
    
    const user = await User.create(userData);
    
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });
    
    expect(loginResponse.status).toBe(200);
    const token = loginResponse.body.token;
    
    const clientData = {
      nombre: 'Cliente Test',
      email: 'cliente.test@example.com',
      telefono: '123456789',
      direccion: 'Calle Test 123',
      notas: 'Cliente de prueba para tests'
    };
    
    const createClientResponse = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${token}`)
      .send(clientData);
    
    expect(createClientResponse.status).toBe(201);
    const clientId = createClientResponse.body._id;
    
    const getClientsResponse = await request(app)
      .get('/api/clients')
      .set('Authorization', `Bearer ${token}`);
    
    expect(getClientsResponse.status).toBe(200);
    expect(getClientsResponse.body).toBeDefined();
    if (Array.isArray(getClientsResponse.body)) {
      expect(getClientsResponse.body.length).toBeGreaterThan(0);
    } else if (getClientsResponse.body.clientes && Array.isArray(getClientsResponse.body.clientes)) {
      expect(getClientsResponse.body.clientes.length).toBeGreaterThan(0);
    }
    
    const getClientResponse = await request(app)
      .get(`/api/clients/${clientId}`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(getClientResponse.status).toBe(200);
    const receivedClient = getClientResponse.body;
    expect(receivedClient.nombre).toBe(clientData.nombre);
    
    const updateData = {
      nombre: 'Cliente Actualizado',
      email: 'cliente.actualizado@example.com'
    };
    
    const updateResponse = await request(app)
      .put(`/api/clients/${clientId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updateData);
    
    expect(updateResponse.status).toBe(200);
    const updatedClient = updateResponse.body;
    expect(updatedClient.nombre).toBe(updateData.nombre);
    
    const archiveResponse = await request(app)
      .delete(`/api/clients/${clientId}/soft`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(archiveResponse.status).toBe(200);
    expect(archiveResponse.body.message).toContain('eliminado');
    
    const recoverResponse = await request(app)
      .patch(`/api/clients/${clientId}/recover`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(recoverResponse.status).toBe(200);
    expect(recoverResponse.body.message).toContain('recuperado');
        
    const deleteResponse = await request(app)
      .delete(`/api/clients/${clientId}/hard`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.message).toContain('eliminado');
  }, 30000);
}); 