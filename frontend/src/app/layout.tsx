import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/toaster";
// import { ChatButton } from "@/components/ia/ChatButton";  // FASE 5 - Gemini IA (comentado temporalmente)

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sistema Presupuestal",
  description: "Sistema de gestión presupuestal para instituciones educativas",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="es">
        <body className={inter.className}>
          {children}
          {/* <ChatButton /> */}{/* FASE 5 - Gemini IA (comentado temporalmente) */}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
