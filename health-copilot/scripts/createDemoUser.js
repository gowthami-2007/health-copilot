const { seedDemoData } = require('./seedDemoData');

seedDemoData()
  .then(() => {
    console.log('Demo user ready.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed to create demo user:', err);
    process.exit(1);
  });
