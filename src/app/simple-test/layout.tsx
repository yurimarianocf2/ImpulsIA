import type { Metadata } from "next";
import "../../globals.css";

export const metadata: Metadata = {
  title: "Simple Test - FarmacIA",
  description: "Simple test page for debugging.",
};

export default function SimpleTestLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body>
        {children}
      </body>
    </html>
  );
}