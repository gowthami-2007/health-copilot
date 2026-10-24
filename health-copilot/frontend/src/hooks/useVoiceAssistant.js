import { useState, useEffect, useRef, useCallback } from 'react';

export const useVoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);

  // Check Web Speech API support
  const speechRecognitionSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const speechSynthesisSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const supported = speechRecognitionSupported && speechSynthesisSupported;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /**
   * Starts listening for speech in Telugu (te-IN) or English (en-US).
   */
  const startListening = useCallback(({ language = 'en', onTranscript = null } = {}) => {
    setError(null);
    if (!speechRecognitionSupported) {
      setError('Speech recognition is not supported in this browser. Try Google Chrome or Microsoft Edge.');
      return;
    }

    // Stop speaking if currently speaking
    if (speechSynthesisSupported && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      // Set language: Telugu (te-IN), Hindi (hi-IN), or English (en-US)
      if (language === 'te') {
        recognition.lang = 'te-IN';
      } else if (language === 'hi') {
        recognition.lang = 'hi-IN';
      } else {
        recognition.lang = 'en-US';
      }

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
      };

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        if (onTranscript) {
          onTranscript(currentTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition event notice:', event.error);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setError(`Voice input notice: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('Could not start speech recognition:', err.message);
      setError(err.message);
      setIsListening(false);
    }
  }, [speechRecognitionSupported, speechSynthesisSupported]);

  /**
   * Stops listening.
   */
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      setIsListening(false);
    }
  }, []);

  /**
   * Speaks out an answer in Telugu or English using SpeechSynthesis.
   */
  const speak = useCallback((text, { language = 'en', rate = 0.95 } = {}) => {
    if (!speechSynthesisSupported || !text) return;

    window.speechSynthesis.cancel();

    // Clean markdown stars, hashtags, and formatting for smooth narration
    const cleanText = text
      .replace(/[*#_`>~]/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/\n+/g, '. ')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = rate;
    utterance.pitch = 1.0;

    const targetLang = language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-US';
    utterance.lang = targetLang;

    // Pick best matching voice if available
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find((v) => v.lang === targetLang || v.lang.startsWith(language));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [speechSynthesisSupported]);

  /**
   * Stops speaking immediately.
   */
  const stopSpeaking = useCallback(() => {
    if (speechSynthesisSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [speechSynthesisSupported]);

  return {
    supported,
    isListening,
    isSpeaking,
    transcript,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
};

export default useVoiceAssistant;
