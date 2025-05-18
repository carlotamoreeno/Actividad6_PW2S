// __mocks__/nodemailer.js
// Este fichero crea versiones simuladas (mocks) de las funciones de nodemailer para tests con Jest.
// Proporciona un mock del transportador de correos y todas sus funciones principales.
// Permite probar código que envía emails sin enviar correos reales durante las pruebas.
const mockSendMail = jest.fn();
const mockVerify = jest.fn();
const mockCreateTestAccount = jest.fn();
const mockGetTestMessageUrl = jest.fn();

const mockTransporter = {
  sendMail: mockSendMail,
  verify: mockVerify,
};

const mockCreateTransport = jest.fn(() => mockTransporter);

module.exports = {
  createTransport: mockCreateTransport,
  createTestAccount: mockCreateTestAccount,
  getTestMessageUrl: mockGetTestMessageUrl,
  __esModule: true, 
  mockSendMailInstance: mockSendMail,
  mockVerifyInstance: mockVerify,
  mockCreateTestAccountInstance: mockCreateTestAccount,
  mockGetTestMessageUrlInstance: mockGetTestMessageUrl,
  mockCreateTransportInstance: mockCreateTransport, 
}; 