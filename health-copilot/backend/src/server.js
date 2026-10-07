const fs = require('fs');
const http = require('http');
const app = require('./app');
const config = require('./config/env');
const { connectDB } = require('./config/db');

// Ensure upload directory exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

const server = http.createServer(app);

const startServer = async () => {
  try {
    // Attempt DB connection
    await connectDB();

    server.listen(config.port, () => {
      console.log(`🚀 Health Copilot Backend running on http://localhost:${config.port}`);
      console.log(`📋 Environment: ${config.nodeEnv}`);
      console.log(`📁 Upload directory: ${config.uploadDir}`);
    });
  } catch (error) {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  }
};

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated.');
    process.exit(0);
  });
});

if (require.main === module) {
  startServer();
}

module.exports = { app, server, startServer };
