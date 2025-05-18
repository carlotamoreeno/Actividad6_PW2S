const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Crear directorio de logs si no existe
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFilePath = path.join(logsDir, 'error.log');

const logger = {
  info: (message) => {
    const logMessage = `[${new Date().toISOString()}] INFO: ${message}\n`;
    console.log(logMessage.trim());
  },
  warn: (message) => {
    const logMessage = `[${new Date().toISOString()}] WARN: ${message}\n`;
    console.warn(logMessage.trim());
  },
  error: (message, errorObject) => {
    let logMessage = `[${new Date().toISOString()}] ERROR: ${message}\n`;
    if (errorObject && errorObject.stack) {
      logMessage += `Stack: ${errorObject.stack}\n`;
    }
    
    console.error(logMessage.trim());

    try {
      fs.appendFileSync(logFilePath, logMessage, 'utf8');
    } catch (err) {
      console.error('Fallo al escribir en el archivo de log de errores:', err);
    }

    if (process.env.SLACK_WEBHOOK_URL && process.env.NODE_ENV === 'production') {
      console.log('(Simulación) Notificación de error enviada a Slack.');
    }
  },
};

module.exports = logger; 