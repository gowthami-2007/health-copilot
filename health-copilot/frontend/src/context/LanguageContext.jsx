import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import translations, { translateClinicalPhrase } from '../locales/translations';
import useAuth from '../hooks/useAuth';

export const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const { user } = useAuth();

  const [language, setLanguageState] = useState(() => {
    try {
      const stored = localStorage.getItem('health_copilot_language');
      if (stored === 'te' || stored === 'en') return stored;
    } catch {}
    if (user?.preferredLanguage === 'te' || user?.preferredLanguage === 'en') {
      return user.preferredLanguage;
    }
    return 'en';
  });

  // Whenever user profile updates or loads, synchronize language
  useEffect(() => {
    if (user?.preferredLanguage && (user.preferredLanguage === 'te' || user.preferredLanguage === 'en')) {
      setLanguageState(user.preferredLanguage);
      try {
        localStorage.setItem('health_copilot_language', user.preferredLanguage);
      } catch {}
      document.documentElement.lang = user.preferredLanguage;
    }
  }, [user?.preferredLanguage]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((lang) => {
    const validLang = lang === 'te' ? 'te' : 'en';
    setLanguageState(validLang);
    try {
      localStorage.setItem('health_copilot_language', validLang);
    } catch {}
    document.documentElement.lang = validLang;
  }, []);

  /**
   * Helper translation function supporting dot-notation keys:
   * e.g. t('nav.dashboard') or t('assistant.thinking')
   */
  const t = useCallback(
    (keyPath, fallback = '') => {
      if (!keyPath) return fallback;
      const keys = keyPath.split('.');
      let current = translations[language] || translations.en;

      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k];
        } else {
          // Fallback to English dictionary
          let enCurrent = translations.en;
          for (const enK of keys) {
            if (enCurrent && typeof enCurrent === 'object' && enK in enCurrent) {
              enCurrent = enCurrent[enK];
            } else {
              return fallback || keyPath;
            }
          }
          return enCurrent !== undefined ? enCurrent : (fallback || keyPath);
        }
      }

      return current !== undefined ? current : (fallback || keyPath);
    },
    [language]
  );

  /**
   * Translate clinical instructions or frequency phrases (e.g. 'Once daily with meals')
   */
  const tClin = useCallback(
    (phrase) => {
      return translateClinicalPhrase(phrase, language);
    },
    [language]
  );

  const value = {
    language,
    isTelugu: language === 'te',
    setLanguage,
    t,
    tClin,
    translations: translations[language] || translations.en,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export default LanguageContext;
