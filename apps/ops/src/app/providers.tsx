'use client'

import { Toaster } from 'react-hot-toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0d0d14',
            color:      '#e4e4e7',
            border:     '1px solid #1a1a2e',
            fontSize:   '13px',
          },
        }}
      />
    </>
  )
}
