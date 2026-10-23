import React, { useState, useEffect } from 'react';
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
  FileText,
  Info,
  Volume2,
  VolumeX,
  Printer,
} from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

const DocumentSummary = ({ summary = {}, teluguSummary = null, preferredLanguage }) => {
  const { language } = useLanguage();
  const [currentLang, setCurrentLang] = useState(preferredLanguage || language || 'en');
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (preferredLanguage) {
      setCurrentLang(preferredLanguage);
    } else if (language) {
      setCurrentLang(language);
    }
  }, [preferredLanguage, language]);

  // Clean up speech synthesis when component unmounts or language changes
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentLang]);

  // Select active summary payload
  const activeSummary = currentLang === 'te' && teluguSummary?.overview
    ? teluguSummary
    : summary;

  const {
    overview,
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

  const handleToggleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported on this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const textToRead = `${overview || ''}. ${
      displayFindings.length > 0
        ? (currentLang === 'te' ? 'ముఖ్యమైన అంశాలు: ' : 'Key Findings: ') + displayFindings.slice(0, 3).join('. ')
        : ''
    }`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = currentLang === 'te' ? 'te-IN' : 'en-US';
    utterance.rate = 0.95;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handlePrintPassport = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Control Bar: Language Switcher, Voice Readout, and Print Passport */}
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
          flexWrap: 'wrap',
          gap: '0.6rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: 600 }}>
          <Globe size={18} color="var(--primary)" />
          <span>Summary Language / సారాంశ భాష:</span>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              if (isSpeaking && typeof window !== 'undefined') window.speechSynthesis.cancel();
              setIsSpeaking(false);
              setCurrentLang('en');
            }}
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
            onClick={() => {
              if (isSpeaking && typeof window !== 'undefined') window.speechSynthesis.cancel();
              setIsSpeaking(false);
              setCurrentLang('te');
            }}
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

          {/* Voice Readout Button */}
          <button
            type="button"
            onClick={handleToggleSpeak}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.8rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid #93c5fd',
              backgroundColor: isSpeaking ? '#dbeafe' : '#eff6ff',
              color: '#1d4ed8',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title={isSpeaking ? 'Stop audio readout' : 'Listen to clinical summary aloud'}
          >
            {isSpeaking ? <VolumeX size={15} color="#dc2626" /> : <Volume2 size={15} color="#1d4ed8" />}
            <span>{isSpeaking ? (currentLang === 'te' ? 'ఆపండి' : 'Stop') : (currentLang === 'te' ? 'వినండి' : 'Listen')}</span>
          </button>

          {/* Print Clinical Summary */}
          <button
            type="button"
            onClick={handlePrintPassport}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.8rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-light)',
              backgroundColor: '#f8fafc',
              color: 'var(--text-main)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Print doctor visit summary / PDF"
          >
            <Printer size={15} color="var(--text-muted)" />
            <span>{currentLang === 'te' ? 'ప్రింట్' : 'Print'}</span>
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
          <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', margin: 0 }}>
            {(medicinesAndInstructions.length > 0 ? medicinesAndInstructions : medicationsMentioned).map((m, i) => (
              <li key={i} style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 500 }}>
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 6. Questions for Doctor */}
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
