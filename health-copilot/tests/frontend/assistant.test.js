const { test, describe } = require('node:test');
const assert = require('node:assert');

describe('Frontend Unit: AI Assistant Presentation & Citations Logic', () => {
  test('Formats sources excerpt with truncation', () => {
    const formatExcerpt = (text, max = 50) => {
      if (!text) return '';
      if (text.length <= max) return text;
      return text.substring(0, max) + '...';
    };

    const longSnippet = 'Complete blood count analysis revealed normal hemoglobin.';
    assert.strictEqual(
      formatExcerpt(longSnippet, 30),
      'Complete blood count analysis ...'
    );
  });

  test('Validates user prompt before submission', () => {
    const isValidPrompt = (prompt) => {
      return Boolean(prompt && typeof prompt === 'string' && prompt.trim().length > 0);
    };

    assert.strictEqual(isValidPrompt(''), false);
    assert.strictEqual(isValidPrompt('   '), false);
    assert.strictEqual(isValidPrompt('What is my blood sugar?'), true);
  });
});
