import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { N8nChatWidget } from "@/components/N8nChatWidget";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FarmaBot Pro - Dashboard",
  description: "Gerencie sua farmácia de forma inteligente.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {children}
        <N8nChatWidget />
      </body>
    </html>
  );
} 