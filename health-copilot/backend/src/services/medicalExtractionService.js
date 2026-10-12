const llmService = require('./llm.service');

/**
 * Standard reference ranges and units for common clinical laboratory tests
 */
const CLINICAL_LAB_DICTIONARY = [
  {
    pattern: /hemo?globin|hb\b/i,
    testName: 'Hemoglobin',
    unit: 'g/dL',
    defaultRange: '13.0 - 17.0 g/dL',
    low: 13.0,
    high: 17.0,
    desc: 'Oxygen-carrying protein in red blood cells',
  },
  {
    pattern: /total\s*wbc|wbc\b|white\s*blood\s*cells?|total\s*leukocyte/i,
    testName: 'Total WBC Count',
    unit: 'cells/mcL',
    defaultRange: '4,000 - 11,000 cells/mcL',
    low: 4000,
    high: 11000,
    desc: 'Immune defense cells that fight infection',
  },
  {
    pattern: /platelets?|platelet\s*count/i,
    testName: 'Platelet Count',
    unit: 'lakh/mcL',
    defaultRange: '1.5 - 4.5 lakh/mcL',
    low: 150000,
    high: 450000,
    desc: 'Cell fragments essential for normal blood clotting',
  },
  {
    pattern: /fasting\s*blood\s*sugar|fbs\b|fasting\s*glucose|blood\s*glucose\s*\(fasting\)/i,
    testName: 'Fasting Blood Glucose',
    unit: 'mg/dL',
    defaultRange: '70 - 100 mg/dL',
    low: 70,
    high: 100,
    desc: 'Blood sugar level measured after an overnight fast',
  },
  {
    pattern: /post\s*prandial|ppbs\b|glucose\s*post\s*prandial/i,
    testName: 'Postprandial Blood Glucose',
    unit: 'mg/dL',
    defaultRange: '70 - 140 mg/dL',
    low: 70,
    high: 140,
    desc: 'Blood sugar measured 2 hours after a meal',
  },
  {
    pattern: /hba1c|glycated\s*hemoglobin/i,
    testName: 'HbA1c (Glycated Hemoglobin)',
    unit: '%',
    defaultRange: '< 5.7 %',
    low: 4.0,
    high: 5.7,
    desc: 'Average blood sugar control over the past 2 to 3 months',
  },
  {
    pattern: /total\s*cholesterol/i,
    testName: 'Total Cholesterol',
    unit: 'mg/dL',
    defaultRange: '< 200 mg/dL',
    low: 125,
    high: 200,
    desc: 'Total level of fats and cholesterol in the bloodstream',
  },
  {
    pattern: /hdl\b|hdl\s*cholesterol|high\s*density/i,
    testName: 'HDL (Good) Cholesterol',
    unit: 'mg/dL',
    defaultRange: '> 40 mg/dL',
    low: 40,
    high: 80,
    desc: 'Protective cholesterol that carries lipids away from arteries',
  },
  {
    pattern: /ldl\b|ldl\s*cholesterol|low\s*density/i,
    testName: 'LDL (Bad) Cholesterol',
    unit: 'mg/dL',
    defaultRange: '< 100 mg/dL',
    low: 50,
    high: 100,
    desc: 'Atherogenic cholesterol that can accumulate in blood vessels',
  },
  {
    pattern: /triglycerides?/i,
    testName: 'Serum Triglycerides',
    unit: 'mg/dL',
    defaultRange: '< 150 mg/dL',
    low: 50,
    high: 150,
    desc: 'Circulating fat molecules used by the body for energy',
  },
  {
    pattern: /serum\s*creatinine|creatinine/i,
    testName: 'Serum Creatinine',
    unit: 'mg/dL',
    defaultRange: '0.6 - 1.2 mg/dL',
    low: 0.6,
    high: 1.2,
    desc: 'Waste product filtered by kidneys; key indicator of renal function',
  },
  {
    pattern: /blood\s*urea|urea/i,
    testName: 'Blood Urea Nitrogen (BUN)',
    unit: 'mg/dL',
    defaultRange: '7 - 20 mg/dL',
    low: 7,
    high: 20,
    desc: 'Metabolic byproduct of protein breakdown evaluated for kidney health',
  },
  {
    pattern: /tsh\b|thyroid\s*stimulating\s*hormone/i,
    testName: 'Thyroid Stimulating Hormone (TSH)',
    unit: 'uIU/mL',
    defaultRange: '0.4 - 4.5 uIU/mL',
    low: 0.4,
    high: 4.5,
    desc: 'Pituitary hormone regulating thyroid metabolic function',
  },
  {
    pattern: /vitamin\s*d|25-oh\s*vitamin\s*d/i,
    testName: 'Vitamin D (25-Hydroxy)',
    unit: 'ng/mL',
    defaultRange: '30 - 100 ng/mL',
    low: 30,
    high: 100,
    desc: 'Fat-soluble vitamin supporting bone mineral density and immunity',
  },
  {
    pattern: /vitamin\s*b12|cyanocobalamin/i,
    testName: 'Vitamin B12',
    unit: 'pg/mL',
    defaultRange: '200 - 900 pg/mL',
    low: 200,
    high: 900,
    desc: 'Essential micronutrient for red blood cell synthesis and nerve health',
  },
  {
    pattern: /sgpt|alt\b|alanine\s*aminotransferase/i,
    testName: 'SGPT / ALT (Liver Enzyme)',
    unit: 'U/L',
    defaultRange: '7 - 56 U/L',
    low: 7,
    high: 56,
    desc: 'Liver intracellular enzyme released during hepatic stress',
  },
  {
    pattern: /sgot|ast\b|aspartate\s*aminotransferase/i,
    testName: 'SGOT / AST (Liver Enzyme)',
    unit: 'U/L',
    defaultRange: '10 - 40 U/L',
    low: 10,
    high: 40,
    desc: 'Enzyme found in liver and cardiac tissue',
  },
];

class MedicalExtractionService {
  /**
   * Classify document type based on content analysis
   */
  classifyDocument(text = '', userDocumentType = 'Other') {
    const lower = text.toLowerCase();
    let classification = userDocumentType;
    let confidence = 0.8;

    if (
      lower.includes('hemoglobin') ||
      lower.includes('complete blood count') ||
      lower.includes('reference interval') ||
      lower.includes('specimen') ||
      lower.includes('investigation report') ||
      lower.includes('pathology')
    ) {
      classification = 'Lab Report';
      confidence = 0.95;
    } else if (
      lower.includes('rx') ||
      lower.includes('prescribed') ||
      lower.includes('tablet') ||
      lower.includes('capsule') ||
      lower.includes('dosage') ||
      lower.includes('sig:')
    ) {
      classification = 'Prescription';
      confidence = 0.92;
    } else if (
      lower.includes('discharge summary') ||
      lower.includes('date of admission') ||
      lower.includes('date of discharge') ||
      lower.includes('hospital course')
    ) {
      classification = 'Discharge Summary';
      confidence = 0.96;
    } else if (
      lower.includes('x-ray') ||
      lower.includes('mri') ||
      lower.includes('ct scan') ||
      lower.includes('ultrasound') ||
      lower.includes('radiology')
    ) {
      classification = 'Imaging Report';
      confidence = 0.9;
    } else if (
      lower.includes('clinical note') ||
      lower.includes('chief complaint') ||
      lower.includes('physical examination')
    ) {
      classification = 'Doctor Note';
      confidence = 0.85;
    }

    return { classification, confidence };
  }

  /**
   * Rule-based extraction fallback for lab results and medications
   */
  extractWithRules(text = '') {
    const lines = text.split(/\r?\n/);
    const labResults = [];
    const prescriptions = [];
    let patientName = '';
    let documentDate = null;
    let healthcareProvider = '';
    const diagnoses = [];
    const allergies = [];

    // Extract basic header metadata
    for (const line of lines) {
      const pMatch = line.match(/(?:patient\s*name|name)\s*[:\-]\s*([a-zA-Z\s\.]+)/i);
      if (pMatch && !patientName) {
        patientName = pMatch[1].trim().replace(/\s+(age|sex|gender|date).*/i, '');
      }

      const dMatch = line.match(/(?:date|collected|reported)\s*[:\-]\s*(\d{1,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,4})/i);
      if (dMatch && !documentDate) {
        const parsed = new Date(dMatch[1]);
        if (!isNaN(parsed.getTime())) {
          documentDate = parsed;
        }
      }

      const hMatch = line.match(/(?:hospital|laboratory|lab|clinic|center)\s*[:\-]?\s*([a-zA-Z0-9\s,\.]+)/i);
      if (hMatch && !healthcareProvider && line.length < 80) {
        healthcareProvider = hMatch[0].trim();
      }

      const diagMatch = line.match(/(?:diagnosis|impression|assessment)\s*[:\-]\s*([a-zA-Z0-9\s,\-]+)/i);
      if (diagMatch) {
        const d = diagMatch[1].trim();
        if (d && !diagnoses.includes(d)) diagnoses.push(d);
      }
    }

    // Extract Lab Results
    for (const item of CLINICAL_LAB_DICTIONARY) {
      for (const line of lines) {
        if (item.pattern.test(line)) {
          // Look for numeric value: e.g. "Hemoglobin: 11.2 g/dL (13.0 - 17.0)"
          const valMatch = line.match(/[:\s]\s*([<>]?\s*\d+(?:\.\d+)?)\s*([a-zA-Z\/%]+)?/i);
          if (valMatch) {
            const rawVal = valMatch[1].trim();
            const numeric = parseFloat(rawVal.replace(/[<>]/g, ''));
            const unit = valMatch[2] || item.unit;

            // Extract explicit reference range from line if present
            let refRange = item.defaultRange;
            const refMatch = line.match(/\(([^)]+)\)|\[([^\]]+)\]|ref(?:erence)?\s*[:\-]?\s*([0-9\.\-\s<>]+)/i);
            if (refMatch) {
              refRange = (refMatch[1] || refMatch[2] || refMatch[3]).trim();
            }

            // Determine abnormal flag
            let abnormalFlag = 'NORMAL';
            if (line.match(/\b(high|elevated|h)\b/i)) {
              abnormalFlag = 'HIGH';
            } else if (line.match(/\b(low|decreased|l)\b/i)) {
              abnormalFlag = 'LOW';
            } else if (!isNaN(numeric)) {
              if (item.low !== undefined && numeric < item.low) {
                abnormalFlag = 'LOW';
              } else if (item.high !== undefined && numeric > item.high) {
                abnormalFlag = 'HIGH';
              }
            }

            let interpretation = `Within expected reference range (${refRange}).`;
            if (abnormalFlag === 'HIGH') {
              interpretation = `Elevated above the reported reference range (${refRange}).`;
            } else if (abnormalFlag === 'LOW') {
              interpretation = `Below the expected reference range (${refRange}).`;
            }

            // Avoid duplicate test entries
            if (!labResults.some((r) => r.testName === item.testName)) {
              labResults.push({
                testName: item.testName,
                result: `${rawVal} ${unit}`.trim(),
                numericValue: isNaN(numeric) ? null : numeric,
                unit: unit,
                referenceRange: refRange,
                abnormalFlag,
                interpretation,
              });
            }
          }
          break;
        }
      }
    }

    // Extract Prescriptions (Tablets, Capsules, Injections)
    const rxRegex = /(?:tab(?:let)?|cap(?:sule)?|syp|syrup|inj(?:ection)?)\.?\s+([A-Za-z0-9\-]+(?:\s+[A-Za-z0-9\-]+)?(?:\s+\d+(?:mg|mcg|ml|g))?)/gi;
    let match;
    while ((match = rxRegex.exec(text)) !== null) {
      const medName = match[0].trim();
      const surrounding = text.substring(match.index, match.index + 120);

      const freqMatch = surrounding.match(/\b(1-0-1|1-0-0|0-0-1|1-1-1|once daily|twice daily|od|bd|tds|tid|qid|sos)\b/i);
      const durMatch = surrounding.match(/(\d+\s*(?:days?|weeks?|months?))/i);
      const instructMatch = surrounding.match(/(after food|before food|with meals?|empty stomach|at bedtime)/i);

      if (!prescriptions.some((p) => p.medicationName.toLowerCase() === medName.toLowerCase())) {
        prescriptions.push({
          medicationName: medName,
          dosage: medName.match(/\d+\s*(?:mg|mcg|ml|g)/i)?.[0] || 'As directed',
          frequency: freqMatch ? freqMatch[1].toUpperCase() : 'Once daily',
          duration: durMatch ? durMatch[1] : 'As prescribed',
          instructions: instructMatch ? instructMatch[1] : 'Follow clinician guidance',
          prescribingDoctor: healthcareProvider || '',
          isCurrentMedication: true,
        });
      }
    }

    const reviewStatus = labResults.some((l) => l.abnormalFlag !== 'NORMAL')
      ? 'REVIEW_REQUIRED'
      : 'AUTO_EXTRACTED';

    return {
      patientName,
      documentDate,
      healthcareProvider,
      diagnoses,
      reviewStatus,
      confidenceScore: labResults.length > 0 || prescriptions.length > 0 ? 0.92 : 0.75,
      labResults,
      prescriptions,
      dischargeSummary: {
        admissionDate: null,
        dischargeDate: null,
        procedures: [],
        followUpInstructions: [],
      },
      allergies,
    };
  }

  /**
   * Generates bilingual structured health summaries conforming to the 6 clinical sections
   */
  generateSummaries({ extractedText, structuredData, documentType }) {
    const labs = structuredData.labResults || [];
    const abnormalLabs = labs.filter((l) => l.abnormalFlag !== 'NORMAL');
    const rx = structuredData.prescriptions || [];

    // 1. English Summary
    const englishOverview = `This ${documentType || 'medical record'} ${
      structuredData.healthcareProvider ? `from ${structuredData.healthcareProvider} ` : ''
    }${
      structuredData.documentDate ? `dated ${new Date(structuredData.documentDate).toLocaleDateString()} ` : ''
    }documents clinical findings and health assessments for the patient.`;

    const englishKeyFindings = [
      labs.length > 0
        ? `Analyzed ${labs.length} laboratory test parameter(s) from the specimen.`
        : 'Analyzed clinical and medical documentation.',
      rx.length > 0
        ? `Identified ${rx.length} medication regimen(s) prescribed for treatment.`
        : 'No explicit pharmaceutical prescriptions identified in this record.',
    ];

    if (structuredData.diagnoses && structuredData.diagnoses.length > 0) {
      englishKeyFindings.push(`Documented diagnosis / clinical observation: ${structuredData.diagnoses.join(', ')}`);
    }

    const englishAbnormalResults =
      abnormalLabs.length > 0
        ? abnormalLabs.map((l) => `${l.testName}: ${l.result} (Expected: ${l.referenceRange}) — Marked ${l.abnormalFlag}`)
        : ['All tested laboratory parameters fall within standard laboratory reference ranges.'];

    const englishMeanings =
      abnormalLabs.length > 0
        ? `The report highlights ${abnormalLabs.length} value(s) outside stated reference bounds (e.g. ${abnormalLabs
            .map((a) => `${a.testName} at ${a.result}`)
            .join(', ')}). These values reflect physiological variance and should be evaluated alongside clinical symptoms by a licensed healthcare provider.`
        : 'The documented laboratory observations are within expected physiological intervals. Continue routine preventive health care.';

    const englishMedicines =
      rx.length > 0
        ? rx.map((m) => `${m.medicationName} — ${m.dosage || ''} ${m.frequency || ''} (${m.instructions || ''})`.trim())
        : ['No specific pharmaceutical prescriptions documented in this report.'];

    const englishQuestions = [
      'What do these specific test results indicate regarding my current health status?',
      ...(abnormalLabs.length > 0
        ? [`How should we manage or follow up on my out-of-range ${abnormalLabs[0].testName}?`]
        : []),
      'Are there lifestyle, dietary, or medication adjustments recommended based on these findings?',
      'When should a follow-up test or consultation be scheduled?',
    ];

    // 2. Telugu Summary (Preserving exact numbers, decimal accuracy, units, and medicine names)
    const teluguOverview = `ఈ ${documentType || 'వైద్య నివేదిక'} ${
      structuredData.healthcareProvider ? `${structuredData.healthcareProvider} నుండి ` : ''
    }రోగి యొక్క ఆరోగ్య ఫలితాలు మరియు విశ్లేషణలను సూచిస్తుంది.`;

    const teluguKeyFindings = [
      labs.length > 0
        ? `పరీక్షించిన రికార్డులో ${labs.length} ల్యాబ్ కొలతలు విశ్లేషించబడ్డాయి.`
        : 'క్లినికల్ మరియు వైద్య పత్రాలు విశ్లేషించబడ్డాయి.',
      rx.length > 0
        ? `చికిత్స కోసం ${rx.length} ఔషధాలు/మందులు గుర్తించబడ్డాయి.`
        : 'ఈ నివేదికలో కొత్త ప్రిస్క్రిప్షన్లు ఏవీ లేవు.',
    ];

    const teluguAbnormalResults =
      abnormalLabs.length > 0
        ? abnormalLabs.map(
            (l) => `${l.testName}: ${l.result} (ప్రామాణిక పరిధి: ${l.referenceRange}) — ${l.abnormalFlag === 'HIGH' ? 'ఎక్కువగా ఉంది (HIGH)' : 'తక్కువగా ఉంది (LOW)'}`
          )
        : ['అన్ని ల్యాబ్ పరీక్షా ఫలితాలు సాధారణ ప్రామాణిక పరిధిలోనే ఉన్నాయి.'];

    const teluguMeanings =
      abnormalLabs.length > 0
        ? `నివేదికలో ${abnormalLabs.length} కొలతలు సాధారణ పరిధి కంటే భిన్నంగా ఉన్నాయి (${abnormalLabs
            .map((a) => `${a.testName} ${a.result}`)
            .join(', ')}). ఇది ఖచ్చితమైన వ్యాధి నిర్ధారణ కాదు; దయచేసి మీ వైద్యుడిని సంప్రదించండి.`
        : 'అన్ని పరీక్షా విలువలు సాధారణ పరిధిలో ఉన్నాయి. సాధారణ ఆరోగ్య జీవన విధానాన్ని కొనసాగించండి.';

    const teluguMedicines =
      rx.length > 0
        ? rx.map((m) => `${m.medicationName} — మోతాదు: ${m.dosage || 'నిర్దేశించినట్లు'} (${m.frequency || ''}, ${m.instructions || ''})`)
        : ['ఈ పత్రంలో నిర్దిష్ట మందులు నమోదు చేయబడలేదు.'];

    const teluguQuestions = [
      'ఈ తాజా పరీక్ష ఫలితాలు నా సాధారణ ఆరోగ్యం గురించి ఏమి తెలియజేస్తున్నాయి?',
      ...(abnormalLabs.length > 0
        ? [`సాధారణ పరిధిలో లేని ${abnormalLabs[0].testName} కొరకు తదుపరి ఏమి చేయాలి?`]
        : []),
      'ఆహారపు అలవాట్లలో లేదా జీవనశైలిలో ఏవైనా మార్పులు అవసరమా?',
      'తదుపరి చెకప్ ఎప్పుడు చేయించుకోవాలి?',
    ];

    return {
      summary: {
        overview: englishOverview,
        keyFindings: englishKeyFindings,
        abnormalResults: englishAbnormalResults,
        possibleMeanings: englishMeanings,
        medicinesAndInstructions: englishMedicines,
        questionsForDoctor: englishQuestions,
      },
      teluguSummary: {
        overview: teluguOverview,
        keyFindings: teluguKeyFindings,
        abnormalResults: teluguAbnormalResults,
        possibleMeanings: teluguMeanings,
        medicinesAndInstructions: teluguMedicines,
        questionsForDoctor: teluguQuestions,
      },
    };
  }

  /**
   * Complete end-to-end extraction pipeline
   */
  async processMedicalContent(extractedText = '', initialDocType = 'Other') {
    const { classification, confidence } = this.classifyDocument(extractedText, initialDocType);
    const structuredData = this.extractWithRules(extractedText);
    structuredData.confidenceScore = confidence;

    const { summary, teluguSummary } = this.generateSummaries({
      extractedText,
      structuredData,
      documentType: classification,
    });

    return {
      classifiedType: classification,
      structuredData,
      summary,
      teluguSummary,
    };
  }
}

module.exports = new MedicalExtractionService();
