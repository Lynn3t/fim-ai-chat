import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FimAI Chat",
  description: "AI聊天助手 - 支持多种AI模型的智能对话平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="font-sans antialiased"
      >
        {children}
      </body>
    </html>
  );
}
