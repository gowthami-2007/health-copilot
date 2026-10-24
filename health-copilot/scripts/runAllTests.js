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

let failedCount = 0;
let passedCount = 0;

for (const file of testFiles) {
  process.stdout.write(`\n▶ Running: ${file} ... `);
  const start = Date.now();
  const result = spawnSync('node', ['--test', file], {
    cwd: path.resolve(__dirname, '..'),
    stdio: ['inherit', 'pipe', 'pipe'],
    env: process.env,
  });
  const duration = Date.now() - start;

  if (result.status === 0) {
    passedCount++;
    console.log(`✅ PASSED (${duration}ms)`);
  } else {
    failedCount++;
    console.log(`❌ FAILED (${duration}ms)`);
    if (result.stdout && result.stdout.length) {
      console.log(result.stdout.toString());
    }
    if (result.stderr && result.stderr.length) {
      console.error(result.stderr.toString());
    }
  }
}

console.log('\n================================================================');
console.log(`TEST RESULTS SUMMARY: ${passedCount} suites passed, ${failedCount} suites failed.`);
console.log('================================================================');

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('\n✨ ALL HEALTH COPILOT TEST SUITES PASSED CLEANLY!\n');
  process.exit(0);
}
