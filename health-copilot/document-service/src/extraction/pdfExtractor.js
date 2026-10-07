const fs = require('fs');
const pdfParse = require('pdf-parse');
const { cleanText } = require('../cleaning/textCleaner');

const extractTextFromPdf = async (filePathOrBuffer) => {
  try {
    let dataBuffer;
    if (Buffer.isBuffer(filePathOrBuffer)) {
      dataBuffer = filePathOrBuffer;
    } else {
      dataBuffer = fs.readFileSync(filePathOrBuffer);
    }

    const options = {
      // Maximum page render or limit
      max: 100,
    };

    const parsed = await pdfParse(dataBuffer, options);
    const cleaned = cleanText(parsed.text);

    return {
      text: cleaned,
      numPages: parsed.numpages || 1,
      info: parsed.info || {},
      hasText: cleaned.length > 20,
    };
  } catch (error) {
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};

module.exports = {
  extractTextFromPdf,
};
