const llmClient = require('./llmClient');
const { SYSTEM_HEALTH_PROMPT } = require('../prompts/systemPrompt');
const { checkHealthSafety, sanitizeResponse } = require('../safety/healthSafety');

class LLMService {
  async generateCompletion(prompt, options = {}) {
    const safety = checkHealthSafety(prompt);
    if (!safety.isSafe) {
      return {
        content: safety.safetyNotice,
        isSafe: false,
      };
    }

    const messages = [
      { role: 'system', content: SYSTEM_HEALTH_PROMPT },
      { role: 'user', content: prompt },
    ];

    const response = await llmClient.chatCompletion({
      messages,
      temperature: options.temperature || 0.3,
      maxTokens: options.maxTokens || 1000,
    });

    return {
      content: sanitizeResponse(response || ''),
      isSafe: true,
    };
  }
}

module.exports = new LLMService();
