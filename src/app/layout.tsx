import type { Metadata } from "next";
import "../globals.css";
import { N8nChatWidget } from "@/components/N8nChatWidget";
import { printEnvStatus } from '@/lib/env-validation';

export const metadata: Metadata = {
  title: "FarmaBot Pro - Dashboard",
  description: "Gerencie sua farmácia de forma inteligente.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Print environment status in development
  if (process.env.NODE_ENV === 'development') {
    printEnvStatus();
  }

  return (
    <html lang="pt-BR">
      <head>
        <link href="https://cdn.jsdelivr.net/npm/@n8n/chat/dist/style.css" rel="stylesheet" />
      </head>
      <body>
        {children}
        <N8nChatWidget />
      </body>
    </html>
  );
} 