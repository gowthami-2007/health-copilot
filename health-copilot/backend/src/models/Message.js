const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    sources: [
      {
        documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
        fileName: String,
        excerpt: String,
      },
    ],
    attachments: [
      {
        documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
        fileName: { type: String, required: true },
        fileType: { type: String, default: 'application/octet-stream' },
        fileSize: { type: Number, default: 0 },
        fileUrl: { type: String, default: '' },
        attachmentType: { type: String, enum: ['image', 'document'], default: 'document' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
