import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Certification in 90 Minutes - FREE | AIwithArijit.com',
  description: 'Get certified in Agentic AI in just 90 minutes, absolutely FREE! Update your resume, boost your LinkedIn profile, and grab high-paying AI jobs. Training by industry experts & AI researchers.',
  keywords: 'AI certification, Agentic AI, free AI course, AI training, AI webinar, AI jobs, career in AI, AIwithArijit',
  authors: [{ name: 'Arijit', url: 'https://AIwithArijit.com' }],
  openGraph: {
    title: 'FREE AI Certification in 90 Minutes | AIwithArijit.com',
    description: 'Get certified in Agentic AI in just 90 minutes, absolutely FREE! Boost your career with AI skills.',
    url: 'https://AIwithArijit.com',
    siteName: 'AIwithArijit.com',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AI Certification by AIwithArijit.com',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FREE AI Certification in 90 Minutes',
    description: 'Get certified in Agentic AI - absolutely FREE! Update your resume & boost your career.',
    images: ['/og-image.png'],
  },
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  robots: 'index, follow',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#3B5BDB" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
