import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KENUXA ACADEMY',
  description: 'Human Development Operating System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
