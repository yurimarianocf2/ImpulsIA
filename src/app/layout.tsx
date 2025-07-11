import type { Metadata } from "next";
import "../globals.css";
import { N8nChatWidget } from "@/components/N8nChatWidget";

export const metadata: Metadata = {
  title: "FarmacIA - Dashboard",
  description: "Gerencie sua farmácia de forma inteligente.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link href="https://cdn.jsdelivr.net/npm/@n8n/chat/dist/style.css" rel="stylesheet" />
      </head>
      <body>
        {children}
        {/* <N8nChatWidget /> */}
      </body>
    </html>
  );
} 