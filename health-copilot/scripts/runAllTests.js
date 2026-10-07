const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('================================================================');
console.log('🧪 RUNNING COMPREHENSIVE HEALTH COPILOT TEST SUITE');
console.log('================================================================\n');

const testDirs = [
  'tests/backend',
  'tests/ai',
  'tests/documents',
  'tests/integration',
  'tests/frontend',
];

const testFiles = [];
for (const dir of testDirs) {
  const fullDir = path.resolve(__dirname, '..', dir);
  if (fs.existsSync(fullDir)) {
    const files = fs.readdirSync(fullDir).filter((f) => f.endsWith('.test.js'));
    for (const f of files) {
      testFiles.push(path.join(dir, f));
    }
  }
}

console.log(`Discovered ${testFiles.length} test files:\n`);
testFiles.forEach((f) => console.log(`  • ${f}`));
console.log('\n----------------------------------------------------------------');

const result = spawnSync('node', ['--test', ...testFiles], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  env: process.env,
});

if (result.status !== 0) {
  console.error('\n❌ Some test suites failed.');
  process.exit(result.status || 1);
} else {
  console.log('\n✨ ALL HEALTH COPILOT TEST SUITES PASSED CLEANLY!');
  process.exit(0);
}
