import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
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
          <AuthProvider>
            <AppShell>{children}</AppShell>
            {/* <ChatButton /> */}{/* FASE 5 - Gemini IA (comentado temporalmente) */}
          </AuthProvider>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
