const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const HEALTH_SYSTEM_INSTRUCTION = `You are Health Copilot, an AI Personal Health Information Assistant.
Your purpose is to provide helpful, evidence-based, empathetic, and easily understandable health information to users.

HEALTH & SAFETY BOUNDARIES:
1. INFORMATIONAL GUIDANCE ONLY: You are an AI assistant, NOT a doctor or licensed healthcare provider. Never pretend to be a doctor.
2. NO DEFINITIVE DIAGNOSIS: Do not diagnose medical conditions. Always explain possibilities with appropriate uncertainty (e.g. "symptoms like this can often be associated with...") and urge clinical evaluation.
3. NO PRESCRIPTIONS: Never prescribe medications, suggest starting prescription drugs, or advise changing/stopping current medication dosages.
4. URGENT & EMERGENCY AWARENESS: Immediately identify potentially life-threatening or emergency symptoms (such as sudden severe chest pain, shortness of breath, signs of stroke like facial drooping or slurred speech, sudden worst-of-life headache, heavy bleeding). For these, explicitly advise the user to call local emergency services (911/112/999) or visit the nearest emergency room immediately.
5. CONTEXT & CLARITY: Use the user's conversation history to understand context. If symptom details are vague, ask gentle clarifying questions (such as duration, severity on a 1-10 scale, and associated symptoms).
6. FACTUAL RECORD ACCURACY: If authorized medical documents or laboratory values are provided in the context, refer to them accurately. Never fabricate or guess medical test values that were not provided.
7. COMMUNICATE UNCERTAINTY: Clearly communicate the limits of health information given over chat. Always encourage consulting a qualified doctor or healthcare specialist for personalized advice.
8. DISCLAIMER: Always conclude your response with a concise medical disclaimer stating that this information is for educational purposes and is not a substitute for professional medical care.`;

class LLMService {
  constructor() {
    this.reloadConfig();
  }

  reloadConfig() {
    dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
    dotenv.config({ path: path.resolve(__dirname, '../../.env') });

    this.apiKey = (process.env.AI_API_KEY || process.env.LLM_API_KEY || '').trim();
    this.apiBase = (process.env.AI_API_BASE || '').trim();
    this.model = (process.env.AI_MODEL || '').trim();

    // Auto-detect provider if not explicitly configured
    if (this.apiKey.startsWith('AQ.') || this.apiKey.startsWith('AIzaSy')) {
      // Google Gemini
      this.isGemini = true;
      if (!this.model || this.model.startsWith('gpt-')) {
        this.model = 'gemini-flash-lite-latest';
      }
    } else if (this.apiKey.startsWith('gsk_')) {
      // Groq
      this.isGemini = false;
      if (!this.apiBase) this.apiBase = 'https://api.groq.com/openai/v1';
      if (!this.model) this.model = 'llama-3.3-70b-versatile';
    } else {
      // OpenAI default
      this.isGemini = false;
      if (!this.apiBase) this.apiBase = 'https://api.openai.com/v1';
      if (!this.model) this.model = 'gpt-4o-mini';
    }
  }

  /**
   * Generates a dynamic, conversational response from the configured LLM API.
   *
   * @param {Object} options
   * @param {string} options.message - The current user message
   * @param {Array} options.history - Prior conversation history [{ role: 'user'|'assistant', content: string }]
   * @param {Array} options.documentContext - Optional user documents/chunks to ground answers
   * @returns {Promise<string>} Generated response text
   */
  async generateResponse({ message, history = [], documentContext = [] }) {
    this.reloadConfig();

    if (!this.apiKey) {
      throw new Error('AI_CONFIG_MISSING: AI_API_KEY is not configured in backend environment');
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      throw new Error('INVALID_INPUT: Message cannot be empty');
    }

    // Build system message with optional document context
    let systemContent = HEALTH_SYSTEM_INSTRUCTION;
    if (documentContext && documentContext.length > 0) {
      systemContent += '\n\nAUTHORIZED USER HEALTH RECORDS CONTEXT:\n' +
        documentContext.map((d, i) => `[Document ${i + 1}: ${d.fileName || 'Report'}]\n${d.text || d.chunkText || d.extractedText || ''}`).join('\n\n');
    }

    // Sanitize conversation history (last 8 messages)
    const sanitizedHistory = (history || [])
      .slice(-8)
      .filter((h) => h && h.content && (h.role === 'user' || h.role === 'assistant'))
      .map((h) => ({
        role: h.role,
        content: String(h.content).substring(0, 1500),
      }));

    // If Gemini key, try native Google generateContent first (ultra-fast & reliable)
    if (this.isGemini) {
      try {
        return await this.callGeminiWithFallback(systemContent, sanitizedHistory, message.trim());
      } catch (err) {
        console.warn('Native Gemini call failed, trying OpenAI-compatible endpoint fallback:', err.message);
      }
    }

    // Fallback or OpenAI/Groq standard chat completions
    const messages = [
      { role: 'system', content: systemContent },
      ...sanitizedHistory,
      { role: 'user', content: message.trim() },
    ];

    return await this.callOpenAIChatCompletion(messages);
  }

  /**
   * Native Google Gemini generateContent with automatic model fallback
   */
  async callGeminiWithFallback(systemInstruction, history, userPrompt) {
    const candidateModels = [
      this.model || 'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-2.5-flash',
    ];

    // Build Gemini contents array
    const contents = [];
    for (const item of history) {
      contents.push({
        role: item.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: item.content }],
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: userPrompt }],
    });

    let lastError = null;

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents,
            generationConfig: {
              temperature: 0.35,
              maxOutputTokens: 1000,
            },
          }),
          signal: AbortSignal.timeout(12000), // 12s timeout per candidate
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply && reply.trim()) {
            return reply.trim();
          }
        } else {
          const errData = await res.text();
          console.warn(`Gemini model ${model} returned status ${res.status}: ${errData.slice(0, 100)}`);
          lastError = new Error(`Status ${res.status}: ${errData}`);
        }
      } catch (err) {
        console.warn(`Gemini model ${model} error: ${err.message}`);
        lastError = err;
      }
    }

    throw lastError || new Error('All Gemini candidate models failed to respond.');
  }

  /**
   * OpenAI-compatible chat completions API
   */
  async callOpenAIChatCompletion(messages) {
    let apiBase = this.apiBase;
    if (this.isGemini && (!apiBase || apiBase.includes('openai.com'))) {
      apiBase = 'https://generativelanguage.googleapis.com/v1beta/openai';
    } else if (!apiBase) {
      apiBase = 'https://api.openai.com/v1';
    }

    const fullUrl = apiBase.endsWith('/') ? `${apiBase}chat/completions` : `${apiBase}/chat/completions`;

    const res = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.35,
        max_tokens: 1000,
      }),
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`LLM API returned status ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content;
    if (!reply || typeof reply !== 'string') {
      throw new Error('MALFORMED_LLM_RESPONSE: Received empty response from LLM');
    }

    return reply.trim();
  }
}

module.exports = new LLMService();
