const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json({ limit: '15mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'health-copilot-ai-service' });
});

app.use('/api/ai', require('./routes/aiRoutes'));

module.exports = app;
