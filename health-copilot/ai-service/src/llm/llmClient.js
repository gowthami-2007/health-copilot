const http = require('http');
const https = require('https');

class LLMClient {
  constructor() {
    this.apiKey = process.env.AI_API_KEY || '';
    this.model = process.env.AI_MODEL || 'gpt-4o-mini';
    this.apiBase = process.env.AI_API_BASE || 'https://api.openai.com/v1';
  }

  /**
   * Sends a chat completion request to the OpenAI-compatible endpoint.
   */
  async chatCompletion({ messages, temperature = 0.3, maxTokens = 1200 }) {
    if (!this.apiKey) {
      // Return null to signal local fallback generation
      return null;
    }

    try {
      const url = new URL(`${this.apiBase}/chat/completions`);
      const body = JSON.stringify({
        model: this.model,
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
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Length': Buffer.byteLength(body),
            },
            timeout: 20000,
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
      console.warn(`External LLM API call error (${error.message}). Falling back to local heuristic engine.`);
      return null;
    }
  }
}

module.exports = new LLMClient();
