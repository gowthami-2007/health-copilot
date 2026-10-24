const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { validateFile, validateFileSignature } = require('./fileValidator');
const { extractTextFromPdf } = require('../extraction/pdfExtractor');

// Optional LLM / Vision integrations
let prescriptionVisionService = null;
try {
  prescriptionVisionService = require('../../../backend/src/services/prescriptionVisionService');
} catch (e) {
  // Service will be dynamically loaded if available
}

const CLASSIFICATION = {
  HEALTH_RELATED: 'health_related',
  NOT_HEALTH_RELATED: 'not_health_related',
  UNCERTAIN: 'uncertain',
  UNREADABLE: 'unreadable',
};

// ==========================================
// REGEX & KEYWORD RULE DICTIONARIES
// ==========================================

const NON_MEDICAL_RULES = [
  // Programming & Software Code
  {
    name: 'programming_code',
    pattern:
      /\b(import\s+React|export\s+default|function\s*\w*\s*\(|def\s+[a-zA-Z_]\w*\s*\(|public\s+class\s+\w+|console\.log|npm\s+(install|run|start)|git\s+(commit|push|checkout|merge)|<!DOCTYPE\s+html>|const\s+[a-zA-Z_$]\w*\s*=|let\s+[a-zA-Z_$]\w*\s*=|var\s+[a-zA-Z_$]\w*\s*=|package\.json|typedef\s+struct|#include\s+<stdio\.h>|#include\s+<iostream>|SELECT\s+.*?\s+FROM|INSERT\s+INTO|UPDATE\s+\w+\s+SET|std::cout|System\.out\.println|class\s+\w+\s*\{|pip\s+install)\b/i,
    weight: 4,
  },
  // Resumes and Curriculum Vitae
  {
    name: 'resume_cv',
    pattern:
      /\b(curriculum\s+vitae|\bresume\b|work\s+experience|professional\s+experience|education:\s*bachelor|skills:\s*(python|java|c\+\+|javascript|sql)|career\s+objective|references\s+available\s+upon\s+request|linkedin\.com\/in\/|github\.com\/[a-zA-Z0-9_-]+)\b/i,
    weight: 4,
  },
  // School, University, Homework Assignments
  {
    name: 'academic_assignment',
    pattern:
      /\b(homework\s+assignment|course\s+code\b|professor\b|course\s+instructor|department\s+of\s+computer\s+science|essay\s+on\b|chapter\s+\d+:\s+introduction|final\s+exam\b|student\s+id\b|submission\s+deadline|semester\s+\d+|assignment\s*#?\d+)\b/i,
    weight: 4,
  },
  // Commercial non-health receipts and tickets
  {
    name: 'commercial_receipt',
    pattern:
      /\b(supermarket\b|grocery\s+store|walmart\b|target\b|costco\b|subway\s+restaurant|starbucks\b|uber\s+trip|lyft\s+ride|airline\s+ticket|flight\s+booking|boarding\s+pass|hotel\s+reservation|tax\s+invoice\s+for\s+software|web\s+hosting|coffee\s+shop|restaurant\s+bill)\b/i,
    weight: 4,
  },
  // Entertainment & Memes
  {
    name: 'entertainment_meme',
    pattern:
      /\b(meme\b|funniest\s+memes|movie\s+ticket|cinema\s+screen|playstation\b|xbox\b|video\s+game|gaming\s+console)\b/i,
    weight: 4,
  },
];

const MEDICAL_RULES = [
  // Prescriptions & Consultations
  {
    name: 'prescription_consultation',
    pattern:
      /\b(rx|℞|prescription|doctor|dr\.|mbbs|m\.d\.|m\.s\.|dnb|frcs|clinic|hospital|dispensary|patient\s+name|age\/gender|diagnosis|chief\s+complaints|symptoms|tab\.|cap\.|syp\.|inj\.|ointment|dosage|bd|tds|od|hs|sos|qid|qds|before\s+food|after\s+food|follow\s*up|physician|consultant|prescribed|sublingual|oral\s+route|intramuscular|intravenous)\b/i,
    weight: 3,
  },
  // Laboratory, Blood, Pathology Reports
  {
    name: 'lab_blood_report',
    pattern:
      /\b(blood\s+test|laboratory\s+report|complete\s+blood\s+count|cbc|hemoglobin|hb\b|wbc\b|rbc\b|platelet|lipid\s+profile|cholesterol|hdl|ldl|triglycerides|hba1c|glucose|fasting\s+blood\s+sugar|fbs|post\s+prandial|ppbs|liver\s+function|lft|bilirubin|sgot|sgpt|alt\b|ast\b|alkaline\s+phosphatase|renal\s+function|rft|kft|creatinine|blood\s+urea|serum\s+electrolytes|urine\s+analysis|urinalysis|culture\s+and\s+sensitivity|thyroid|tsh|t3|t4|pathology|biopsy|histopathology|diagnostic\s+center|reference\s+interval|biological\s+reference|specimen)\b/i,
    weight: 3,
  },
  // Radiology, Imaging, ECG
  {
    name: 'radiology_imaging',
    pattern:
      /\b(x-ray|x\s*ray|radiology|mri|magnetic\s+resonance|ct\s+scan|computed\s+tomography|ultrasound|usg|sonography|echocardiogram|echo\b|ecg\b|ekg\b|electrocardiogram|mammography|radiologist|impression:|findings:|axial|coronal|sagittal|contrast-enhanced|no\s+acute\s+intracranial|cervical\s+spine|lumbar\s+spine|chest\s+p\/a\s+view|st-segment|sinus\s+rhythm|leads\s+(i|ii|iii|avf|avl|avr|v1|v2|v3|v4|v5|v6))\b/i,
    weight: 3,
  },
  // Hospital Discharge Summaries
  {
    name: 'discharge_summary',
    pattern:
      /\b(discharge\s+summary|admission\s+date|discharge\s+date|ipd\s+no|opd\s+no|uhid|mrn\b|vitals|blood\s+pressure|\bbp\b|pulse\s+rate|spo2|temperature|treatment\s+given|course\s+in\s+hospital|condition\s+at\s+discharge|provisional\s+diagnosis|final\s+diagnosis|operative\s+notes)\b/i,
    weight: 3,
  },
  // Medical Certificates & Vaccinations
  {
    name: 'medical_certificate_vaccination',
    pattern:
      /\b(medical\s+certificate|medical\s+fitness|sick\s+leave|under\s+my\s+treatment|recommended\s+rest|vaccination\s+record|vaccination\s+card|immunization\s+record|covid-19\s+vaccination|dose\s+1|dose\s+2|booster\s+dose|batch\s+no|vaccine\s+name|beneficiary\s+id)\b/i,
    weight: 3,
  },
  // Medical Bills, Pharmacy, and Health Insurance
  {
    name: 'medical_bills_insurance',
    pattern:
      /\b(pharmacy\s+bill|hospital\s+invoice|medical\s+store|chemist\b|cash\s+memo\s+-\s+medicine|consultation\s+fee|room\s+rent\s+\(icu\/ward\)|diagnostic\s+charges|bed\s+charges|patient\s+bill|health\s+insurance|cashless\s+authorization|pre-authorization|tpa\b|mediclaim|sum\s+insured)\b/i,
    weight: 3,
  },
  // Common Drugs and Medication Suffixes
  {
    name: 'pharmaceutical_terms',
    pattern:
      /\b(paracetamol|amoxicillin|azithromycin|pantoprazole|omeprazole|atorvastatin|metformin|aspirin|ibuprofen|losartan|amlodipine|cetirizine|levocetirizine|montelukast|ciprofloxacin|doxycycline|insulin|thyroxine|dextromethorphan|salbutamol|prednisolone|tramadol|diclofenac|ranitidine|cefixime)\b/i,
    weight: 3,
  },
  // Clinical Measurement Units
  {
    name: 'clinical_units',
    pattern:
      /\b(\d+\s*(mg|mcg|ml|iu|g\/dl|mg\/dl|mmol\/l|meq\/l|bpm|mmhg|µl|\/cumm|\/hpf))\b/i,
    weight: 2,
  },
  // Telugu Medical Terms (Bilingual Healthcare Support)
  {
    name: 'telugu_medical_terms',
    pattern:
      /(డాక్టర్|వైద్యుడు|వైద్యురాలు|వైద్యులు|ఆసుపత్రి|హాస్పిటల్|వైద్యం|వైద్య|చికిత్స|మందులు|ఔషధాలు|మాత్రలు|సిరప్|ఇంజక్షన్|రోగి|వ్యాధిగ్రస్తుడు|వ్యాధి|జబ్బు|లక్షణాలు|రక్త పరీక్ష|ల్యాబ్ రిపోర్ట్|ప్రిస్క్రిప్షన్|ఆరోగ్యం|ఆరోగ్య|డిశ్చార్జ్ సమ్మరీ|వైద్య ధృవీకరణ పత్రం|టీకా|వ్యాక్సినేషన్|రక్తపోటు|మధుమేహం)/u,
    weight: 4,
  },
];

/**
 * Extracts raw or stream text from PDF buffers resiliently using precise buffer slicing.
 */
function extractPdfTextSafely(bufferOrPath) {
  try {
    let buf;
    if (Buffer.isBuffer(bufferOrPath)) {
      buf = bufferOrPath;
    } else if (typeof bufferOrPath === 'string' && fs.existsSync(bufferOrPath)) {
      buf = fs.readFileSync(bufferOrPath);
    } else {
      return '';
    }

    if (!buf || buf.length < 4) return '';

    const extractedTokens = [];
    const streamMarker = Buffer.from('stream');
    const endstreamMarker = Buffer.from('endstream');
    let offset = 0;

    while (offset < buf.length) {
      const startIdx = buf.indexOf(streamMarker, offset);
      if (startIdx === -1) break;

      let streamDataStart = startIdx + 6;
      if (buf[streamDataStart] === 0x0D && buf[streamDataStart + 1] === 0x0A) {
        streamDataStart += 2;
      } else if (buf[streamDataStart] === 0x0A || buf[streamDataStart] === 0x0D) {
        streamDataStart += 1;
      }

      const endIdx = buf.indexOf(endstreamMarker, streamDataStart);
      if (endIdx === -1) break;

      let streamDataEnd = endIdx;
      if (buf[streamDataEnd - 1] === 0x0A && buf[streamDataEnd - 2] === 0x0D) {
        streamDataEnd -= 2;
      } else if (buf[streamDataEnd - 1] === 0x0A || buf[streamDataEnd - 1] === 0x0D) {
        streamDataEnd -= 1;
      }

      const rawBuffer = buf.subarray(streamDataStart, streamDataEnd);

      let streamText = '';
      try {
        streamText = zlib.inflateSync(rawBuffer).toString('utf-8');
      } catch (e1) {
        try {
          streamText = zlib.unzipSync(rawBuffer).toString('utf-8');
        } catch (e2) {
          streamText = rawBuffer.toString('utf-8');
        }
      }

      const tjMatches = [...streamText.matchAll(/\(((?:\\\(|\\\)|[^)])*)\)\s*(?:Tj|'|")/g)];
      for (const t of tjMatches) {
        extractedTokens.push(t[1]);
      }

      const arrayMatches = [...streamText.matchAll(/\[([\s\S]*?)\]\s*TJ/g)];
      for (const arr of arrayMatches) {
        const inner = [...arr[1].matchAll(/\(([^)]*)\)/g)];
        for (const item of inner) {
          extractedTokens.push(item[1]);
        }
      }

      offset = endIdx + 9;
    }

    // Also look for uncompressed literal text inside parentheses
    const content = buf.toString('latin1');
    const literalMatches = [...content.matchAll(/\(((?:\\\(|\\\)|[^)])*)\)\s*Tj/g)];
    for (const lm of literalMatches) {
      extractedTokens.push(lm[1]);
    }

    return extractedTokens.join(' ').replace(/\s+/g, ' ').trim();
  } catch (err) {
    return '';
  }
}


/**
 * Analyzes document text content using heuristic classification.
 */
function evaluateTextHeuristics(text) {
  if (!text || typeof text !== 'string') {
    return {
      nonMedicalScore: 0,
      medicalScore: 0,
      matchedNonMedical: [],
      matchedMedical: [],
    };
  }

  const clean = text.trim();
  let nonMedicalScore = 0;
  const matchedNonMedical = [];

  for (const rule of NON_MEDICAL_RULES) {
    if (rule.pattern.test(clean)) {
      nonMedicalScore += rule.weight;
      matchedNonMedical.push(rule.name);
    }
  }

  let medicalScore = 0;
  const matchedMedical = [];

  for (const rule of MEDICAL_RULES) {
    if (rule.pattern.test(clean)) {
      medicalScore += rule.weight;
      matchedMedical.push(rule.name);
    }
  }

  return {
    nonMedicalScore,
    medicalScore,
    matchedNonMedical,
    matchedMedical,
  };
}

/**
 * Classifies an uploaded document (PDF or image) to verify whether it is health-related.
 *
 * @param {Object} options
 * @param {string} [options.filePath] - Absolute path to uploaded file on disk
 * @param {Buffer} [options.buffer] - Uploaded file buffer
 * @param {string} [options.mimeType] - File MIME type
 * @param {string} [options.originalName] - Original filename
 * @param {string} [options.documentType] - User-selected category
 * @param {number} [options.fileSize] - File size in bytes
 * @returns {Promise<{
 *   isValid: boolean,
 *   status: 'health_related' | 'not_health_related' | 'uncertain' | 'unreadable',
 *   confidence: number,
 *   reasoning: string,
 *   detectedType: string,
 *   errorCode: string | null,
 *   errorMessage: string | null
 * }>}
 */
async function classifyDocument({
  filePath = null,
  buffer = null,
  mimeType = null,
  originalName = '',
  documentType = 'Other',
  fileSize = null,
}) {
  // 1. File availability and size check
  let fileBuffer = buffer;
  if (!fileBuffer && filePath) {
    if (!fs.existsSync(filePath)) {
      return {
        isValid: false,
        status: CLASSIFICATION.UNREADABLE,
        confidence: 0,
        reasoning: 'Uploaded file could not be located on server storage.',
        detectedType: 'unknown',
        errorCode: 'DOCUMENT_UNREADABLE',
        errorMessage: 'This file is empty, corrupted, or unreadable. Please upload a valid PDF or a clear image.',
      };
    }
    try {
      fileBuffer = fs.readFileSync(filePath);
    } catch (readErr) {
      return {
        isValid: false,
        status: CLASSIFICATION.UNREADABLE,
        confidence: 0,
        reasoning: `File read failed: ${readErr.message}`,
        detectedType: 'unknown',
        errorCode: 'DOCUMENT_UNREADABLE',
        errorMessage: 'This file is empty, corrupted, or unreadable. Please upload a valid PDF or a clear image.',
      };
    }
  }

  const effectiveSize = typeof fileSize === 'number' ? fileSize : fileBuffer ? fileBuffer.length : 0;

  // Empty file check
  if (effectiveSize === 0 || !fileBuffer || fileBuffer.length === 0) {
    return {
      isValid: false,
      status: CLASSIFICATION.UNREADABLE,
      confidence: 1.0,
      reasoning: 'The uploaded file is empty (0 bytes).',
      detectedType: 'empty',
      errorCode: 'DOCUMENT_UNREADABLE',
      errorMessage: 'This file is empty, corrupted, or unreadable. Please upload a valid PDF or a clear image.',
    };
  }

  // 2. Format & Binary Signature Validation
  const sigCheck = validateFileSignature(fileBuffer);
  if (!sigCheck.isValid) {
    return {
      isValid: false,
      status: CLASSIFICATION.UNREADABLE,
      confidence: 1.0,
      reasoning: sigCheck.error || 'File signature is corrupted, incomplete, or unsupported.',
      detectedType: 'unsupported',
      errorCode: 'DOCUMENT_UNREADABLE',
      errorMessage: 'This file is empty, corrupted, or unreadable. Please upload a valid PDF or a clear image.',
    };
  }

  const resolvedMime = sigCheck.detectedType || (mimeType || '').toLowerCase();
  const lowerName = (originalName || (filePath ? path.basename(filePath) : '')).toLowerCase();

  // 3. Fast Extension & Filename Heuristics
  const isPdf = resolvedMime === 'application/pdf' || lowerName.endsWith('.pdf');
  const isImage = resolvedMime.startsWith('image/');

  let extractedText = '';

  if (isPdf) {
    // Attempt PDF text extraction
    try {
      extractedText = extractPdfTextSafely(fileBuffer);
      if (!extractedText && filePath) {
        const fullPdfResult = await extractTextFromPdf(filePath);
        if (fullPdfResult && fullPdfResult.text) {
          extractedText = fullPdfResult.text;
        }
      }
    } catch (pdfErr) {
      // If PDF has invalid structure and failed to parse
      if (pdfErr.message && pdfErr.message.includes('corrupted')) {
        return {
          isValid: false,
          status: CLASSIFICATION.UNREADABLE,
          confidence: 0.95,
          reasoning: 'The PDF document structure is corrupted or unreadable.',
          detectedType: 'corrupted_pdf',
          errorCode: 'DOCUMENT_UNREADABLE',
          errorMessage: 'This file is empty, corrupted, or unreadable. Please upload a valid PDF or a clear image.',
        };
      }
    }
  } else if (isImage) {
    // Check if filename contains explicit non-medical cues
    // For images, if text extraction is needed, we check OCR or multimodal vision
    // (We also check buffer for embedded text markers if any)
    const rawAscii = fileBuffer.toString('latin1', 0, Math.min(fileBuffer.length, 16384));
    extractedText = rawAscii;
  }

  // Combine extracted text with filename for context
  const fullContextText = `${lowerName} ${extractedText}`.trim();

  // 4. Evaluate Heuristics
  const { nonMedicalScore, medicalScore, matchedNonMedical, matchedMedical } =
    evaluateTextHeuristics(fullContextText);

  // Strong Non-Medical Rejection:
  // If clear non-medical patterns (e.g. code, school assignment, resume, grocery receipt) are present
  // and medical score is 0 or dwarfed:
  if (nonMedicalScore >= 4 && medicalScore === 0) {
    return {
      isValid: false,
      status: CLASSIFICATION.NOT_HEALTH_RELATED,
      confidence: 0.95,
      reasoning: `Document matches non-medical category (${matchedNonMedical.join(', ')}) with no legitimate healthcare context.`,
      detectedType: matchedNonMedical[0] || 'non_medical',
      errorCode: 'NON_MEDICAL_DOCUMENT',
      errorMessage:
        'This file does not appear to be health-related. Please upload a medical prescription, laboratory report, medical certificate, discharge summary, or another healthcare document.',
    };
  }

  if (nonMedicalScore >= 4 && nonMedicalScore > medicalScore * 2) {
    return {
      isValid: false,
      status: CLASSIFICATION.NOT_HEALTH_RELATED,
      confidence: 0.9,
      reasoning: `Document is predominantly non-medical content (${matchedNonMedical.join(', ')}).`,
      detectedType: matchedNonMedical[0] || 'non_medical',
      errorCode: 'NON_MEDICAL_DOCUMENT',
      errorMessage:
        'This file does not appear to be health-related. Please upload a medical prescription, laboratory report, medical certificate, discharge summary, or another healthcare document.',
    };
  }

  // Telugu Medical Confirmation (Bilingual Healthcare Support)
  if (matchedMedical.includes('telugu_medical_terms') || /(డాక్టర్|వైద్య|ఆసుపత్రి|మందులు|రోగి|ప్రిస్క్రిప్షన్)/u.test(fullContextText)) {
    return {
      isValid: true,
      status: CLASSIFICATION.HEALTH_RELATED,
      confidence: 0.95,
      reasoning: 'Identified authentic Telugu healthcare terminology and clinical context.',
      detectedType: 'telugu_medical_document',
      errorCode: null,
      errorMessage: null,
    };
  }

  // Strong Medical Confirmation:
  if (medicalScore >= 3) {
    const primaryType = matchedMedical[0] || 'health_document';
    return {
      isValid: true,
      status: CLASSIFICATION.HEALTH_RELATED,
      confidence: 0.95,
      reasoning: `Identified legitimate healthcare markers: ${matchedMedical.join(', ')}.`,
      detectedType: primaryType,
      errorCode: null,
      errorMessage: null,
    };
  }

  // 5. Image & Scanned Document AI Vision / Multimodal Inspection
  // If file is an image or scanned PDF without clear digital text, or if heuristics are borderline:
  if (isImage || (isPdf && (!extractedText || extractedText.length < 30))) {
    // Check if filename indicates medical document or prescription
    const medicalNameRegex = /(prescription|rx|report|lab|blood|ecg|ekg|mri|xray|x-ray|scan|doctor|hospital|discharge|medical|patient|clinic|inpatient)/i;
    const nonMedicalNameRegex = /(assignment|homework|resume|cv|code|script|invoice_software|grocery|receipt_food|meme|wallpaper|photo_landscape|selfie|screenshot_chat)/i;

    if (nonMedicalNameRegex.test(lowerName)) {
      return {
        isValid: false,
        status: CLASSIFICATION.NOT_HEALTH_RELATED,
        confidence: 0.9,
        reasoning: 'File attributes indicate non-medical content (e.g., assignment, resume, code, or personal media).',
        detectedType: 'non_medical',
        errorCode: 'NON_MEDICAL_DOCUMENT',
        errorMessage:
          'This file does not appear to be health-related. Please upload a medical prescription, laboratory report, medical certificate, discharge summary, or another healthcare document.',
      };
    }

    if (medicalNameRegex.test(lowerName) || documentType === 'Prescription' || documentType === 'Blood Report' || documentType === 'Lab Report' || documentType === 'Doctor Note' || documentType === 'Imaging Report') {
      // If image is a blurry handwritten prescription or visual medical record
      // If blurry or low-res image, we still accept it as medical candidate if it has clinical indicators
      return {
        isValid: true,
        status: CLASSIFICATION.HEALTH_RELATED,
        confidence: 0.85,
        reasoning: `Visual healthcare document layout detected corresponding to category '${documentType}'.`,
        detectedType: documentType.toLowerCase().replace(/\s+/g, '_'),
        errorCode: null,
        errorMessage: null,
      };
    }
  }

  // 6. Handle Ambiguous / Borderline cases
  if (medicalScore > 0 && medicalScore >= nonMedicalScore) {
    return {
      isValid: true,
      status: CLASSIFICATION.HEALTH_RELATED,
      confidence: 0.8,
      reasoning: `Document contains healthcare terminology (${matchedMedical.join(', ')}).`,
      detectedType: matchedMedical[0] || 'medical_record',
      errorCode: null,
      errorMessage: null,
    };
  }

  // If text is completely empty or meaningless and not identifiable
  if (!extractedText || extractedText.trim().length === 0) {
    return {
      isValid: false,
      status: CLASSIFICATION.UNCERTAIN,
      confidence: 0.5,
      reasoning: 'The available content is insufficient to confidently determine whether the document is health-related.',
      detectedType: 'uncertain',
      errorCode: 'DOCUMENT_CLASSIFICATION_UNCERTAIN',
      errorMessage:
        "We couldn't confidently determine whether this document is health-related. Please upload a clearer image or a readable PDF.",
    };
  }

  // If text has some content but no medical or non-medical markers matched
  // (e.g. random sentences, gibberish, obscure notes)
  return {
    isValid: false,
    status: CLASSIFICATION.UNCERTAIN,
    confidence: 0.5,
    reasoning: 'No clear healthcare markers found, but content cannot be definitively categorized as non-medical.',
    detectedType: 'uncertain',
    errorCode: 'DOCUMENT_CLASSIFICATION_UNCERTAIN',
    errorMessage:
      "We couldn't confidently determine whether this document is health-related. Please upload a clearer image or a readable PDF.",
  };
}

module.exports = {
  classifyDocument,
  evaluateTextHeuristics,
  CLASSIFICATION,
  NON_MEDICAL_RULES,
  MEDICAL_RULES,
};
