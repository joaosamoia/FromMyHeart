import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Site do Amor",
  description: "Crie uma página personalizada e surpreenda quem você ama.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
