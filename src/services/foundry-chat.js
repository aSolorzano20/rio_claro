import { config, openaiClient } from '../config/index.js';

export async function callFoundry(message, conversationId) {
  if (!openaiClient || !config.agentName) {
    throw new Error('Foundry no está configurado.');
  }

  const conversation = conversationId
    ? { id: conversationId }
    : await openaiClient.conversations.create({});
  const agentRef = {
    body: {
      agent_reference: {
        name: config.agentName,
        type: 'agent_reference',
      },
    },
  };

  const response = await openaiClient.responses.create({
    conversation: conversation.id,
    input: message,
  }, agentRef);

  return {
    responseText: response.output_text || response.output?.[0]?.content?.[0]?.text || 'No pude generar una respuesta.',
    conversationId: conversation.id,
  };
}
