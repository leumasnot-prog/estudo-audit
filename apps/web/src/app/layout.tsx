import type { Metadata } from "next";
import { Orbitron, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Auditor-AI",
    template: "%s | Auditor-AI",
  },
  description:
    "Ecossistema de estudos e repetição espaçada para concursos de Ciências Contábeis",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${orbitron.variable} ${jetbrainsMono.variable} font-mono bg-background text-foreground antialiased`}>
        {children}
      </body>
    </html>
  );
}
