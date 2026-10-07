const { test, describe } = require('node:test');
const assert = require('node:assert');

describe('Frontend Unit: Document Filtering & File Formatting Logic', () => {
  const mockDocs = [
    { _id: '1', fileName: 'CBC_Report.pdf', documentType: 'Blood Report', fileSize: 1048576 },
    { _id: '2', fileName: 'Knee_XRay.png', documentType: 'Imaging Report', fileSize: 2097152 },
    { _id: '3', fileName: 'Doctor_Note.pdf', documentType: 'Doctor Note', fileSize: 51200 },
  ];

  test('Filters documents by category', () => {
    const filter = (docs, category) => {
      if (category === 'All') return docs;
      return docs.filter((d) => d.documentType === category);
    };

    assert.strictEqual(filter(mockDocs, 'All').length, 3);
    assert.strictEqual(filter(mockDocs, 'Blood Report').length, 1);
    assert.strictEqual(filter(mockDocs, 'Prescription').length, 0);
  });

  test('Calculates readable file size in KB or MB', () => {
    const formatSize = (bytes) => {
      if (!bytes) return '0 B';
      const mb = bytes / (1024 * 1024);
      if (mb >= 1) return `${mb.toFixed(1)} MB`;
      return `${Math.round(bytes / 1024)} KB`;
    };

    assert.strictEqual(formatSize(1048576), '1.0 MB');
    assert.strictEqual(formatSize(51200), '50 KB');
  });
});
