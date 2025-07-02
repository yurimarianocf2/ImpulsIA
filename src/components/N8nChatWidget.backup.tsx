'use client';

import { useEffect } from 'react';
import { createChat } from '@n8n/chat';

export function N8nChatWidget() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Adicionar CSS específico para controlar o tamanho do chat
      const style = document.createElement('style');
      style.textContent = `
        /* N8N Chat Widget - Correção de Tamanho */
        .n8n-chat-toggle,
        [class*="toggle"],
        [id*="chat"] button,
        [class*="chat"] button,
        div[style*="position: fixed"] {
          width: 48px !important;
          height: 48px !important;
          max-width: 48px !important;
          max-height: 48px !important;
          min-width: 48px !important;
          min-height: 48px !important;
          border-radius: 50% !important;
          bottom: 20px !important;
          right: 20px !important;
          transform: none !important;
          scale: 1 !important;
        }
        
        /* Força variáveis CSS */
        :root {
          --n8n-chat--toggle--size: 48px !important;
          --n8n-chat--toggle--width: 48px !important;
          --n8n-chat--toggle--height: 48px !important;
        }
      `;
      document.head.appendChild(style);
      createChat({
        webhookUrl: 'https://webhook.impulsia.xyz/webhook/cc34a74f-1b3f-4d2a-805e-98ac2d603eb2/chat',
        mode: 'window',
        showWelcomeScreen: true,
        chatInputKey: 'farmabot-chat',
        target: '#n8n-chat-widget',
        initialMessages: [
          'Olá! 💊',
          'Sou a FarmacIA, sua assistente virtual especializada em farmácia.',
          'Posso ajudar com consultas de medicamentos, preços e orientações gerais.',
          'Como posso ajudar você hoje?'
        ],
        i18n: {
          en: {
            title: 'FarmacIA 💊',
            subtitle: 'Assistente Virtual Farmacêutica',
            footer: ' ',
            getStarted: 'Conversar com FarmacIA',
            inputPlaceholder: 'Digite sobre medicamentos, preços...',
            closeButtonTooltip: 'Fechar FarmacIA',
            sendButtonTooltip: 'Enviar mensagem',
          },
        },
        allowFileUploads: false,
      });

      // Observer para garantir que o estilo seja aplicado quando o elemento for criado
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // Procurar por elementos do chat que foram adicionados
              if (element.matches('button') || element.matches('[class*="toggle"]') || element.matches('[style*="position: fixed"]')) {
                // Aplicar estilos diretamente
                const chatElement = element as HTMLElement;
                chatElement.style.width = '48px';
                chatElement.style.height = '48px';
                chatElement.style.maxWidth = '48px';
                chatElement.style.maxHeight = '48px';
                chatElement.style.minWidth = '48px';
                chatElement.style.minHeight = '48px';
                chatElement.style.borderRadius = '50%';
                chatElement.style.bottom = '20px';
                chatElement.style.right = '20px';
                chatElement.style.transform = 'none';
              }
              
              // Esconder footer "Powered by n8n"
              if (element.matches('[class*="footer"]') || element.matches('[class*="powered"]') || 
                  element.textContent?.toLowerCase().includes('powered by')) {
                const footer = element as HTMLElement;
                footer.style.display = 'none';
                footer.style.visibility = 'hidden';
                footer.style.height = '0';
                footer.style.opacity = '0';
              }
              
              // Aplicar estilos a elementos filhos também
              const toggleButtons = element.querySelectorAll('button, [class*="toggle"], [style*="position: fixed"]');
              toggleButtons.forEach((btn) => {
                const chatBtn = btn as HTMLElement;
                chatBtn.style.width = '48px';
                chatBtn.style.height = '48px';
                chatBtn.style.maxWidth = '48px';
                chatBtn.style.maxHeight = '48px';
                chatBtn.style.minWidth = '48px';
                chatBtn.style.minHeight = '48px';
                chatBtn.style.borderRadius = '50%';
                chatBtn.style.bottom = '20px';
                chatBtn.style.right = '20px';
                chatBtn.style.transform = 'none';
              });
              
              // Esconder todos os footers dentro do elemento
              const footers = element.querySelectorAll('[class*="footer"], [class*="powered"]');
              footers.forEach((footer) => {
                const footerEl = footer as HTMLElement;
                footerEl.style.display = 'none';
                footerEl.style.visibility = 'hidden';
                footerEl.style.height = '0';
                footerEl.style.opacity = '0';
              });
              element.querySelectorAll('div').forEach((div) => {
                if (div.textContent?.toLowerCase().includes('powered by')) {
                  const footerEl = div as HTMLElement;
                  footerEl.style.display = 'none';
                  footerEl.style.visibility = 'hidden';
                  footerEl.style.height = '0';
                  footerEl.style.opacity = '0';
                }
              });
            }
          });
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Cleanup function
      return () => observer.disconnect();
    }
  }, []);

  return <div id="n8n-chat-widget" />;
}