const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend or root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 5001,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/health_copilot',
  jwtSecret: process.env.JWT_SECRET || 'health_copilot_fallback_jwt_secret_token_12345',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'https://health-copilot-pearl.vercel.app',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024, // 10MB default
  uploadDir: path.resolve(__dirname, '../../uploads'),
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:5001',
  aiApiKey: process.env.AI_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'gpt-4o-mini',
  aiApiBase: process.env.AI_API_BASE || 'https://api.openai.com/v1',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  email: {
    providerApiKey: process.env.EMAIL_PROVIDER_API_KEY || process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || 'HealthCopilot <notifications@healthcopilot.app>',
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: parseInt(process.env.SMTP_PORT, 10) || 587,
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
  },
};

module.exports = config;
