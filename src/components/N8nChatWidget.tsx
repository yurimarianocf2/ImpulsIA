'use client';

import { useEffect } from 'react';
import { createChat } from '@n8n/chat';
import '@n8n/chat/dist/chat.css';
import './n8n-chat-widget.css';

export function N8nChatWidget() {
  useEffect(() => {
    // Garante que o código só rode no lado do cliente
    if (typeof window === 'undefined') {
      return;
    }

    // Evita inicializar o chat múltiplas vezes
    const chatContainer = document.querySelector('#n8n-chat-container');
    if (chatContainer?.hasAttribute('data-chat-initialized')) {
      return;
    }

    createChat({
        webhookUrl: 'https://webhook.impulsia.xyz/webhook/cc34a74f-1b3f-4d2a-805e-98ac2d603eb2/chat',
        webhookConfig: { method: 'POST' },
        mode: 'window',
        showWelcomeScreen: true,
        defaultLanguage: 'en',
        initialMessages: [
          'Olá! 👋',
          'Sou o assistente virtual da FarmaBot Pro.',
          'Como posso ajudar você hoje?'
        ],
        i18n: {
          en: {
            title: 'Assistente FarmaBot 🤖',
            subtitle: 'Estamos aqui para ajudar 24/7',
            footer: '',
            getStarted: 'Iniciar Conversa',
            inputPlaceholder: 'Digite sua mensagem...',
            closeButtonTooltip: 'Fechar chat',
          },
        },
      });

      if (chatContainer) {
        chatContainer.setAttribute('data-chat-initialized', 'true');
      }
  }, []);

  return <div id="n8n-chat-container" />;
} 