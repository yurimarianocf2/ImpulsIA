'use client';

import { useEffect } from 'react';
import { createChat } from '@n8n/chat';

export function N8nChatWidget() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      createChat({
        webhookUrl: 'https://webhook.impulsia.xyz/webhook/cc34a74f-1b3f-4d2a-805e-98ac2d603eb2/chat',
        mode: 'window',
        showWelcomeScreen: true,
        chatInputKey: 'farmabot-chat',
        target: '#n8n-chat-widget',
        theme: {
          '@n8n-chat--toggle--width': '48px',
          '@n8n-chat--toggle--height': '48px',
          '@n8n-chat--toggle--size': '48px',
          '@n8n-chat--toggle--bottom': '20px',
          '@n8n-chat--toggle--right': '20px',
          '@n8n-chat--window--width': '480px',
          '@n8n-chat--window--height': 'calc(100vh - 120px)',
          '@n8n-chat--window--bottom': '100px',
          '@n8n-chat--window--right': '20px',
        },
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
    }
  }, []);

  return null;
} 