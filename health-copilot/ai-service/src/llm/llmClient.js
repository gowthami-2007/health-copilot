const http = require('http');
const https = require('https');
const path = require('path');
const dotenv = require('dotenv');

class LLMClient {
  constructor() {
    this.loadEnv();
  }

  loadEnv() {
    dotenv.config({ path: path.resolve(__dirname, '../../../backend/.env') });
    dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
  }

  /**
   * Resolves configuration dynamically to pick up changes in .env.
   * Auto-detects Google Gemini, OpenAI, or Groq API keys based on prefix.
   */
  getConfig() {
    this.loadEnv();

    const apiKey = (process.env.AI_API_KEY || '').trim();
    let apiBase = (process.env.AI_API_BASE || '').trim();
    let model = (process.env.AI_MODEL || '').trim();

    // 1. Google Gemini (Google AI Studio keys start with AIzaSy)
    if (apiKey.startsWith('AIzaSy')) {
      if (!apiBase || apiBase.includes('openai.com')) {
        apiBase = 'https://generativelanguage.googleapis.com/v1beta/openai';
      }
      if (!model || model.startsWith('gpt-')) {
        model = 'gemini-2.0-flash';
      }
    }
    // 2. Groq (Groq keys start with gsk_)
    else if (apiKey.startsWith('gsk_')) {
      if (!apiBase || apiBase.includes('openai.com')) {
        apiBase = 'https://api.groq.com/openai/v1';
      }
      if (!model || model.startsWith('gpt-')) {
        model = 'llama-3.3-70b-versatile';
      }
    }
    // 3. Default OpenAI
    else {
      if (!apiBase) {
        apiBase = 'https://api.openai.com/v1';
      }
      if (!model) {
        model = 'gpt-4o-mini';
      }
    }

    return { apiKey, apiBase, model };
  }

  /**
   * Sends a chat completion request to the OpenAI-compatible endpoint.
   */
  async chatCompletion({ messages, temperature = 0.3, maxTokens = 1200 }) {
    const { apiKey, apiBase, model } = this.getConfig();

    if (!apiKey) {
      // Signal local fallback generation
      return null;
    }

    try {
      const fullUrl = apiBase.endsWith('/') ? `${apiBase}chat/completions` : `${apiBase}/chat/completions`;
      const url = new URL(fullUrl);

      const body = JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      });

      const client = url.protocol === 'https:' ? https : http;

      return await new Promise((resolve, reject) => {
        const req = client.request(
          url,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
              'Content-Length': Buffer.byteLength(body),
            },
            timeout: 25000,
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  const json = JSON.parse(data);
                  const content = json.choices?.[0]?.message?.content;
                  resolve(content);
                } catch (e) {
                  reject(new Error(`Failed to parse LLM response: ${e.message}`));
                }
              } else {
                reject(new Error(`LLM API returned status ${res.statusCode}: ${data}`));
              }
            });
          }
        );

        req.on('error', (err) => reject(err));
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('LLM API request timed out'));
        });

        req.write(body);
        req.end();
      });
    } catch (error) {
      console.warn(`External LLM API call error (${error.message}). Falling back to local semantic engine.`);
      return null;
    }
  }
}

module.exports = new LLMClient();
