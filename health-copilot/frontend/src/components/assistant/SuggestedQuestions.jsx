import React from 'react';
import { Sparkles } from 'lucide-react';
import useLanguage from '../../hooks/useLanguage';

const EN_SUGGESTIONS = [
  'What information was present in my latest blood report?',
  'Summarize my recent health records.',
  'What medications am I currently taking?',
  'What questions should I ask my doctor at my next visit?',
  'Check if my cholesterol or glucose was tested.',
  'When is my next upcoming appointment scheduled?',
];

const TE_SUGGESTIONS = [
  'నా తాజా రక్త పరీక్ష నివేదికలో ఏమి ఉంది?',
  'నా ఇటీవలి ఆరోగ్య రికార్డులను సంగ్రహించండి.',
  'నేను ప్రస్తుతం ఏ మందులు వాడుతున్నాను?',
  'నా తదుపరి సందర్శనలో నా వైద్యుడిని నేను ఏమి అడగాలి?',
  'నా కొలెస్ట్రాల్ లేదా గ్లూకోజ్ పరీక్షించబడిందో లేదో తనిఖీ చేయండి.',
  'నా తదుపరి రాబోయే అపాయింట్‌మెంట్ ఎప్పుడు ఉంది?',
];

const SuggestedQuestions = ({ onSelectQuestion }) => {
  const { t, isTelugu } = useLanguage();
  const suggestions = isTelugu ? TE_SUGGESTIONS : EN_SUGGESTIONS;

  return (
    <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: 600 }}>
        <Sparkles size={15} color="var(--accent)" />
        <span>{t('assistant.suggestedTitle', 'Suggested health questions to get started:')}</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', maxWidth: '750px', margin: '0 auto' }}>
        {suggestions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectQuestion(q)}
            style={{
              padding: '0.5rem 0.85rem',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-full)',
              color: 'var(--text-main)',
              fontSize: '0.825rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: 'var(--shadow-xs)',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.backgroundColor = '#f5f3ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-light)';
              e.currentTarget.style.backgroundColor = '#ffffff';
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SuggestedQuestions;
