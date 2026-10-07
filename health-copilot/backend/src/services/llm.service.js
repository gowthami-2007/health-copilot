const https = require('https');
const http = require('http');
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
      if (!this.apiBase || this.apiBase.includes('openai.com')) {
        this.apiBase = 'https://generativelanguage.googleapis.com/v1beta/openai';
      }
      if (!this.model || this.model.startsWith('gpt-')) {
        this.model = 'gemini-flash-lite-latest';
      }
    } else if (this.apiKey.startsWith('gsk_')) {
      // Groq
      if (!this.apiBase) this.apiBase = 'https://api.groq.com/openai/v1';
      if (!this.model) this.model = 'llama-3.3-70b-versatile';
    } else {
      // OpenAI default
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

    // Format conversation history (limit to last 10 messages for performance and context limits)
    const sanitizedHistory = (history || [])
      .slice(-10)
      .filter((h) => h && h.content && (h.role === 'user' || h.role === 'assistant'))
      .map((h) => ({
        role: h.role,
        content: String(h.content).substring(0, 2000),
      }));

    const messages = [
      { role: 'system', content: systemContent },
      ...sanitizedHistory,
      { role: 'user', content: message.trim() },
    ];

    // Call LLM API (OpenAI-compatible chat completion)
    const completion = await this.callChatCompletion(messages);
    return completion;
  }

  /**
   * Low-level HTTP request to LLM completion endpoint
   */
  async callChatCompletion(messages) {
    const fullUrl = this.apiBase.endsWith('/') ? `${this.apiBase}chat/completions` : `${this.apiBase}/chat/completions`;
    const url = new URL(fullUrl);

    const payload = JSON.stringify({
      model: this.model,
      messages,
      temperature: 0.35,
      max_tokens: 1200,
    });

    const client = url.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      const req = client.request(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Length': Buffer.byteLength(payload),
          },
          timeout: 30000, // 30s timeout
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const parsed = JSON.parse(data);
                const reply = parsed.choices?.[0]?.message?.content;
                if (!reply || typeof reply !== 'string') {
                  return reject(new Error('MALFORMED_LLM_RESPONSE: Received empty response content from LLM'));
                }
                resolve(reply.trim());
              } catch (err) {
                reject(new Error(`PARSE_ERROR: Failed to parse LLM JSON: ${err.message}`));
              }
            } else {
              let errorMsg = `LLM API Error (Status ${res.statusCode})`;
              try {
                const parsedError = JSON.parse(data);
                errorMsg = parsedError.error?.message || errorMsg;
              } catch (_) {}
              reject(new Error(errorMsg));
            }
          });
        }
      );

      req.on('error', (err) => reject(new Error(`NETWORK_ERROR: ${err.message}`)));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('TIMEOUT: The LLM API request timed out after 30 seconds'));
      });

      req.write(payload);
      req.end();
    });
  }
}

module.exports = new LLMService();
