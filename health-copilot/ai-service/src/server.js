const app = require('./app');

const PORT = process.env.AI_SERVICE_PORT || 5001;

app.listen(PORT, () => {
  console.log(`🤖 AI Service running on http://localhost:${PORT}`);
});
