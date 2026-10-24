import React, { useState } from 'react';
import {
  Sparkles,
  HelpCircle,
  AlertCircle,
  Calendar,
  Pill,
  Activity,
  Stethoscope,
  Globe,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  FileText,
  Info,
  Copy,
  Check,
  Volume2,
  VolumeX,
  BookmarkCheck,
  Clock,
  HeartPulse,
  ShieldCheck,
  ArrowRight,
  Sun,
  Moon,
} from 'lucide-react';

const DocumentSummary = ({ summary = {}, teluguSummary = null, preferredLanguage = 'en', document = null }) => {
  const [currentLang, setCurrentLang] = useState(preferredLanguage || 'en');
  const [summaryMode, setSummaryMode] = useState('story'); // 'story' | 'routine'
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Select active summary payload
  const activeSummary = currentLang === 'te' && teluguSummary?.overview
    ? teluguSummary
    : summary;

  const {
    overview,
    plainLanguageSummary,
    keyFindings = [],
    abnormalResults = [],
    possibleMeanings,
    medicinesAndInstructions = [],
    questionsForDoctor = [],
    keyInformation = [],
    datesMentioned = [],
    medicationsMentioned = [],
    testsMentioned = [],
    doctorQuestions = [],
  } = activeSummary || {};

  const displayFindings = (keyFindings && keyFindings.length > 0) ? keyFindings : keyInformation;
  const displayQuestions = (questionsForDoctor && questionsForDoctor.length > 0) ? questionsForDoctor : doctorQuestions;

  // Synthesize plain-language patient breakdown
  const generatePlainLanguageBreakdown = () => {
    const docType = document?.documentType || 'Medical Document';
    const patientName = document?.structuredData?.patientName || '';
    const doctorName = document?.structuredData?.healthcareProvider || document?.structuredData?.prescriptions?.[0]?.prescribingDoctor || '';
    const prescriptions = document?.structuredData?.prescriptions || [];

    // Prescription-specific plain language synthesis
    if (docType === 'Prescription' || (prescriptions && prescriptions.length > 0)) {
      const medExplanations = prescriptions.map((p) => {
        const name = p.medicationName || 'Prescribed Medicine';
        const dosage = p.dosage || 'As directed';
        const freq = p.frequency || 'Daily';
        let purpose = currentLang === 'te'
          ? 'లక్షణాల నియంత్రణ మరియు త్వరిత స్వస్థతకు సహాయపడుతుంది.'
          : 'Supports symptom relief and targeted clinical healing.';

        const lower = name.toLowerCase();
        if (lower.includes('allegra') || lower.includes('alaspan') || lower.includes('cetirizine') || lower.includes('levocet')) {
          purpose = currentLang === 'te'
            ? 'అలెర్జీ, తుమ్ములు, ముక్కు కారడం, గొంతు మంట మరియు దురదను తగ్గిస్తుంది.'
            : 'Antihistamine / antiallergy medicine prescribed to relieve sneezing, runny nose, allergic congestion, and itchy irritation.';
        } else if (lower.includes('amox') || lower.includes('azith') || lower.includes('cefix') || lower.includes('cipro') || lower.includes('antibiotic')) {
          purpose = currentLang === 'te'
            ? 'బాక్టీరియల్ ఇన్‌ఫెక్షన్‌ను నివారిస్తుంది. కోర్సు పూర్తయ్యే వరకు తప్పక వాడాలి.'
            : 'Antibiotic therapy to clear underlying bacterial infection. Must be continued for the full duration even after feeling better.';
        } else if (lower.includes('panto') || lower.includes('omep') || lower.includes('rabep') || lower.includes('dsr') || lower.includes('antacid')) {
          purpose = currentLang === 'te'
            ? 'కడుపులో అసిడిటీ, గ్యాస్ మరియు మంటను నివారిస్తుంది. ఉదయం భోజనానికి ముందు తీసుకోవాలి.'
            : 'Proton pump inhibitor / antacid to reduce stomach acidity, prevent gas or reflux, and protect the stomach lining. Best taken before breakfast.';
        } else if (lower.includes('dolo') || lower.includes('paracetamol') || lower.includes('crocin') || lower.includes('ibuprofen')) {
          purpose = currentLang === 'te'
            ? 'జ్వరం మరియు ఒంటి నొప్పులను తగ్గిస్తుంది.'
            : 'Analgesic and antipyretic to relieve fever, headaches, and general body aches.';
        } else if (lower.includes('metformin') || lower.includes('glim')) {
          purpose = currentLang === 'te'
            ? 'రక్తంలో గ్లూకోజ్ (చక్కెర) స్థాయిలను సాధారణ స్థితిలో ఉంచుతుంది.'
            : 'Helps balance blood sugar levels and enhances metabolic glucose regulation.';
        } else if (lower.includes('telmi') || lower.includes('amlo') || lower.includes('aten')) {
          purpose = currentLang === 'te'
            ? 'రక్తపోటును (BP) నియంత్రించి గుండె ఆరోగ్యాన్ని కాపాడుతుంది.'
            : 'Maintains healthy blood pressure and protects your cardiovascular system.';
        }

        return {
          name,
          dosage,
          frequency: freq,
          instructions: p.instructions || '',
          purpose,
        };
      });

      return {
        executive: plainLanguageSummary || (currentLang === 'te'
          ? `ఈ వైద్య ప్రిస్క్రిప్షన్ ${doctorName ? `${doctorName} వద్ద ` : ''}మీరు చేయించుకున్న సంప్రదింపు ఆధారంగా అందించబడింది${patientName ? ` (${patientName} కోసం)` : ''}. మీ ఆరోగ్య సమస్యలను నివారించడానికి డాక్టర్ ${medExplanations.length} మందులతో కూడిన చికిత్సా ప్రణాళికను సూచించారు.`
          : `This medical prescription was issued by ${doctorName || 'your treating physician'}${patientName ? ` for ${patientName}` : ''}. Your doctor has established a focused, multi-medication treatment plan to address your symptoms and accelerate recovery.`),
        medications: medExplanations,
        careTips: currentLang === 'te'
          ? [
              'రోజూ పుష్కలంగా మంచి నీరు (కనీసం 2-3 లీటర్లు) త్రాగండి మరియు తగినంత నిద్ర విశ్రాంతి తీసుకోండి.',
              'మందులను సమయానికి, డాక్టర్ సూచించిన మోతాదులోనే వాడండి; వేళలు దాటవేయవద్దు.',
              'ఎక్కువ మోతాదులో మసాలాలు, వేపుళ్ళు లేదా నిల్వ ఉంచిన ఆహారాలను నివారించండి.',
              'సూచించిన రోజులు పూర్తయ్యేంత వరకు మందుల కోర్సును కొనసాగించండి.',
            ]
          : [
              'Stay well-hydrated with 2-3 liters of clean water daily and get 7-8 hours of quality sleep.',
              'Take each medication at regular scheduled hours; avoid skipping or doubling doses.',
              'Take medications with or after light meals if you have sensitive digestion or taking antibiotics.',
              'Avoid dust, sudden cold temperature changes, or known triggers while recovering.',
            ],
        redFlags: currentLang === 'te'
          ? 'తీవ్రమైన జ్వరం, శ్వాస తీసుకోవడంలో ఇబ్బంది, ఒంటిపై దద్దుర్లు లేదా మైకం వస్తే వెంటనే మీ వైద్యుడిని సంప్రదించండి.'
          : 'Seek urgent clinical advice if you develop difficulty breathing, persistent high fever, unexpected skin rashes, or extreme dizziness.',
      };
    }

    // Default Lab Report / General Document Breakdown
    return {
      executive: plainLanguageSummary || overview || (currentLang === 'te'
        ? 'ఈ వైద్య నివేదిక మీ ఆరోగ్య సూచికలు మరియు ప్రయోగశాల పరీక్షల ఫలితాల పూర్తి వివరాలను అందిస్తుంది.'
        : 'This medical report provides detailed diagnostic measurements and clinical observations from your healthcare test.'),
      medications: [],
      careTips: currentLang === 'te'
        ? [
            'ఈ ఫలితాలను మీ తదుపరి అపాయింట్‌మెంట్‌లో డాక్టర్‌తో చర్చించండి.',
            'సాధారణ పరిధి వెలుపల ఉన్న విలువల కోసం ప్రత్యేక ఆహార మరియు జీవనశైలి మార్పులను పాటించండి.',
            'డాక్టర్ సలహా లేకుండా ఎలాంటి మందులను స్వయంగా మార్చవద్దు.',
          ]
        : [
            'Discuss any out-of-range parameters directly with your primary care physician.',
            'Maintain a balanced, nutrient-dense diet and stay physically active.',
            'Keep this digital health record organized for future clinical comparisons.',
          ],
      redFlags: currentLang === 'te'
        ? 'ఏదైనా అసాధారణ నొప్పి లేదా తీవ్రమైన అసౌకర్యం ఉంటే వెంటనే అత్యవసర సంరక్షణను పొందండి.'
        : 'If you experience sudden acute symptoms, severe pain, or unexpected clinical deterioration, consult urgent healthcare services promptly.',
    };
  };

  const plainBreakdown = generatePlainLanguageBreakdown();

  // Handle Speech Synthesis Readout
  const handleToggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const narrative = [
      plainBreakdown.executive,
      plainBreakdown.medications.map((m) => `${m.name}: ${m.purpose}`).join('. '),
      currentLang === 'te' ? 'జాగ్రత్తలు:' : 'Care guidelines:',
      plainBreakdown.careTips.join('. '),
    ].join('. ');

    const utterance = new SpeechSynthesisUtterance(narrative);
    utterance.lang = currentLang === 'te' ? 'te-IN' : 'en-US';
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Copy Summary text to clipboard
  const handleCopySummary = () => {
    const summaryText = `--- AI Medical Document Summary ---
Executive Summary:
${plainBreakdown.executive}

Prescribed Medications & Purpose:
${plainBreakdown.medications.map((m) => `• ${m.name} (${m.dosage}, ${m.frequency}): ${m.purpose}`).join('\n')}

Daily Care & Lifestyle Tips:
${plainBreakdown.careTips.map((c) => `• ${c}`).join('\n')}

Important Red Flags:
${plainBreakdown.redFlags}
`;
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Language Switcher Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#ffffff',
          padding: '0.65rem 1rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: 600 }}>
          <Globe size={18} color="var(--primary)" />
          <span>Summary Language / సారాంశ భాష:</span>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            type="button"
            onClick={() => setCurrentLang('en')}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${currentLang === 'en' ? 'var(--primary)' : 'var(--border-light)'}`,
              backgroundColor: currentLang === 'en' ? 'var(--primary)' : '#f8fafc',
              color: currentLang === 'en' ? '#ffffff' : 'var(--text-main)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            English
          </button>

          <button
            type="button"
            onClick={() => setCurrentLang('te')}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${currentLang === 'te' ? 'var(--primary)' : 'var(--border-light)'}`,
              backgroundColor: currentLang === 'te' ? 'var(--primary)' : '#f8fafc',
              color: currentLang === 'te' ? '#ffffff' : 'var(--text-main)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            తెలుగు (Telugu)
          </button>
        </div>
      </div>

      {/* 1. Overview Block: What this document is */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%)',
          border: '1px solid #a7f3d0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Sparkles size={20} color="#059669" />
          <h3 style={{ fontSize: '1.15rem', color: '#064e3b', margin: 0 }}>
            {currentLang === 'te' ? 'పత్రం అవలోకనం (What This Document Is)' : 'What This Document Is'}
          </h3>
        </div>
        <p style={{ color: '#134e4a', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
          {overview || (currentLang === 'te' ? 'సారాంశం ఇంకా రూపొందించబడలేదు.' : 'No overview generated yet.')}
        </p>
      </div>

      {/* 2. Abnormal Results / Out of Reference Ranges Flag */}
      {abnormalResults && abnormalResults.length > 0 && (
        <div
          className="card"
          style={{
            backgroundColor: '#fff1f2',
            border: '1px solid #fecdd3',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <AlertTriangle size={20} color="#e11d48" />
            <h3 style={{ fontSize: '1.1rem', color: '#9f1239', margin: 0 }}>
              {currentLang === 'te' ? 'సాధారణ పరిధి వెలుపల ఉన్న ఫలితాలు (Results Outside Reference Ranges)' : 'Results Outside Reference Ranges'}
            </h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#881337', marginBottom: '0.75rem' }}>
            {currentLang === 'te'
              ? 'ఈ క్రింది విలువలు ప్రయోగశాల నిర్దేశిత సాధారణ పరిమితులకు భిన్నంగా ఉన్నాయి. వైద్యుడి సంప్రదింపు సిఫార్సు చేయబడింది:'
              : 'The following values fall outside the reporting laboratory’s reference intervals. Please discuss these with your doctor:'}
          </p>
          <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', margin: 0 }}>
            {abnormalResults.map((item, idx) => (
              <li key={idx} style={{ fontSize: '0.9rem', color: '#9f1239', fontWeight: 600 }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 3. Key Findings */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Activity size={20} color="var(--primary)" />
          <h3 style={{ fontSize: '1.15rem', margin: 0 }}>
            {currentLang === 'te' ? 'ముఖ్యమైన పరిశీలనలు (Key Findings)' : 'Key Clinical Findings'}
          </h3>
        </div>

        {displayFindings.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {currentLang === 'te' ? 'ప్రత్యేక పరిశీలనలు లేవు.' : 'No specific measurement flags extracted.'}
          </p>
        ) : (
          <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: 0 }}>
            {displayFindings.map((item, idx) => (
              <li key={idx} style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 4. What the Findings May Mean (Clinical Interpretation with uncertainty) */}
      {possibleMeanings && (
        <div
          className="card"
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Info size={18} color="var(--primary)" />
            <h4 style={{ fontSize: '1rem', color: 'var(--text-main)', margin: 0 }}>
              {currentLang === 'te' ? 'ఫలితాల అర్థం ఏమిటి (What the Findings May Mean)' : 'What the Findings May Mean'}
            </h4>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
            {possibleMeanings}
          </p>
        </div>
      )}

      {/* 5. Medicines & Prescriptions / Instructions */}
      {((medicinesAndInstructions && medicinesAndInstructions.length > 0) || (medicationsMentioned && medicationsMentioned.length > 0)) && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Pill size={18} color="var(--secondary)" />
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
              {currentLang === 'te' ? 'మందులు మరియు సూచనలు (Medicines & Instructions)' : 'Medicines & Documented Instructions'}
            </h3>
          </div>
          <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', margin: 0 }}>
            {(medicinesAndInstructions.length > 0 ? medicinesAndInstructions : medicationsMentioned).map((m, i) => (
              <li key={i} style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 500 }}>
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 6. Questions to Discuss with Your Healthcare Professional */}
      <div
        className="card"
        style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Stethoscope size={20} color="#b45309" />
          <h3 style={{ fontSize: '1.15rem', color: '#92400e', margin: 0 }}>
            {currentLang === 'te' ? 'వైద్యుడిని అడగవలసిన ప్రశ్నలు (Questions to Ask Your Doctor)' : 'Questions to Discuss with Your Healthcare Professional'}
          </h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#78350f', marginBottom: '0.75rem' }}>
          {currentLang === 'te'
            ? 'ఈ ప్రశ్నలను మీ తదుపరి వైద్య పరీక్షకు తీసుకువెళ్ళండి:'
            : 'Take these proactive discussion prompts to your next appointment:'}
        </p>
        <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: 0 }}>
          {displayQuestions.map((q, idx) => (
            <li key={idx} style={{ fontSize: '0.9rem', color: '#78350f', fontWeight: 500 }}>
              {q}
            </li>
          ))}
        </ul>
      </div>

      {/* ========================================================================= */}
      {/* 7. AI-GENERATED COMPREHENSIVE DOCUMENT SUMMARY (BELOW QUESTIONS SECTION) */}
      {/* ========================================================================= */}
      <div
        id="ai-generated-document-summary-section"
        className="card"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdfa 50%, #eff6ff 100%)',
          border: '1.5px solid #67e8f9',
          boxShadow: '0 4px 15px -3px rgba(14, 165, 233, 0.1)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow Accent Bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #0284c7 0%, #0d9488 50%, #6366f1 100%)',
          }}
        />

        {/* Section Header & Interactive Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '1rem',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid #e0f2fe',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#e0f2fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  {currentLang === 'te'
                    ? 'AI రూపొందించిన సమగ్ర వైద్య సారాంశం'
                    : 'AI-Generated Medical Document Summary'}
                </h3>
                <span
                  style={{
                    backgroundColor: '#ccfbf1',
                    color: '#0f766e',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Plain Language
                </span>
              </div>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                {currentLang === 'te'
                  ? 'వైద్య నిబంధనలు లేకుండా సులభంగా అర్థమయ్యే రీతిలో రూపొందించబడిన విశ్లేషణ.'
                  : 'An easy-to-understand clinical breakdown of your document, medicines, and care routine.'}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* View Mode Toggle Buttons */}
            <div style={{ display: 'inline-flex', backgroundColor: '#e2e8f0', borderRadius: 'var(--radius-sm)', padding: '2px' }}>
              <button
                type="button"
                onClick={() => setSummaryMode('story')}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: summaryMode === 'story' ? '#ffffff' : 'transparent',
                  color: summaryMode === 'story' ? '#0f172a' : '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: summaryMode === 'story' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                {currentLang === 'te' ? 'వివరణాత్మక కథనం' : 'Patient Story'}
              </button>
              <button
                type="button"
                onClick={() => setSummaryMode('routine')}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: summaryMode === 'routine' ? '#ffffff' : 'transparent',
                  color: summaryMode === 'routine' ? '#0f172a' : '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: summaryMode === 'routine' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                {currentLang === 'te' ? 'రోజువారీ షెడ్యూల్' : 'Daily Schedule'}
              </button>
            </div>

            {/* Read Aloud Button */}
            <button
              type="button"
              onClick={handleToggleSpeech}
              title={isSpeaking ? 'Stop listening' : 'Listen to AI Summary'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #cbd5e1',
                backgroundColor: isSpeaking ? '#fee2e2' : '#ffffff',
                color: isSpeaking ? '#dc2626' : '#334155',
                fontSize: '0.775rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
              <span>{isSpeaking ? (currentLang === 'te' ? 'ఆపు' : 'Stop') : (currentLang === 'te' ? 'వినండి' : 'Listen')}</span>
            </button>

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopySummary}
              title="Copy Summary to Clipboard"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontSize: '0.775rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {copied ? <Check size={14} color="#059669" /> : <Copy size={14} />}
              <span>{copied ? (currentLang === 'te' ? 'కాపీ చేయబడింది!' : 'Copied!') : (currentLang === 'te' ? 'కాపీ' : 'Copy')}</span>
            </button>
          </div>
        </div>

        {/* View Mode 1: Detailed Plain Language Story */}
        {summaryMode === 'story' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Executive Health Overview */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-md)',
                padding: '1rem 1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.5rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem' }}>
                <BookmarkCheck size={18} />
                <span>{currentLang === 'te' ? 'ముఖ్యమైన ఆరోగ్య వివరణ (Executive Summary):' : 'Key Health Takeaway:'}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.925rem', lineHeight: 1.65, color: '#1e293b' }}>
                {plainBreakdown.executive}
              </p>
            </div>

            {/* Medication Explanations in Simple Terms (if medications are present) */}
            {plainBreakdown.medications && plainBreakdown.medications.length > 0 && (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem 1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.75rem', color: '#0d9488', fontWeight: 700, fontSize: '0.9rem' }}>
                  <Pill size={18} />
                  <span>{currentLang === 'te' ? 'సూచించిన మందులు & వాటి ప్రయోజనాలు:' : 'Prescribed Medications & What They Do in Your Body:'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.65rem' }}>
                  {plainBreakdown.medications.map((med, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: '#f8fafc',
                        borderLeft: '3px solid var(--primary)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.925rem', color: '#0f172a' }}>
                          {med.name}
                        </span>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#e0f2fe', color: '#0369a1', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                            {med.dosage}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#475569', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                            {med.frequency}
                          </span>
                        </div>
                      </div>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#334155', lineHeight: 1.5 }}>
                        <strong>{currentLang === 'te' ? 'పనితీరు:' : 'Role:'}</strong> {med.purpose}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily Care & Recovery Guidance */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-md)',
                padding: '1rem 1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.65rem', color: '#2563eb', fontWeight: 700, fontSize: '0.9rem' }}>
                <HeartPulse size={18} />
                <span>{currentLang === 'te' ? 'రోజువారీ జాగ్రత్తలు & జీవనశైలి సూచనలు:' : 'Daily Care & Recovery Guidance:'}</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {plainBreakdown.careTips.map((tip, idx) => (
                  <li key={idx} style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.5 }}>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Red Flag Warning */}
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
              }}
            >
              <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.825rem', color: '#991b1b', lineHeight: 1.45 }}>
                <strong>{currentLang === 'te' ? 'ముఖ్య హెచ్చరిక:' : 'Important Safety Note:'}</strong> {plainBreakdown.redFlags}
              </div>
            </div>
          </div>
        )}

        {/* View Mode 2: Quick Daily Routine Schedule */}
        {summaryMode === 'routine' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {/* Morning Card */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #fed7aa',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#ea580c', fontWeight: 700, fontSize: '0.875rem' }}>
                  <Sun size={18} />
                  <span>{currentLang === 'te' ? 'ఉదయం (Morning)' : 'Morning Routine'}</span>
                </div>
                <div style={{ fontSize: '0.825rem', color: '#475569', lineHeight: 1.45 }}>
                  {plainBreakdown.medications.length > 0 ? (
                    <div>
                      <strong>Medicines:</strong> Take morning doses (e.g. 1-0-0) after breakfast with a full glass of water.
                    </div>
                  ) : (
                    <div>Review your hydration and balanced nutrition for the day.</div>
                  )}
                </div>
              </div>

              {/* Afternoon Card */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #bae6fd',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#0284c7', fontWeight: 700, fontSize: '0.875rem' }}>
                  <Clock size={18} />
                  <span>{currentLang === 'te' ? 'మధ్యాహ్నం (Afternoon)' : 'Afternoon Check'}</span>
                </div>
                <div style={{ fontSize: '0.825rem', color: '#475569', lineHeight: 1.45 }}>
                  Stay hydrated with fresh water. Avoid heavy or oily foods that could cause gastric irritation.
                </div>
              </div>

              {/* Night Card */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#4338ca', fontWeight: 700, fontSize: '0.875rem' }}>
                  <Moon size={18} />
                  <span>{currentLang === 'te' ? 'రాత్రి (Evening / Night)' : 'Night Routine'}</span>
                </div>
                <div style={{ fontSize: '0.825rem', color: '#475569', lineHeight: 1.45 }}>
                  Take any prescribed evening doses (e.g. 0-0-1 or 0-1-1) after dinner. Ensure 7-8 hours of sound sleep.
                </div>
              </div>
            </div>

            {/* Follow-up Milestone reminder */}
            <div
              style={{
                backgroundColor: '#f1f5f9',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
                fontSize: '0.825rem',
                color: '#334155',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={16} color="var(--primary)" />
                <span>
                  <strong>{currentLang === 'te' ? 'తదుపరి సమీక్ష:' : 'Next Milestone:'}</strong>{' '}
                  {activeSummary?.followUpInstructions?.length > 0
                    ? activeSummary.followUpInstructions.join(', ')
                    : (currentLang === 'te' ? '5 రోజుల తర్వాత లేదా లక్షణాలు తగ్గకపోతే వైద్యుడిని సంప్రదించండి.' : 'Review after 5 days or if symptoms do not improve.')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Safety & Medical Disclaimer Box */}
      <div
        style={{
          padding: '0.85rem 1rem',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
        }}
      >
        <AlertCircle size={16} color="var(--text-subtle)" style={{ flexShrink: 0 }} />
        <span>
          <strong>DISCLAIMER / గమనిక:</strong> AI-generated health summaries are informational only. They do not diagnose conditions, prescribe medications, or replace direct licensed medical advice. Always consult a qualified physician.
        </span>
      </div>
    </div>
  );
};

export default DocumentSummary;
