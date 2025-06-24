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