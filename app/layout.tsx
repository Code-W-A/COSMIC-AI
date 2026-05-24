import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/components/auth/auth-provider'
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
  title: 'Cosmic AI — Your Personal Astrology AI Agent',
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
    title: 'Cosmic AI — Your Personal Astrology AI Agent',
    description:
      'Ask questions about love, purpose, compatibility, and your birth chart — and receive personalized answers powered by astrology data and AI.',
    images: [
      {
        url: '/branding/logo-new.png',
        width: 512,
        height: 512,
        alt: 'Cosmic AI logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Cosmic AI — Your Personal Astrology AI Agent',
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
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} bg-background`}>
      <body className="font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
