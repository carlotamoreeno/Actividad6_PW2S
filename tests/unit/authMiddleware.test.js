const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { protegerRuta } = require('../../middleware/authMiddleware');
const logger = require('../../utils/logger');

jest.mock('jsonwebtoken');
jest.mock('../../models/User');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

process.env.JWT_SECRET = 'testsecretfordevauth';

describe('Middleware de Autenticación - protegerRuta', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      headers: {},
      user: null,
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {},
    };
    mockNext = jest.fn();
  });

  it('debería llamar a next() y adjuntar el usuario a req si el token es válido y el usuario existe y no está eliminado', async () => {
    mockReq.headers.authorization = 'Bearer validtoken123';
    const mockDecodedToken = { id: 'userId123' };
    const mockUser = {
      _id: 'userId123',
      nombre: 'Test User',
      email: 'test@example.com',
      isDeleted: false,
    };
    
    jwt.verify.mockReturnValue(mockDecodedToken);
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) }); 

    await protegerRuta(mockReq, mockRes, mockNext);

    expect(jwt.verify).toHaveBeenCalledWith('validtoken123', process.env.JWT_SECRET);
    expect(User.findById).toHaveBeenCalledWith('userId123');
    expect(mockReq.user).toEqual(mockUser);
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('debería responder con 401 si no se proporciona token', async () => {
    await protegerRuta(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'No autorizado, token no proporcionado o formato incorrecto.' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('debería responder con 401 si el token no tiene el formato Bearer', async () => {
    mockReq.headers.authorization = 'Invalidtokenformat';
    await protegerRuta(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'No autorizado, token no proporcionado o formato incorrecto.' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('debería responder con 401 si jwt.verify lanza un error (token inválido/expirado)', async () => {
    mockReq.headers.authorization = 'Bearer invalidtoken456';
    const tokenError = new Error('Token verification failed');
    tokenError.name = 'JsonWebTokenError';
    jwt.verify.mockImplementation(() => {
      throw tokenError;
    });

    await protegerRuta(mockReq, mockRes, mockNext);

    expect(jwt.verify).toHaveBeenCalledWith('invalidtoken456', process.env.JWT_SECRET);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'No autorizado, token inválido.' });
    expect(mockNext).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error en protegerRuta durante jwt.verify: Token verification failed'), 
      { token: 'invalidtoken456' }
    );
  });

  it('debería responder con 401 si el usuario del token no se encuentra en la BD', async () => {
    mockReq.headers.authorization = 'Bearer validtokenuserunknown';
    const mockDecodedToken = { id: 'unknownUserId' };
    jwt.verify.mockReturnValue(mockDecodedToken);
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    await protegerRuta(mockReq, mockRes, mockNext);

    expect(User.findById).toHaveBeenCalledWith('unknownUserId');
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'No autorizado, usuario no encontrado.' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('debería responder con 403 si el usuario encontrado está marcado como isDeleted', async () => {
    mockReq.headers.authorization = 'Bearer validtokendeleteduser';
    const mockDecodedToken = { id: 'deletedUserId' };
    const mockDeletedUser = {
      _id: 'deletedUserId',
      nombre: 'Deleted User',
      isDeleted: true,
    };
    jwt.verify.mockReturnValue(mockDecodedToken);
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(mockDeletedUser) });

    await protegerRuta(mockReq, mockRes, mockNext);

    expect(User.findById).toHaveBeenCalledWith('deletedUserId');
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Acceso prohibido, cuenta de usuario eliminada o inactiva.' });
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockReq.user).toBeNull();
  });

  it('debería responder con 500 si User.findById lanza un error inesperado', async () => {
    mockReq.headers.authorization = 'Bearer validtokenforDBError';
    const mockDecodedToken = { id: 'userIdWithDBError' };
    jwt.verify.mockReturnValue(mockDecodedToken);
    
    User.findById.mockReturnValue({
      select: jest.fn().mockRejectedValue(new Error('Simulated DB Error'))
    });

    await protegerRuta(mockReq, mockRes, mockNext);

    expect(jwt.verify).toHaveBeenCalledWith('validtokenforDBError', process.env.JWT_SECRET);
    expect(User.findById).toHaveBeenCalledWith('userIdWithDBError');
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ 
      message: 'Error del servidor al verificar la autenticación.',
      detalles: 'Simulated DB Error'
    });
    expect(mockNext).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error en protegerRuta'), expect.anything());
  });

  it('debería responder con 401 si el header de autorización falta o no es Bearer', async () => {
    await protegerRuta(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'No autorizado, token no proporcionado o formato incorrecto.' });
    expect(mockNext).not.toHaveBeenCalled();

    mockRes.status.mockClear();
    mockRes.json.mockClear();
    mockNext.mockClear();

    mockReq.headers.authorization = 'NotBearer someothertoken';
    await protegerRuta(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'No autorizado, token no proporcionado o formato incorrecto.' });
    expect(mockNext).not.toHaveBeenCalled();
  });
}); 