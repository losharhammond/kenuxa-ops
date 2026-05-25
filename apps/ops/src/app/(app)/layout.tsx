'use client'

import { useEffect, useCallback } from 'react'
import { usePathname }            from 'next/navigation'
import { Sidebar }   from '@/components/layout/Sidebar'
import { TopBar }    from '@/components/layout/TopBar'
import { useVoice }  from '@/hooks/useVoice'
import { useOpsStore } from '@/store/ops.store'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Operations Dashboard',
  '/voice':     'Voice Console',
  '/workflows': 'Workflow Center',
  '/memory':    'Memory Engine',
  '/email':     'Email Hub',
  '/plugins':   'Plugin Marketplace',
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { sidebarOpen } = useOpsStore()
  const { voiceState, startListening, stopListening, isSupported } = useVoice()

  // Auto-start voice on mount if supported
  useEffect(() => {
    if (isSupported) {
      const timer = setTimeout(startListening, 1200)
      return () => clearTimeout(timer)
    }
  }, [isSupported, startListening])

  const handleVoiceToggle = useCallback(() => {
    if (voiceState === 'idle') {
      startListening()
    } else {
      stopListening()
    }
  }, [voiceState, startListening, stopListening])

  const title = PAGE_TITLES[pathname] ?? 'KENUXA OPS'

  return (
    <div className="flex h-screen overflow-hidden bg-[#050508]">
      <Sidebar voiceState={voiceState} />

      <div
        className="flex flex-col flex-1 overflow-hidden transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? 220 : 64 }}
      >
        <TopBar onVoiceToggle={handleVoiceToggle} title={title} />

        <main className="flex-1 overflow-y-auto pt-16">
          {children}
        </main>
      </div>
    </div>
  )
}
