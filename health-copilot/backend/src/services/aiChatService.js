const fs = require('fs');
const path = require('path');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Document = require('../models/Document');
const User = require('../models/User');
const Medication = require('../models/Medication');
const Appointment = require('../models/Appointment');
const PatientProfile = require('../models/PatientProfile');
const llmService = require('./llm.service');
const documentService = require('./documentService');
const { processDocumentFile } = require('../../../document-service/src/processing/documentProcessor');
const { NotFoundError, BadRequestError } = require('../utils/errors');

class AIChatService {
  /**
   * Retrieves or initializes a conversation for a specific patient.
   */
  async getOrCreateConversation(userId, conversationId = null, title = null) {
    if (conversationId) {
      const conv = await Conversation.findOne({ _id: conversationId, userId });
      if (!conv) {
        throw new NotFoundError('Conversation not found');
      }
      return conv;
    }

    const defaultTitle = title && title.trim() ? title.trim() : 'New Consultation';
    return await Conversation.create({
      userId,
      title: defaultTitle.length > 50 ? `${defaultTitle.substring(0, 47)}...` : defaultTitle,
      isCustomTitle: false,
    });
  }

  /**
   * Lists all chat conversations belonging to the user.
   */
  async getUserConversations(userId) {
    const list = await Conversation.find({ userId }).sort({ updatedAt: -1 });

    // Clean legacy long titles if they contain raw user questions
    return list.map((c) => {
      let title = c.title;
      // If title is long or looks like an unformatted legacy raw query, sanitize presentation
      if (title && !c.isCustomTitle && title.length > 35) {
        title = llmService.heuristicFallbackTitle(title);
      }
      return {
        _id: c._id,
        userId: c.userId,
        title: title || 'Health Consultation',
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });
  }

  /**
   * Retrieves chronological messages for a conversation, strictly verifying user ownership.
   */
  async getConversationMessages(conversationId, userId) {
    const conv = await Conversation.findOne({ _id: conversationId, userId });
    if (!conv) {
      throw new NotFoundError('Conversation not found or access denied');
    }

    return await Message.find({ conversationId }).sort({ createdAt: 1 });
  }

  /**
   * Sends a user query to the real LLM pipeline with multi-turn history & user document context.
   */
  async sendMessage({ userId, conversationId, question, message, history = [], attachments = [], preferredLanguage = null, patientProfileId = null }) {
    const rawQuery = (message || question || '').trim();

    if (!rawQuery && (!Array.isArray(attachments) || attachments.length === 0)) {
      throw new BadRequestError('Message or attachment is required');
    }

    if (rawQuery.length > 2500) {
      throw new BadRequestError('Message exceeds maximum allowed length of 2500 characters');
    }

    // Determine active language
    let effectiveLang = preferredLanguage;
    if (!effectiveLang && userId) {
      const userDoc = await User.findById(userId).select('preferredLanguage');
      effectiveLang = userDoc?.preferredLanguage || 'en';
    }
    effectiveLang = effectiveLang || 'en';

    // 1. Get or create conversation record
    let conversation = null;
    if (userId) {
      const defaultTitle = effectiveLang === 'te' ? 'కొత్త సంప్రదింపు' : 'New Consultation';
      conversation = await this.getOrCreateConversation(userId, conversationId, defaultTitle);
      if (patientProfileId && !conversation.patientProfileId) {
        conversation.patientProfileId = patientProfileId;
        await conversation.save().catch(() => {});
      }
    }

    // 2. Build multi-turn conversation context
    let formattedHistory = [];
    if (Array.isArray(history) && history.length > 0) {
      formattedHistory = history
        .slice(-8)
        .filter((h) => h && h.content && (h.role === 'user' || h.role === 'assistant'))
        .map((h) => ({ role: h.role, content: String(h.content).trim() }));
    } else if (conversation) {
      const dbHistory = await Message.find({ conversationId: conversation._id })
        .sort({ createdAt: -1 })
        .limit(8);
      formattedHistory = dbHistory.reverse().map((m) => ({
        role: m.role,
        content: m.content,
      }));
    }

    // 3. Process direct attachments (uploaded documents or captured images)
    let processedAttachments = [];
    let attachmentImages = [];
    let attachmentDocumentContext = [];

    if (Array.isArray(attachments) && attachments.length > 0) {
      for (const att of attachments) {
        if (!att) continue;
        let docRecord = null;
        if (att.documentId && userId) {
          docRecord = await Document.findOne({ _id: att.documentId, userId });
        }

        const fileName = att.fileName || docRecord?.fileName || 'Attachment';
        const fileType = att.fileType || docRecord?.fileType || 'application/octet-stream';
        const fileSize = att.fileSize || docRecord?.fileSize || 0;
        const fileUrl = att.fileUrl || docRecord?.fileUrl || '';
        const attachmentType = att.attachmentType || (fileType.startsWith('image/') ? 'image' : 'document');

        processedAttachments.push({
          documentId: docRecord?._id || att.documentId || null,
          fileName,
          fileType,
          fileSize,
          fileUrl,
          attachmentType,
          uploadedAt: new Date(),
        });

        // If it's an image, read base64 for LLM vision if available
        if (attachmentType === 'image' && docRecord) {
          try {
            const filePath = documentService.resolvePhysicalPath(docRecord);
            if (filePath && fs.existsSync(filePath)) {
              const fileBuf = fs.readFileSync(filePath);
              attachmentImages.push({
                mimeType: fileType,
                base64: fileBuf.toString('base64'),
              });
            }
          } catch (imgReadErr) {
            console.warn('Could not read image for vision input:', imgReadErr.message);
          }
        }

        // If it's a document (or image with extracted text), add its extracted text to context
        if (docRecord) {
          let extractedText = docRecord.extractedText || '';
          if (!extractedText) {
            try {
              const filePath = documentService.resolvePhysicalPath(docRecord);
              if (filePath && fs.existsSync(filePath)) {
                const extraction = await processDocumentFile(filePath, docRecord.fileType, docRecord.fileSize);
                if (extraction.success && extraction.extractedText) {
                  extractedText = extraction.extractedText;
                  docRecord.extractedText = extractedText;
                  docRecord.status = 'PROCESSED';
                  await docRecord.save();
                }
              }
            } catch (procErr) {
              console.warn('Error extracting text for chat attachment:', procErr.message);
            }
          }

          if (extractedText) {
            attachmentDocumentContext.push({
              documentId: docRecord._id,
              fileName,
              documentType: docRecord.documentType || 'Uploaded Document',
              text: extractedText.substring(0, 3000),
            });
          }
        }
      }
    }

    // 4. Fetch user's background processed medical documents & structured facts
    let documentContext = [...attachmentDocumentContext];
    let patientContext = null;
    let richSources = [];

    if (userId) {
      // Resolve patient profile if specified
      let profileDoc = null;
      const targetProfileId = patientProfileId || conversation?.patientProfileId || null;
      if (targetProfileId) {
        profileDoc = await PatientProfile.findOne({ _id: targetProfileId, userId });
      }
      if (!profileDoc) {
        profileDoc = await PatientProfile.findOne({ userId, isPrimary: true });
      }

      const docQuery = { userId, status: 'PROCESSED' };
      if (targetProfileId) docQuery.patientProfileId = targetProfileId;

      const userDocs = await Document.find(docQuery)
        .sort({ createdAt: -1 })
        .limit(10)
        .select('fileName documentType extractedText structuredData createdAt');

      for (const doc of userDocs) {
        if (!documentContext.some((d) => d.fileName === doc.fileName)) {
          documentContext.push({
            documentId: doc._id,
            fileName: doc.fileName,
            documentType: doc.documentType,
            text: (doc.extractedText || '').substring(0, 1500),
          });
        }
      }

      // Collect structured laboratory facts
      const structuredLabFacts = [];
      for (const doc of userDocs) {
        const docDate = (doc.structuredData?.documentDate || doc.createdAt).toISOString().split('T')[0];
        const labResults = doc.structuredData?.labResults || [];
        for (const lab of labResults) {
          structuredLabFacts.push({
            documentId: doc._id,
            fileName: doc.fileName,
            date: docDate,
            testName: lab.testName,
            result: lab.result,
            numericValue: lab.numericValue,
            unit: lab.unit,
            referenceRange: lab.referenceRange,
            abnormalFlag: lab.abnormalFlag,
          });
        }
      }

      // Sort chronological ascending
      structuredLabFacts.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Active medications
      const medQuery = { userId, status: 'ACTIVE' };
      if (targetProfileId) medQuery.patientProfileId = targetProfileId;
      const activeMeds = await Medication.find(medQuery).sort({ createdAt: -1 });
      const structuredMedFacts = activeMeds.map((m) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        instructions: m.instructions,
        prescribedBy: m.prescribedBy,
      }));

      // Upcoming appointments & overdue follow-ups
      const aptQuery = { userId, status: 'UPCOMING' };
      if (targetProfileId) aptQuery.patientProfileId = targetProfileId;
      const upcomingApts = await Appointment.find(aptQuery).sort({ date: 1 }).limit(5);
      const structuredAptFacts = upcomingApts.map((a) => ({
        doctorName: a.doctorName,
        specialty: a.specialty,
        date: a.date ? a.date.toISOString().split('T')[0] : '',
        time: a.time,
        reason: a.reason,
        isOverdue: a.isOverdueFollowup || (a.date && new Date(a.date) < new Date()),
      }));

      patientContext = {
        profile: profileDoc ? {
          name: profileDoc.name,
          age: profileDoc.dateOfBirth ? Math.floor((new Date() - new Date(profileDoc.dateOfBirth)) / (365.25 * 24 * 3600 * 1000)) : null,
          gender: profileDoc.gender,
          relationship: profileDoc.relationship,
          chronicConditions: profileDoc.chronicConditions,
          allergies: profileDoc.allergies,
        } : null,
        structuredLabFacts,
        structuredMedFacts,
        structuredAptFacts,
      };

      // Populate rich sources with verified document records
      richSources = documentContext.map((d) => {
        // Find matching lab test in this document if any
        const matchingLab = structuredLabFacts.find((l) => String(l.documentId) === String(d.documentId));
        return {
          documentId: d.documentId || null,
          fileName: d.fileName,
          reportDate: matchingLab?.date || null,
          testName: matchingLab?.testName || null,
          result: matchingLab?.result || null,
          unit: matchingLab?.unit || null,
          referenceRange: matchingLab?.referenceRange || null,
          abnormalFlag: matchingLab?.abnormalFlag || null,
        };
      });
    } else {
      richSources = documentContext.map((d) => ({ documentId: d.documentId || null, fileName: d.fileName }));
    }

    const effectiveQuery = rawQuery || (processedAttachments.length > 0 ? `Please analyze the attached ${processedAttachments.map(a => a.fileName).join(', ')}.` : 'Hello');

    // 5. Record user message in DB if user is authenticated
    let userMsg = null;
    if (conversation) {
      userMsg = await Message.create({
        conversationId: conversation._id,
        role: 'user',
        content: effectiveQuery,
        attachments: processedAttachments,
      });
    }

    // 6. Invoke Real LLM Service with structured patient records
    let generatedAnswer = '';
    try {
      generatedAnswer = await llmService.generateResponse({
        message: effectiveQuery,
        history: formattedHistory,
        documentContext,
        patientContext,
        images: attachmentImages,
        preferredLanguage: effectiveLang,
      });
    } catch (llmError) {
      console.error('LLM generation error in AIChatService:', llmError.message);
      if (userMsg && userMsg._id) {
        await Message.findByIdAndDelete(userMsg._id).catch(() => {});
      }
      if (llmError.message.includes('AI_CONFIG_MISSING')) {
        throw new Error('The AI service is not configured. Please set AI_API_KEY in the backend environment.');
      }
      throw new Error(effectiveLang === 'te' ? 'AI సేవ తాత్కాలికంగా అందుబాటులో లేదు. దయచేసి మళ్ళీ ప్రయత్నించండి.' : 'The AI service is temporarily unavailable. Please try again.');
    }

    // 7. Record assistant message in DB with rich source citations
    let assistantMsg = null;
    if (conversation) {
      assistantMsg = await Message.create({
        conversationId: conversation._id,
        role: 'assistant',
        content: generatedAnswer,
        sources: richSources,
      });

      // 8. Dynamic Title Generation
      if (!conversation.isCustomTitle) {
        try {
          const generatedTitle = await llmService.generateConversationTitle(effectiveQuery, generatedAnswer, effectiveLang);
          if (generatedTitle && generatedTitle.trim()) {
            conversation.title = generatedTitle.trim();
            conversation.isCustomTitle = true;
          }
        } catch (titleErr) {
          console.warn('Non-blocking title generation error:', titleErr.message);
          if (!conversation.title || conversation.title === 'New Consultation' || conversation.title === 'Health Consultation' || conversation.title === 'కొత్త సంప్రదింపు' || conversation.title === 'ఆరోగ్య సంప్రదింపు') {
            conversation.title = llmService.heuristicFallbackTitle(effectiveQuery, effectiveLang);
            conversation.isCustomTitle = true;
          }
        }
      }

      conversation.updatedAt = new Date();
      await conversation.save();
    }

    return {
      conversationId: conversation?._id || null,
      conversationTitle: conversation?.title || 'Health Consultation',
      message: generatedAnswer,
      userMessage: userMsg || { role: 'user', content: effectiveQuery, attachments: processedAttachments },
      assistantMessage: assistantMsg || { role: 'assistant', content: generatedAnswer },
      sources: richSources,
    };
  }

  /**
   * Renames a conversation title.
   */
  async renameConversation(conversationId, userId, newTitle) {
    const conv = await Conversation.findOne({ _id: conversationId, userId });
    if (!conv) {
      throw new NotFoundError('Conversation not found or access denied');
    }

    conv.title = (newTitle || '').trim() || 'Health Consultation';
    conv.isCustomTitle = true;
    conv.updatedAt = new Date();
    await conv.save();

    return conv;
  }

  /**
   * Deletes a conversation and all its messages.
   */
  async deleteConversation(conversationId, userId) {
    const conv = await Conversation.findOne({ _id: conversationId, userId });
    if (!conv) {
      throw new NotFoundError('Conversation not found or access denied');
    }

    await Message.deleteMany({ conversationId: conv._id });
    await Conversation.findByIdAndDelete(conv._id);

    return { message: 'Conversation deleted successfully' };
  }
}

module.exports = new AIChatService();
