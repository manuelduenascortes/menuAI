import type { Metadata, Viewport } from 'next'
import { DM_Serif_Display, Outfit, Geist_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import ThemeProvider from '@/components/ThemeProvider'
import CookieBanner from '@/components/CookieBanner'
import './globals.css'

const dmSerif = DM_Serif_Display({
  variable: '--font-dm-serif',
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
})

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'MenuAI - Carta digital inteligente para hostelería',
  description:
    'Digitaliza la carta de tu local y ofrece un asistente de IA que ayuda a tus clientes a elegir comida, café, copas o cualquier consumición.',
  keywords: ['carta digital', 'menú QR', 'hostelería', 'bar', 'cafetería', 'restaurante', 'coctelería', 'IA'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://menuai.es'),
  openGraph: {
    title: 'MenuAI - Carta digital inteligente',
    description: 'Carta digital con IA para restaurantes, bares, cafeterías y coctelerías.',
    type: 'website',
    siteName: 'MenuAI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MenuAI - Carta digital inteligente',
    description: 'Carta digital con IA para todo tipo de locales de hostelería',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#8B5E3C',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      className={`${dmSerif.variable} ${outfit.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider>
          <TooltipProvider>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-6 focus:py-3 focus:bg-foreground focus:text-background focus:text-sm focus:font-semibold focus:rounded-lg focus:outline-2 focus:outline-ring focus:outline-offset-2 focus:no-underline"
            >
              Ir al contenido
            </a>
            {children}
          </TooltipProvider>
          <Toaster richColors position="bottom-right" />
          <CookieBanner />
        </ThemeProvider>
      </body>
    </html>
  )
}
