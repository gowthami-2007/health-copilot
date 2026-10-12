const { test, describe } = require('node:test');
const assert = require('node:assert');
const llmService = require('../../backend/src/services/llm.service');

describe('LLM Service: Dynamic Conversation Title Generation', () => {
  test('Heuristic Fallback: Generates concise titles without conversational prefixes', () => {
    const title1 = llmService.heuristicFallbackTitle('What are some possible reasons for high cholesterol, and what should I ask my doctor?');
    assert.ok(title1.length <= 45);
    assert.ok(title1.includes('Cholesterol'));
    assert.strictEqual(title1.startsWith('What are'), false);

    const title2 = llmService.heuristicFallbackTitle('Can you explain what my hemoglobin result means?');
    assert.ok(title2.length <= 45);
    assert.ok(title2.includes('Hemoglobin'));
    assert.strictEqual(title2.startsWith('Can you explain'), false);

    const title3 = llmService.heuristicFallbackTitle('When is my next doctor appointment?');
    assert.ok(title3.includes('Doctor'));
  });

  test('Heuristic Fallback: Handles short greetings and empty inputs gracefully', () => {
    assert.strictEqual(llmService.heuristicFallbackTitle(''), 'Health Consultation');
    assert.strictEqual(llmService.heuristicFallbackTitle(null), 'Health Consultation');
    assert.strictEqual(llmService.heuristicFallbackTitle('   '), 'Health Consultation');
  });

  test('Clean Generated Title: Strips quotes, prefixes, newlines and limits length', () => {
    const rawWithQuotes = '"Understanding High Cholesterol"';
    assert.strictEqual(llmService.cleanGeneratedTitle(rawWithQuotes), 'Understanding High Cholesterol');

    const rawWithPrefix = 'Title: Medication Side Effects and Risks';
    assert.strictEqual(llmService.cleanGeneratedTitle(rawWithPrefix), 'Medication Side Effects and Risks');

    const excessivelyLong = 'A'.repeat(80);
    const cleanedLong = llmService.cleanGeneratedTitle(excessivelyLong);
    assert.ok(cleanedLong.length <= 55);
    assert.ok(cleanedLong.endsWith('...'));
  });

  test('Live LLM Title Generation: Generates 3-7 word meaningful title with medical context', async () => {
    const title = await llmService.generateConversationTitle(
      'What are some possible reasons for high cholesterol, and what should I ask my doctor?'
    );

    assert.ok(title);
    assert.strictEqual(typeof title, 'string');
    assert.ok(title.length >= 5 && title.length <= 55);
    // Should retain relevant medical terminology
    assert.ok(/cholesterol/i.test(title));
    // Should not retain raw question phrases
    assert.strictEqual(/^What are some/i.test(title), false);
    // Should not have surrounding quotation marks
    assert.strictEqual(title.startsWith('"') || title.startsWith("'"), false);
  });
});
