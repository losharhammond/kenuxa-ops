import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title:       'KENUXA OPS — Voice Operations',
  description: 'Voice-driven AI business operations system',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="noise">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
