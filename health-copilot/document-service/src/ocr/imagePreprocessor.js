const fs = require('fs');

/**
 * Bounds-safe Image Metadata & Preprocessing Inspector
 *
 * Safely parses image formats (JPEG, PNG, WebP) without external C/native binaries.
 * Validates dimensions, handles EXIF orientation, and prevents RangeError on binary buffer reads.
 */

/**
 * Safely reads a 16-bit unsigned integer in Big Endian format.
 * Returns null if offset + 2 exceeds buffer length (prevents RangeError).
 */
const safeReadUInt16BE = (buffer, offset) => {
  if (!Buffer.isBuffer(buffer) || offset < 0 || offset + 2 > buffer.length) {
    return null;
  }
  return buffer.readUInt16BE(offset);
};

/**
 * Safely reads a 32-bit unsigned integer in Big Endian format.
 * Returns null if offset + 4 exceeds buffer length (prevents RangeError).
 */
const safeReadUInt32BE = (buffer, offset) => {
  if (!Buffer.isBuffer(buffer) || offset < 0 || offset + 4 > buffer.length) {
    return null;
  }
  return buffer.readUInt32BE(offset);
};

/**
 * Extracts EXIF orientation tag from JPEG APP1 segment if present.
 */
const parseJpegExifOrientation = (buffer, app1Offset, app1Length) => {
  try {
    const endOffset = Math.min(buffer.length, app1Offset + app1Length);
    // Needs at least "Exif\0\0" (6 bytes) + TIFF header (8 bytes)
    if (app1Offset + 14 > endOffset) return 1;

    // Verify "Exif\0\0"
    if (
      buffer[app1Offset] !== 0x45 ||
      buffer[app1Offset + 1] !== 0x78 ||
      buffer[app1Offset + 2] !== 0x69 ||
      buffer[app1Offset + 3] !== 0x66
    ) {
      return 1;
    }

    const tiffOffset = app1Offset + 6;
    const isLittleEndian = buffer[tiffOffset] === 0x49 && buffer[tiffOffset + 1] === 0x49; // "II"
    const isBigEndian = buffer[tiffOffset] === 0x4D && buffer[tiffOffset + 1] === 0x4D; // "MM"

    if (!isLittleEndian && !isBigEndian) return 1;

    const readU16 = (off) => {
      if (off + 2 > endOffset) return null;
      return isBigEndian ? buffer.readUInt16BE(off) : buffer.readUInt16LE(off);
    };

    const readU32 = (off) => {
      if (off + 4 > endOffset) return null;
      return isBigEndian ? buffer.readUInt32BE(off) : buffer.readUInt32LE(off);
    };

    const firstIfdOffset = readU32(tiffOffset + 4);
    if (!firstIfdOffset || tiffOffset + firstIfdOffset >= endOffset) return 1;

    const ifdStart = tiffOffset + firstIfdOffset;
    const numEntries = readU16(ifdStart);
    if (!numEntries || numEntries > 100) return 1;

    for (let i = 0; i < numEntries; i++) {
      const entryOffset = ifdStart + 2 + i * 12;
      if (entryOffset + 12 > endOffset) break;
      const tag = readU16(entryOffset);
      if (tag === 0x0112) { // Orientation tag
        const orientation = readU16(entryOffset + 8);
        if (orientation && orientation >= 1 && orientation <= 8) {
          return orientation;
        }
      }
    }
  } catch (err) {
    // Non-fatal EXIF reading failure
  }
  return 1;
};

/**
 * Inspects image metadata (width, height, format, EXIF orientation).
 * Guaranteed to never throw RangeError on malformed, truncated, or zero-byte buffers.
 *
 * @param {Buffer|string} bufferOrPath
 * @returns {{ isValid: boolean, format: string, width: number, height: number, orientation: number, error: string|null }}
 */
const getImageMetadata = (bufferOrPath) => {
  try {
    let buf;
    if (Buffer.isBuffer(bufferOrPath)) {
      buf = bufferOrPath;
    } else if (typeof bufferOrPath === 'string' && fs.existsSync(bufferOrPath)) {
      buf = fs.readFileSync(bufferOrPath);
    } else {
      return { isValid: false, format: 'unknown', width: 0, height: 0, orientation: 1, error: 'File unreadable or does not exist' };
    }

    if (!buf || buf.length < 8) {
      return { isValid: false, format: 'unknown', width: 0, height: 0, orientation: 1, error: 'Buffer is too small to be a valid image' };
    }

    // 1. JPEG Detection
    if (buf[0] === 0xFF && buf[1] === 0xD8) {
      let offset = 2;
      let orientation = 1;
      let width = 0;
      let height = 0;

      while (offset + 4 <= buf.length) {
        if (buf[offset] !== 0xFF) {
          offset++;
          continue;
        }

        const marker = buf[offset + 1];
        // Standalone markers without length
        if (marker === 0xD8 || marker === 0xD9 || (marker >= 0xD0 && marker <= 0xD7)) {
          offset += 2;
          continue;
        }

        const segmentLength = safeReadUInt16BE(buf, offset + 2);
        if (segmentLength === null || segmentLength < 2) break;

        // APP1 for Exif
        if (marker === 0xE1) {
          orientation = parseJpegExifOrientation(buf, offset + 4, segmentLength - 2);
        }

        // SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2) contain image dimensions
        if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
          if (offset + 9 <= buf.length) {
            height = safeReadUInt16BE(buf, offset + 5) || 0;
            width = safeReadUInt16BE(buf, offset + 7) || 0;
            break;
          }
        }

        offset += 2 + segmentLength;
      }

      if (width > 0 && height > 0) {
        return { isValid: true, format: 'jpeg', width, height, orientation, error: null };
      }
      return { isValid: false, format: 'jpeg', width: 0, height: 0, orientation: 1, error: 'Could not extract valid JPEG dimensions' };
    }

    // 2. PNG Detection
    if (
      buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
      buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A
    ) {
      if (buf.length >= 24) {
        const width = safeReadUInt32BE(buf, 16) || 0;
        const height = safeReadUInt32BE(buf, 20) || 0;
        if (width > 0 && height > 0) {
          return { isValid: true, format: 'png', width, height, orientation: 1, error: null };
        }
      }
      return { isValid: false, format: 'png', width: 0, height: 0, orientation: 1, error: 'Malformed PNG IHDR header' };
    }

    return { isValid: false, format: 'unknown', width: 0, height: 0, orientation: 1, error: 'Unsupported or unrecognized image header' };
  } catch (err) {
    return { isValid: false, format: 'unknown', width: 0, height: 0, orientation: 1, error: err.message };
  }
};

/**
 * Validates crop rectangle coordinates against image dimensions.
 * Prevents out-of-bounds crop crashes.
 *
 * @param {Object} rect - { left, top, width, height }
 * @param {number} imgWidth
 * @param {number} imgHeight
 * @returns {{ isValid: boolean, rect: Object, error: string|null }}
 */
const validateCropRectangle = (rect, imgWidth, imgHeight) => {
  if (!rect || typeof rect !== 'object') {
    return { isValid: false, rect: null, error: 'Crop rectangle must be an object' };
  }

  let left = typeof rect.left === 'number' ? Math.floor(rect.left) : 0;
  let top = typeof rect.top === 'number' ? Math.floor(rect.top) : 0;
  let width = typeof rect.width === 'number' ? Math.floor(rect.width) : 0;
  let height = typeof rect.height === 'number' ? Math.floor(rect.height) : 0;

  if (left < 0 || top < 0 || width <= 0 || height <= 0) {
    return { isValid: false, rect: null, error: 'Crop coordinates must be non-negative with positive width and height' };
  }

  if (imgWidth > 0 && left + width > imgWidth) {
    width = Math.max(1, imgWidth - left);
  }
  if (imgHeight > 0 && top + height > imgHeight) {
    height = Math.max(1, imgHeight - top);
  }

  return {
    isValid: true,
    rect: { left, top, width, height },
    error: null,
  };
};

module.exports = {
  getImageMetadata,
  validateCropRectangle,
  safeReadUInt16BE,
  safeReadUInt32BE,
};
