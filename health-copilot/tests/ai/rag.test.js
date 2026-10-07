const { test, describe } = require('node:test');
const assert = require('node:assert');
const vectorSearch = require('../../ai-service/src/rag/vectorSearch');
const chunkRetriever = require('../../ai-service/src/rag/chunkRetriever');
const ragService = require('../../ai-service/src/rag/ragService');

describe('AI Service: RAG Vector Search & Retrieval Tests', () => {
  const sampleChunks = [
    {
      documentId: 'doc1',
      fileName: 'Blood_Report.pdf',
      chunkText: 'Complete Blood Count: Hemoglobin 14.5 g/dL, Platelets 220,000 /uL, Fasting Blood Glucose 95 mg/dL.',
    },
    {
      documentId: 'doc2',
      fileName: 'Lipid_Panel.pdf',
      chunkText: 'Lipid Profile: Total Cholesterol 210 mg/dL, HDL 48 mg/dL, LDL 135 mg/dL, Triglycerides 150 mg/dL.',
    },
    {
      documentId: 'doc3',
      fileName: 'Orthopedic_Note.pdf',
      chunkText: 'Follow up examination of left knee sprain. Advised physical therapy twice weekly.',
    },
  ];

  test('Vector Search: ranks highest relevant chunk for cholesterol query', () => {
    const results = vectorSearch.search('What was my cholesterol level?', sampleChunks, 2);

    assert.ok(results.length > 0, 'Should find matching chunks');
    assert.strictEqual(results[0].documentId, 'doc2');
    assert.strictEqual(results[0].fileName, 'Lipid_Panel.pdf');
  });

  test('Vector Search: ranks hemoglobin query correctly', () => {
    const results = vectorSearch.search('hemoglobin count', sampleChunks, 2);

    assert.ok(results.length > 0);
    assert.strictEqual(results[0].documentId, 'doc1');
  });

  test('RAG Service: provides contextual answer with citations and disclaimer', async () => {
    const response = await ragService.answerQuestion({
      question: 'What was my cholesterol?',
      userDocuments: [
        {
          _id: 'doc2',
          fileName: 'Lipid_Panel.pdf',
          chunks: [{ chunkText: 'Total Cholesterol 210 mg/dL, HDL 48 mg/dL' }],
        },
      ],
    });

    assert.ok(response.answer);
    assert.ok(response.answer.includes('Disclaimer:'));
    assert.strictEqual(response.sources.length, 1);
    assert.strictEqual(response.sources[0].fileName, 'Lipid_Panel.pdf');
  });
});
