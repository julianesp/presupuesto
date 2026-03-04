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
  icons: {
    icon: "https://0dwas2ied3dcs14f.public.blob.vercel-storage.com/finanzaspres/logo.png",
    shortcut: "https://0dwas2ied3dcs14f.public.blob.vercel-storage.com/finanzaspres/logo.png",
    apple: "https://0dwas2ied3dcs14f.public.blob.vercel-storage.com/finanzaspres/logo.png",
  },
  openGraph: {
    title: "Sistema Presupuestal",
    description: "Sistema de gestión presupuestal para instituciones educativas",
    images: [
      {
        url: "https://0dwas2ied3dcs14f.public.blob.vercel-storage.com/finanzaspres/logo.png",
        width: 1200,
        height: 630,
        alt: "Sistema Presupuestal",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sistema Presupuestal",
    description: "Sistema de gestión presupuestal para instituciones educativas",
    images: ["https://0dwas2ied3dcs14f.public.blob.vercel-storage.com/finanzaspres/logo.png"],
  },
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
