import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MenuAI — Carta digital inteligente para hostelería",
  description:
    "Digitaliza la carta de tu restaurante y ofrece un asistente IA que ayuda a tus clientes a elegir según sus gustos, alergias y preferencias.",
  keywords: ["carta digital", "menú QR", "restaurante", "IA", "asistente", "hostelería", "alérgenos"],
  openGraph: {
    title: "MenuAI — Carta digital inteligente",
    description: "Digitaliza la carta de tu restaurante con IA",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#8B5E3C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${dmSerif.variable} ${outfit.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
