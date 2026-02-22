import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import { ChatButton } from "@/components/ia/ChatButton";

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
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider>
          <AppShell>{children}</AppShell>
          <ChatButton />
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
