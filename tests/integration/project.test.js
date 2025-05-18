const request = require('supertest');
const mongoose = require('mongoose');
const createApp = require('../../server');
const User = require('../../models/User');
const Client = require('../../models/Client');
const Project = require('../../models/Project');

describe('API de Proyectos', () => {
  let app;
  
  beforeAll(async () => {
    app = await createApp();
    console.log('Aplicación inicializada correctamente');
  }, 30000);
  
  beforeEach(async () => {
    await Project.deleteMany({});
    await Client.deleteMany({});
    await User.deleteMany({ email: 'test.project@example.com' });
  });
  
  test('Debería requerir autenticación para acceder a proyectos', async () => {
    const response = await request(app)
      .get('/api/projects');
    
    expect(response.status).toBe(401);
  });
  
  test('Debería permitir el flujo completo de gestión de proyectos', async () => {
    const userData = {
      nombre: 'Usuario Test Proyecto',
      email: 'test.project@example.com',
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
      nombre: 'Cliente Test Proyecto',
      email: 'cliente.test@example.com',
      telefono: '123456789'
    };
    
    const clientResponse = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${token}`)
      .send(clientData);
    
    expect(clientResponse.status).toBe(201);
    const clientId = clientResponse.body._id;
    
    const projectData = {
      nombre: 'Proyecto Test',
      descripcion: 'Descripción del proyecto de test',
      clienteId: clientId
    };
    
    const createProjectResponse = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send(projectData);
    
    expect(createProjectResponse.status).toBe(201);
    expect(createProjectResponse.body).toHaveProperty('proyecto');
    const projectId = createProjectResponse.body.proyecto._id;
    
    const getProjectsResponse = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`);
    
    expect(getProjectsResponse.status).toBe(200);
    expect(Array.isArray(getProjectsResponse.body)).toBe(true);
    expect(getProjectsResponse.body.length).toBeGreaterThan(0);
    
    const getProjectResponse = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(getProjectResponse.status).toBe(200);
    expect(getProjectResponse.body.nombre).toBe(projectData.nombre);

    const updateData = {
      nombre: 'Proyecto Actualizado',
      descripcion: 'Descripción actualizada',
      clienteId: clientId
    };
    
    const updateResponse = await request(app)
      .put(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updateData);
    
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.proyecto.nombre).toBe(updateData.nombre);
    
    const archiveResponse = await request(app)
      .patch(`/api/projects/${projectId}/archive`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(archiveResponse.status).toBe(200);
    expect(archiveResponse.body.message).toContain('archivado');
    
    const recoverResponse = await request(app)
      .patch(`/api/projects/${projectId}/recover`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(recoverResponse.status).toBe(200);
    expect(recoverResponse.body.message).toContain('recuperado');
    
    const deleteResponse = await request(app)
      .delete(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.message).toContain('eliminado');
  }, 30000);
}); 