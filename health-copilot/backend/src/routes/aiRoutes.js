const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/chat', (req, res, next) => aiController.chat(req, res, next));
router.get('/conversations', (req, res, next) => aiController.getConversations(req, res, next));
router.get('/conversations/:conversationId/messages', (req, res, next) => aiController.getMessages(req, res, next));
router.delete('/conversations/:conversationId', (req, res, next) => aiController.deleteConversation(req, res, next));
router.post('/summarize/:documentId', (req, res, next) => aiController.summarizeDocument(req, res, next));

module.exports = router;
