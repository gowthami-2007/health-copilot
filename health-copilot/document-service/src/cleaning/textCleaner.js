/**
 * Normalizes and sanitizes raw extracted text from PDFs or OCR scans.
 */
const cleanText = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    return '';
  }

  return rawText
    // Remove null bytes and non-printable control characters (except newline, carriage return, tab)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize unicode spaces
    .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
    // Replace 3+ consecutive newlines with 2
    .replace(/\n{3,}/g, '\n\n')
    // Replace multiple horizontal spaces with single space
    .replace(/[ \t]+/g, ' ')
    // Trim each line
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
};

module.exports = {
  cleanText,
};
