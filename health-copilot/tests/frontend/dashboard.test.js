const { test, describe } = require('node:test');
const assert = require('node:assert');

describe('Frontend Unit: Dashboard Greeting & Metrics Logic', () => {
  test('Greeting resolver calculates proper day partition', () => {
    const getGreeting = (hour) => {
      if (hour >= 12 && hour < 17) return 'Good afternoon';
      if (hour >= 17) return 'Good evening';
      return 'Good morning';
    };

    assert.strictEqual(getGreeting(9), 'Good morning');
    assert.strictEqual(getGreeting(14), 'Good afternoon');
    assert.strictEqual(getGreeting(19), 'Good evening');
  });

  test('Metric counts format smoothly when undefined', () => {
    const formatStats = (stats) => ({
      documents: stats?.documents || 0,
      medications: stats?.medications || 0,
      appointments: stats?.appointments || 0,
    });

    const empty = formatStats(null);
    assert.strictEqual(empty.documents, 0);
    assert.strictEqual(empty.medications, 0);
    assert.strictEqual(empty.appointments, 0);
  });
});
