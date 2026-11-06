import { api } from '../core/api.js';

let conversationId = null;
let waiting = false;

function appendMessage(text, role) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = text;
  const chatWindow = document.getElementById('chat-window');
  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

export function initializeChat() {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('message-input');
  const button = document.getElementById('send-button');

  appendMessage('Hola, soy el Agente de Atención a Clientes de Río Claro. ¿En qué puedo ayudarte?', 'bot');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message || waiting) return;

    appendMessage(message, 'user');
    input.value = '';
    waiting = true;
    button.disabled = true;
    button.textContent = 'Escribiendo…';
    try {
      const result = await api('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message, conversation_id: conversationId }),
      });
      conversationId = result.conversation_id;
      appendMessage(result.reply, 'bot');
    } catch (error) {
      appendMessage(error.message, 'bot');
    } finally {
      waiting = false;
      button.disabled = false;
      button.textContent = 'Enviar';
      input.focus();
    }
  });

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
}
