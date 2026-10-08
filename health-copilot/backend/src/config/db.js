const mongoose = require('mongoose');
const config = require('./env');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 10000,
      autoIndex: true,
    });
    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn(`⚠️ Warning: MongoDB connection failed (${error.message}).`);
    console.warn(`   Running in disconnected or fallback mode. Ensure MongoDB is running at ${config.mongodbUri}`);
    isConnected = false;
    // Don't crash process in dev mode so the app can still serve static endpoints or test fallbacks
    if (config.nodeEnv === 'production') {
      throw error;
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
