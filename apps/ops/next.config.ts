import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: [
    '@kenuxa/shared-types',
    '@kenuxa/ai',
    '@kenuxa/auth',
    '@kenuxa/events',
  ],
  serverExternalPackages: ['nodemailer', 'node-cron', 'playwright'],
  // Allow media stream in development
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Permissions-Policy', value: 'microphone=*' },
        ],
      },
    ]
  },
}

export default nextConfig
