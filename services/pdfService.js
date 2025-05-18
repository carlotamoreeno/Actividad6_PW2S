const PdfPrinter = require('pdfmake');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const fonts = {
  Courier: {
    normal: 'Courier',
    bold: 'Courier-Bold',
    italics: 'Courier-Oblique',
    bolditalics: 'Courier-BoldOblique'
  },
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  },
  Times: {
    normal: 'Times-Roman',
    bold: 'Times-Bold',
    italics: 'Times-Italic',
    bolditalics: 'Times-BoldItalic'
  },
  Symbol: {
    normal: 'Symbol'
  },
  ZapfDingbats: {
    normal: 'ZapfDingbats'
  }
};

/**
 * Mock de generación de PDF para entorno de pruebas
 * @param {object} datosAlbaran - Datos del albarán
 * @returns {Promise<Buffer>} - Buffer simulado
 */
const generarPdfAlbaranMock = async (datosAlbaran) => {
  try {
    logger.info(`Iniciando generación de PDF para albarán ID: ${datosAlbaran.numeroAlbaran || datosAlbaran._id || 'N/A'}`);
    
    const pdfBuffer = Buffer.from('PDF simulado para pruebas');
    
    logger.info(`PDF generado exitosamente para albarán ID: ${datosAlbaran.numeroAlbaran || datosAlbaran._id || 'N/A'}. Tamaño: ${pdfBuffer.length} bytes.`);
    
    return pdfBuffer;
  } catch (error) {
    logger.error(`Error generando PDF para albarán ID: ${datosAlbaran.numeroAlbaran || datosAlbaran._id || 'N/A'}:`, error);
    throw error;
  }
};

/**
 * Genera un PDF real para un albarán
 * @param {object} datosAlbaran - Datos del albarán
 * @returns {Promise<Buffer>} - Buffer con el PDF
 */
const generarPdfAlbaranReal = async (datosAlbaran) => {
  return new Promise((resolve, reject) => {
    try {
      logger.info(`Iniciando generación de PDF para albarán ID: ${datosAlbaran.numeroAlbaran || datosAlbaran._id || 'N/A'}`);
      
      const printer = new PdfPrinter(fonts);

      const documentDefinition = {
        content: [
          { text: 'ALBARÁN', style: 'header' },
          { text: `Número de Albarán: ${datosAlbaran.numeroAlbaran || 'PENDIENTE'}`, style: 'subheader' },
          { text: `Fecha: ${new Date(datosAlbaran.fecha || Date.now()).toLocaleDateString('es-ES')}`, style: 'subheader' },
          '\n',
          { text: 'Cliente:', style: 'fieldHeader' },
          { text: datosAlbaran.cliente ? (datosAlbaran.cliente.nombreComercial || datosAlbaran.cliente.nombre || 'N/A') : 'Cliente no especificado' },
          datosAlbaran.cliente && datosAlbaran.cliente.direccion ? { text: datosAlbaran.cliente.direccion } : {text: ''}, 
          '\n',
          { text: 'Proyecto:', style: 'fieldHeader' },
          { text: datosAlbaran.proyecto ? (datosAlbaran.proyecto.nombre || 'N/A') : 'Proyecto no especificado' },
          '\n',
          { text: 'Conceptos:', style: 'fieldHeader' },
          {
            ul: datosAlbaran.conceptos && datosAlbaran.conceptos.length > 0 ? 
                datosAlbaran.conceptos.map(c => `${c.descripcion || 'Concepto sin descripción'} - Cantidad: ${c.cantidad || 1} - Precio: ${c.precioUnitario ? c.precioUnitario.toFixed(2) : 'N/A'} €`) :
                ['No hay conceptos detallados.']
          },
          '\n',
          {
            columns: [
              { 
                text: `Albarán:${datosAlbaran.numeroAlbaran || 'N/A'}\nCliente:${datosAlbaran.cliente ? (datosAlbaran.cliente.nombreComercial || datosAlbaran.cliente.nombre || 'N/A') : 'N/A'}\nFecha:${new Date(datosAlbaran.fecha || Date.now()).toLocaleDateString('es-ES')}`, 
                width: '50%' 
              },
              { text: 'Firma del Cliente:\n\n\n_________________________', alignment: 'right', width: '50%' }
            ]
          },
          '\n',
          datosAlbaran.observaciones ? { text: 'Observaciones:', style: 'fieldHeader' } : {text: ''}, 
          datosAlbaran.observaciones ? { text: datosAlbaran.observaciones } : {text: ''}, 
        ],
        styles: {
          header: {
            fontSize: 22,
            bold: true,
            alignment: 'center',
            margin: [0, 0, 0, 20]
          },
          subheader: {
            fontSize: 12,
            margin: [0, 0, 0, 5]
          },
          fieldHeader: {
            fontSize: 10,
            bold: true,
            margin: [0, 5, 0, 2]
          }
        },
        defaultStyle: {
          font: 'Helvetica'
        }
      };

      const pdfDoc = printer.createPdfKitDocument(documentDefinition);
      
      let chunks = [];
      pdfDoc.on('data', (chunk) => {
        chunks.push(chunk);
      });

      pdfDoc.on('end', () => {
        const result = Buffer.concat(chunks);
        logger.info(`PDF generado exitosamente para albarán ID: ${datosAlbaran.numeroAlbaran || datosAlbaran._id || 'N/A'}. Tamaño: ${result.length} bytes.`);
        resolve(result);
      });

      pdfDoc.on('error', (err) => {
        logger.error(`Error generando PDF para albarán ID: ${datosAlbaran.numeroAlbaran || datosAlbaran._id || 'N/A'}:`, err);
        reject(err);
      });

      pdfDoc.end();

    } catch (error) {
      logger.error('Excepción en generarPdfAlbaran:', error);
      reject(error);
    }
  });
};

const generarPdfAlbaran = process.env.NODE_ENV === 'test' ? 
  generarPdfAlbaranMock : 
  generarPdfAlbaranReal;

module.exports = {
  generarPdfAlbaran
}; 