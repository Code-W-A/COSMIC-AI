import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/components/auth/auth-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
})

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL)
    : new URL('http://localhost:3000'),
  title: 'AstroAI 24/7 — Your Personal Astrology AI Agent',
  description:
    'Ask questions about love, purpose, compatibility, and your birth chart — and receive personalized answers powered by astrology data and AI.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'AstroAI 24/7 — Your Personal Astrology AI Agent',
    description:
      'Ask questions about love, purpose, compatibility, and your birth chart — and receive personalized answers powered by astrology data and AI.',
    images: [
      {
        url: '/branding/logo-new.png',
        width: 512,
        height: 512,
        alt: 'AstroAI 24/7 logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'AstroAI 24/7 — Your Personal Astrology AI Agent',
    description:
      'Ask questions about love, purpose, compatibility, and your birth chart — and receive personalized answers powered by astrology data and AI.',
    images: ['/branding/logo-new.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#070311',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} bg-background`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
        <Toaster theme="dark" position="bottom-center" richColors />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
