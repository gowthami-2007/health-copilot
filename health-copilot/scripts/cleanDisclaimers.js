const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const Message = require('../backend/src/models/Message');

async function cleanDisclaimers() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found in env');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const messages = await Message.find({ role: 'assistant' });
  console.log(`Found ${messages.length} assistant messages to inspect.`);

  let updatedCount = 0;
  for (const msg of messages) {
    const original = msg.content;
    const cleaned = original
      .replace(/\n+\s*(?:\*{3,}|-{3,}|_{3,})\s*[\s\S]*$/i, '')
      .replace(/\n+\s*(?:>|\*|_)*\s*(?:medical\s+)?disclaimer\s*:?[\s\S]*$/i, '')
      .replace(/\n+\s*(?:>|\*|_)*\s*(?:please\s+note|note)\s*:?\s*(?:this\s+information|ai-generated\s+information|this\s+is\s+for\s+educational)[\s\S]*$/i, '')
      .trim();

    if (cleaned !== original) {
      msg.content = cleaned;
      await msg.save();
      updatedCount++;
      console.log(`Updated message ID ${msg._id}`);
    }
  }

  console.log(`Completed. Cleaned ${updatedCount} messages.`);
  await mongoose.disconnect();
}

cleanDisclaimers().catch((err) => {
  console.error('Error cleaning messages:', err);
  process.exit(1);
});
