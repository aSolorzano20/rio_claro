import express from 'express';
import { usageStats } from '../data/demo-store.js';
import { callFoundry } from '../services/foundry-chat.js';

const router = express.Router();
const maxMessageLength = 2000;

router.post('/chat', async (req, res) => {
  const { message, conversation_id: conversationId } = req.body || {};
  if (typeof message !== 'string' || message.trim().length < 1
      || message.trim().length > maxMessageLength
      || (conversationId !== undefined && (typeof conversationId !== 'string' || conversationId.length > 200))) {
    return res.status(422).json({ error: 'El mensaje debe tener entre 1 y 2000 caracteres.' });
  }

  try {
    const result = await callFoundry(message, conversationId);
    usageStats.chatMessageCount += 1;
    return res.json({ reply: result.responseText, conversation_id: result.conversationId });
  } catch (error) {
    console.error('Foundry request failed:', error);
    return res.status(502).json({ error: 'No se pudo procesar la solicitud en este momento.' });
  }
});

export default router;
