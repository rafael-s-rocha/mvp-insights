import type { Metadata } from "next";
import "./globals.css";
import { APP_NAME } from "@/lib/appConfig";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Resumo diário inteligente do seu negócio",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}