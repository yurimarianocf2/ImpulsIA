'use client';

import { useEffect, useState } from 'react';
import { createChat } from '@n8n/chat';
import { Send, Bot, X, MessageCircle, Pill } from 'lucide-react';
import { cn } from '@/lib/utils';

export function N8nChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      // Pequeno delay para garantir que o DOM está pronto
      const timer = setTimeout(() => {
        try {
          const container = document.getElementById('n8n-chat-container');
          if (container && container.children.length === 0) {
            createChat({
              webhookUrl: 'https://webhook.impulsia.xyz/webhook/cc34a74f-1b3f-4d2a-805e-98ac2d603eb2/chat',
              target: '#n8n-chat-container',
              mode: 'fullscreen',
              showWelcomeScreen: false,
              loadPreviousSession: false,
              chatInputKey: 'chatInput',
              chatSessionKey: 'sessionId',
              defaultLanguage: 'en',
              initialMessages: [
                'Olá! Sou seu assistente de preços. Como posso te ajudar hoje?'
              ],
              i18n: {
                pt: {
                  title: 'ShopBot 🛒',
                  subtitle: 'Assistente Virtual de Preços',
                  footer: '',
                  getStarted: 'Nova Conversa',
                  inputPlaceholder: 'Digite sua pergunta sobre preços...',
                  closeButtonTooltip: 'Fechar Chat',
                  sendButtonTooltip: 'Enviar Mensagem'
                }
              },
              allowFileUploads: false,
              metadata: {}
            });
          }
        } catch (error) {
          console.error('Error initializing chat:', error);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const toggleChat = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Botão flutuante do chat */}
      <button
        onClick={toggleChat}
        className={cn(
          "fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300",
          "bg-gray-800 hover:bg-gray-700 text-white border border-gray-600",
          "hover:shadow-xl hover:scale-105",
          isOpen && "bg-gray-700"
        )}
        aria-label="Abrir chat"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <div className="relative">
            <MessageCircle className="h-6 w-6" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          </div>
        )}
      </button>

      {/* Container do n8n chat */}
      <div 
        id="n8n-chat-container" 
        className={cn(
          "fixed bottom-24 right-5 z-40 transition-all duration-300 ease-out",
          "w-[380px] h-[600px] max-h-[80vh]",
          "rounded-2xl shadow-2xl overflow-hidden",
          isOpen ? "opacity-100 visible scale-100 translate-y-0" : "opacity-0 invisible scale-95 translate-y-5"
        )}
        style={{
          '--chat-color-primary': '#3b82f6',
          '--chat-color-primary-hover': '#2563eb',
          '--chat-color-secondary': '#374151',
          '--chat-color-secondary-hover': '#4b5563',
          '--chat-color-text': '#f9fafb',
          '--chat-color-text-light': '#d1d5db',
          '--chat-color-background': '#1f2937',
          '--chat-color-input-background': '#374151',
          '--chat-color-input-border': '#4b5563',
          '--chat-color-input-border-focus': '#3b82f6',
          '--chat-border-radius': '0.75rem',
          '--chat-font-family': 'Inter, system-ui, sans-serif',
        } as React.CSSProperties}
      />

      {/* Overlay de fundo quando o chat está aberto */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={toggleChat}
        />
      )}

      {/* Estilos customizados para o n8n chat */}
      <style jsx global>{`
        /* Personalizar o chat n8n */
        #n8n-chat-container .n8n-chat {
          font-family: var(--chat-font-family) !important;
          border-radius: 1rem !important;
          overflow: hidden !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
        }

        #n8n-chat-container .n8n-chat__header {
          background: linear-gradient(135deg, #374151 0%, #1f2937 100%) !important;
          color: white !important;
          padding: 1rem !important;
          border-bottom: 1px solid #4b5563 !important;
        }

        #n8n-chat-container .n8n-chat__header h1 {
          color: white !important;
          font-size: 1.125rem !important;
          font-weight: 600 !important;
        }

        #n8n-chat-container .n8n-chat__header p {
          color: rgba(255, 255, 255, 0.8) !important;
          font-size: 0.875rem !important;
        }

        #n8n-chat-container .n8n-chat__body {
          background: var(--chat-color-background) !important;
          padding: 1rem !important;
        }

        #n8n-chat-container .n8n-chat__messages {
          gap: 0.75rem !important;
        }

        #n8n-chat-container .n8n-chat__message {
          border-radius: var(--chat-border-radius) !important;
          padding: 0.75rem 1rem !important;
          max-width: 85% !important;
        }

        #n8n-chat-container .n8n-chat__message--bot {
          background: var(--chat-color-secondary) !important;
          color: var(--chat-color-text) !important;
          margin-right: auto !important;
        }

        #n8n-chat-container .n8n-chat__message--user {
          background: var(--chat-color-primary) !important;
          color: white !important;
          margin-left: auto !important;
        }

        #n8n-chat-container .n8n-chat__input-container {
          background: var(--chat-color-background) !important;
          border-top: 1px solid var(--chat-color-input-border) !important;
          padding: 1rem !important;
        }

        #n8n-chat-container .n8n-chat__input {
          background: var(--chat-color-input-background) !important;
          border: 1px solid var(--chat-color-input-border) !important;
          border-radius: var(--chat-border-radius) !important;
          color: var(--chat-color-text) !important;
          padding: 0.75rem 1rem !important;
          font-size: 0.875rem !important;
        }

        #n8n-chat-container .n8n-chat__input:focus {
          border-color: var(--chat-color-input-border-focus) !important;
          outline: none !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1) !important;
        }

        #n8n-chat-container .n8n-chat__button {
          background: var(--chat-color-primary) !important;
          color: white !important;
          border-radius: var(--chat-border-radius) !important;
          padding: 0.5rem 1rem !important;
          font-weight: 500 !important;
          transition: background-color 0.2s !important;
        }

        #n8n-chat-container .n8n-chat__button:hover {
          background: var(--chat-color-primary-hover) !important;
        }

        #n8n-chat-container .n8n-chat__button:disabled {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
        }

        /* Scrollbar customizada */
        #n8n-chat-container .n8n-chat__messages::-webkit-scrollbar {
          width: 6px;
        }

        #n8n-chat-container .n8n-chat__messages::-webkit-scrollbar-track {
          background: transparent;
        }

        #n8n-chat-container .n8n-chat__messages::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 3px;
        }

        #n8n-chat-container .n8n-chat__messages::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }

        /* Responsividade para mobile */
        @media (max-width: 768px) {
          .fixed.bottom-24.right-5 {
            right: 1rem !important;
            left: 1rem !important;
            bottom: 5rem !important;
            width: calc(100% - 2rem) !important;
            max-width: 100% !important;
            height: calc(100vh - 8rem) !important;
          }
        }
      `}</style>
    </>
  );
}