const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const HEALTH_SYSTEM_INSTRUCTION = `You are Health Copilot, an AI Personal Health Information Assistant.
Your purpose is to provide helpful, concise, evidence-based health information to users.

RESPONSE GUIDELINES:
1. CONCISE & DIRECT: Keep your answers clear, direct, and concise. Avoid lengthy essays, unsolicited medical descriptions, or verbose lecturing. Answer the user's specific inquiry directly and clearly.
2. NO DISCLAIMER IN RESPONSE: Do NOT include any disclaimer, warning note, or legal footer in your response. The application interface already displays standard medical disclaimers separately.
3. INFORMATIONAL GUIDANCE ONLY: You are an AI assistant, NOT a doctor or licensed healthcare provider. Never pretend to be a doctor or make definitive clinical diagnoses.
4. NO PRESCRIPTIONS: Never prescribe medications or suggest changing medication dosages.
5. URGENT & EMERGENCY AWARENESS: Immediately identify life-threatening emergencies (e.g. chest pain, shortness of breath, stroke symptoms). For these, directly advise calling emergency services (911/112/999) or visiting the nearest emergency room.
6. CONTEXT & CLARITY: Use conversation history to understand context. If details are ambiguous, ask a brief clarifying question.
7. FACTUAL RECORD ACCURACY: If authorized user medical records or laboratory values are provided, refer to them accurately. Never invent or fabricate test values.`;

function stripDisclaimer(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    // Remove markdown hr / asterisks separator followed by disclaimer
    .replace(/\n+\s*(?:\*{3,}|-{3,}|_{3,})\s*[\s\S]*$/i, '')
    // Remove any trailing Disclaimer / Medical Disclaimer paragraph
    .replace(/\n+\s*(?:>|\*|_)*\s*(?:medical\s+)?disclaimer\s*:?[\s\S]*$/i, '')
    // Remove "Please note / Note: This information is for educational purposes..."
    .replace(/\n+\s*(?:>|\*|_)*\s*(?:please\s+note|note)\s*:?\s*(?:this\s+information|ai-generated\s+information|this\s+is\s+for\s+educational)[\s\S]*$/i, '')
    .trim();
}

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
   * @param {Array} options.images - Optional attached images [{ mimeType: string, base64: string }]
   * @returns {Promise<string>} Generated response text
   */
  async generateResponse({ message, history = [], documentContext = [], images = [], preferredLanguage = 'en' }) {
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

    // Append strict Telugu language directive if user selected Telugu
    if (preferredLanguage === 'te') {
      systemContent += '\n\nCRITICAL LANGUAGE DIRECTIVE:\nThe user has selected Telugu (తెలుగు) as their default application language. You MUST respond completely in natural, fluent Telugu script (తెలుగు లిపి). Provide clear, compassionate, and informative explanations in Telugu. Keep all clinical drug names (e.g. Metformin, Lisinopril), lab test acronyms (e.g. HbA1c, TSH, CBC, BP), decimal numbers, and measurement units (e.g. mg, mg/dL, mmHg) in standard Latin/English notation so that medical accuracy and patient safety are strictly preserved.';
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
        const geminiRes = await this.callGeminiWithFallback(systemContent, sanitizedHistory, message.trim(), images);
        return stripDisclaimer(geminiRes);
      } catch (err) {
        console.warn('Native Gemini call failed, trying OpenAI-compatible endpoint fallback:', err.message);
      }
    }

    // Fallback or OpenAI/Groq standard chat completions (multimodal if images present)
    let userContent = message.trim();
    if (images && images.length > 0) {
      userContent = [
        { type: 'text', text: message.trim() },
        ...images.map((img) => ({
          type: 'image_url',
          image_url: {
            url: `data:${img.mimeType || 'image/jpeg'};base64,${img.base64}`,
          },
        })),
      ];
    }

    const messages = [
      { role: 'system', content: systemContent },
      ...sanitizedHistory,
      { role: 'user', content: userContent },
    ];

    const openAiRes = await this.callOpenAIChatCompletion(messages);
    return stripDisclaimer(openAiRes);
  }

  /**
   * Native Google Gemini generateContent with automatic model fallback
   */
  async callGeminiWithFallback(systemInstruction, history, userPrompt, images = []) {
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

    const userParts = [{ text: userPrompt }];
    if (images && images.length > 0) {
      for (const img of images) {
        if (img.base64) {
          userParts.push({
            inlineData: {
              mimeType: img.mimeType || 'image/jpeg',
              data: img.base64,
            },
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: userParts,
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

  /**
   * Generates a concise, meaningful title (3-7 words) for a chat conversation based on user messages.
   *
   * @param {string} userMessage - First user query or topic
   * @param {string} assistantReply - Optional assistant response for added context
   * @returns {Promise<string>} Cleaned 3-7 word title
   */
  async generateConversationTitle(userMessage, assistantReply = '', preferredLanguage = 'en') {
    this.reloadConfig();

    if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
      return this.heuristicFallbackTitle('', preferredLanguage);
    }

    let titleSystemInstruction = `You are a concise medical conversation title generator.
Read the user's healthcare question and generate a short, meaningful, title of 3 to 7 words that summarizes the main health topic.

STRICT RULES:
1. Length: Exactly 3 to 7 words.
2. Format: Return ONLY the title in Title Case or sentence case. Do NOT use quotation marks, punctuation at the end, markdown, bullets, prefixes, or explanations.
3. Natural Language: Keep essential clinical/medical terms (e.g. "Cholesterol", "Hemoglobin", "Lisinopril", "Blood Pressure", "CBC Report", "Sleep Quality").
4. Remove conversational filler phrases such as "Can you explain", "I want to know", "What are the", "Please tell me", "Hello", "I have uploaded".
5. NEVER return generic titles like "New Chat", "Health Question", "AI Consultation", or "Question" if medical context exists.`;

    if (preferredLanguage === 'te') {
      titleSystemInstruction = `You are a concise medical conversation title generator.
Read the user's healthcare question and generate a short, meaningful title of 2 to 5 words in Telugu (తెలుగు లిపి) that summarizes the topic.

STRICT RULES:
1. Return ONLY the title in Telugu (తెలుగు).
2. Do NOT use quotes, bullets, prefixes, or punctuation at the end.
3. Keep clinical concepts (e.g. "రక్తపోటు", "షుగర్ స్థాయిలు", "రక్త పరీక్ష ఫలితాలు", "మందుల సమీక్ష") natural.`;
    }

    const promptText = `User Message: "${userMessage.trim()}"` +
      (assistantReply ? `\nAssistant Context: "${assistantReply.trim().substring(0, 300)}"` : '') +
      `\n\nGenerate the concise title now:`;

    if (!this.apiKey) {
      return this.heuristicFallbackTitle(userMessage, preferredLanguage);
    }

    try {
      let rawTitle = '';
      if (this.isGemini) {
        try {
          rawTitle = await this.callGeminiWithFallback(titleSystemInstruction, [], promptText);
        } catch (geminiErr) {
          console.warn('Native Gemini title call failed, falling back to chat completion:', geminiErr.message);
        }
      }

      if (!rawTitle) {
        const messages = [
          { role: 'system', content: titleSystemInstruction },
          { role: 'user', content: promptText },
        ];
        rawTitle = await this.callOpenAIChatCompletion(messages);
      }

      return this.cleanGeneratedTitle(rawTitle, userMessage, preferredLanguage);
    } catch (err) {
      console.warn('LLM title generation failed, using intelligent heuristic fallback:', err.message);
      return this.heuristicFallbackTitle(userMessage, preferredLanguage);
    }
  }

  /**
   * Sanitizes and bounds the generated title.
   */
  cleanGeneratedTitle(title, fallbackText = '', preferredLanguage = 'en') {
    if (!title || typeof title !== 'string') {
      return this.heuristicFallbackTitle(fallbackText, preferredLanguage);
    }

    let cleaned = title
      .replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, '') // Strip surrounding quotes
      .replace(/^(Title|Topic|Chat Title|Subject|శీర్షిక):\s*/i, '') // Strip prefixes
      .replace(/[.\n\r]+/g, ' ') // Remove newlines and trailing periods
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned || cleaned.length < 3) {
      return this.heuristicFallbackTitle(fallbackText, preferredLanguage);
    }

    // Ensure within reasonable character bounds
    if (cleaned.length > 55) {
      cleaned = cleaned.substring(0, 52).trim() + '...';
    }

    return cleaned;
  }

  /**
   * Intelligent heuristic title fallback for offline or zero-LLM environments
   */
  heuristicFallbackTitle(rawText, preferredLanguage = 'en') {
    if (preferredLanguage === 'te') {
      return 'ఆరోగ్య సంప్రదింపు';
    }

    if (!rawText || typeof rawText !== 'string') return 'Health Consultation';

    // Remove common prefixes
    let text = rawText.trim()
      .replace(/^(can you|could you|please|i want to know|tell me|what are|what is|how do i|how to|i have|explain my|explain|why is my|why do i)\s+(about|the|some|a|an)?\s*/i, '')
      .replace(/[?!.]+$/, '')
      .trim();

    if (!text) return 'Health Consultation';

    // Capitalize first letter of words
    const words = text.split(/\s+/).slice(0, 6);
    if (words.length === 0) return 'Health Consultation';

    const title = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return title.length > 45 ? `${title.substring(0, 42)}...` : title;
  }
}

module.exports = new LLMService();
