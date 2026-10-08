const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { cleanText } = require('../cleaning/textCleaner');

let pdfParse = null;
try {
  pdfParse = require('pdf-parse');
} catch (e1) {
  try {
    pdfParse = require(path.resolve(__dirname, '../../../backend/node_modules/pdf-parse'));
  } catch (e2) {
    console.warn('pdf-parse module not found, will rely on built-in stream parser');
  }
}

/**
 * Unescapes special characters within PDF string literals.
 */
function unescapePdfString(str) {
  return str
    .replace(/\\([()])/g, '$1')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\([0-7]{1,3})/g, (m, oct) => String.fromCharCode(parseInt(oct, 8)));
}

/**
 * Extracts text directly from raw or compressed PDF streams.
 * Resilient against corrupted XRef tables, non-standard xrefs, and legacy PDF-1.3/1.4 structures.
 */
function extractFromPdfStreams(buffer) {
  const content = buffer.toString('binary');
  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  const matches = [...content.matchAll(streamRegex)];
  const extractedTokens = [];

  for (const m of matches) {
    let streamText = '';
    const rawBuffer = Buffer.from(m[1], 'binary');

    try {
      streamText = zlib.inflateSync(rawBuffer).toString('utf-8');
    } catch (e1) {
      try {
        streamText = zlib.unzipSync(rawBuffer).toString('utf-8');
      } catch (e2) {
        streamText = m[1];
      }
    }

    // Extract text in parentheses before Tj, ', "
    const tjMatches = [...streamText.matchAll(/\(([^)]*)\)\s*(?:Tj|'|")/g)];
    for (const t of tjMatches) {
      extractedTokens.push(unescapePdfString(t[1]));
    }

    // Extract text arrays in TJ operators: [(str1) 20 (str2)] TJ
    const arrayMatches = [...streamText.matchAll(/\[([\s\S]*?)\]\s*TJ/g)];
    for (const arr of arrayMatches) {
      const inner = [...arr[1].matchAll(/\(([^)]*)\)/g)];
      for (const item of inner) {
        extractedTokens.push(unescapePdfString(item[1]));
      }
    }
  }

  return extractedTokens.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Attempts OCR on embedded images (/DCTDecode) if PDF has no text layer.
 */
async function extractFromEmbeddedImages(buffer) {
  try {
    const Tesseract = require('tesseract.js');
    const content = buffer.toString('binary');
    const imageStreamRegex = /<<[^>]*\/Filter\s*\/DCTDecode[^>]*>>\s*stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    const matches = [...content.matchAll(imageStreamRegex)];

    for (const m of matches) {
      const imageBuf = Buffer.from(m[1], 'binary');
      if (imageBuf.length > 5000) {
        const { data: { text } } = await Tesseract.recognize(imageBuf, 'eng');
        const cleaned = cleanText(text || '');
        if (cleaned.length > 20) {
          return cleaned;
        }
      }
    }
  } catch (err) {
    // Tesseract or image extraction failed
  }
  return '';
}

const extractTextFromPdf = async (filePathOrBuffer) => {
  let dataBuffer;
  if (Buffer.isBuffer(filePathOrBuffer)) {
    dataBuffer = filePathOrBuffer;
  } else {
    dataBuffer = fs.readFileSync(filePathOrBuffer);
  }

  // 1. First attempt: standard pdf-parse
  if (typeof pdfParse === 'function') {
    try {
      const parsed = await pdfParse(dataBuffer, { max: 100 });
      const cleaned = cleanText(parsed.text || '');

      if (cleaned.length > 20) {
        return {
          text: cleaned,
          numPages: parsed.numpages || 1,
          info: parsed.info || {},
          hasText: true,
        };
      }
    } catch (err) {
      console.warn(`Standard pdf-parse failed (${err.message}). Activating PDF stream recovery fallback...`);
    }
  }

  // 2. Second attempt: Resilient direct stream recovery
  try {
    const recoveredText = extractFromPdfStreams(dataBuffer);
    const cleanedRecovered = cleanText(recoveredText);

    if (cleanedRecovered.length > 20) {
      return {
        text: cleanedRecovered,
        numPages: 1,
        info: { recoveredViaStream: true },
        hasText: true,
      };
    }
  } catch (err) {
    console.warn(`Stream recovery fallback failed: ${err.message}`);
  }

  // 3. Third attempt: Scanned PDF image OCR fallback
  try {
    const ocrText = await extractFromEmbeddedImages(dataBuffer);
    if (ocrText && ocrText.length > 20) {
      return {
        text: ocrText,
        numPages: 1,
        info: { recoveredViaOcr: true },
        hasText: true,
      };
    }
  } catch (err) {
    console.warn(`Embedded OCR fallback failed: ${err.message}`);
  }

  return {
    text: '',
    numPages: 1,
    info: {},
    hasText: false,
    message: "We couldn't extract readable text from this PDF document.",
  };
};

module.exports = {
  extractTextFromPdf,
  extractFromPdfStreams,
};
