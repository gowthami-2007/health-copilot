const mongoose = require('mongoose');
const config = require('./env');

let isConnected = false;

const connectDB = async (retries = 15, delayMs = 4000) => {
  if (isConnected) {
    return mongoose.connection;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(config.mongodbUri, {
        serverSelectionTimeoutMS: 6000,
        autoIndex: true,
      });
      isConnected = true;
      console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.warn(`⚠️ MongoDB connection attempt ${attempt}/${retries} failed: ${error.message}`);
      isConnected = false;
      if (attempt < retries) {
        console.log(`   Retrying connection in ${delayMs / 1000}s...`);
        await new Promise((res) => setTimeout(res, delayMs));
      } else {
        console.warn(`   Could not establish MongoDB connection after ${retries} attempts.`);
      }
    }
  }
};

const disconnectDB = async () => {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('MongoDB disconnected');
  }
};

const getDBStatus = () => {
  return {
    isConnected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host || 'unknown',
    name: mongoose.connection.name || 'health_copilot',
  };
};

module.exports = {
  connectDB,
  disconnectDB,
  getDBStatus,
};
