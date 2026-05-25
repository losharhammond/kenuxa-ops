/**
 * System Commands Handler — open/close apps, search files, system info
 */
import { registerHandler } from '../router.service'
import type { ParsedIntent } from '@/types/ops'

registerHandler('open_app', async (intent: ParsedIntent) => {
  const appName = String(intent.entities['app_name'] ?? '')
  // In browser: open known web apps. In Electron: use IPC to launch native app
  const webApps: Record<string, string> = {
    gmail:      'https://mail.google.com',
    google:     'https://google.com',
    youtube:    'https://youtube.com',
    notion:     'https://notion.so',
    whatsapp:   'https://web.whatsapp.com',
    linkedin:   'https://linkedin.com',
    twitter:    'https://twitter.com',
    github:     'https://github.com',
    dashboard:  '/dashboard',
    reach:      process.env.NEXT_PUBLIC_KENUXA_CORE_URL ?? 'http://localhost:3000',
  }

  const url = webApps[appName.toLowerCase()]
  if (url) {
    if (url.startsWith('http')) window.open(url, '_blank')
    else window.location.href = url

    return { result: { opened: appName, url }, speak: `Opening ${appName}.` }
  }

  // Try Electron IPC if available
  if (typeof window !== 'undefined' && (window as unknown as { electronAPI?: { openApp: (n: string) => Promise<boolean> } }).electronAPI) {
    const api = (window as unknown as { electronAPI: { openApp: (n: string) => Promise<boolean> } }).electronAPI
    const success = await api.openApp(appName)
    if (success) return { result: { opened: appName }, speak: `Opening ${appName}.` }
  }

  return { result: null, speak: `I couldn't find ${appName}. Try saying the full name.` }
})

registerHandler('search_files', async (intent: ParsedIntent) => {
  const query = String(intent.entities['query'] ?? '')
  // Call server-side file search
  const res  = await fetch(`/api/commands?action=search_files&q=${encodeURIComponent(query)}`)
  const json = await res.json() as { files?: string[]; error?: string }
  if (json.error) throw new Error(json.error)

  const files = json.files ?? []
  const speak = files.length === 0
    ? `No files found for "${query}".`
    : `Found ${files.length} file${files.length > 1 ? 's' : ''} matching "${query}".`

  return { result: { files, query }, speak }
})

registerHandler('help', async () => {
  const speak = `I can open apps, send emails, search the web, create tasks,
run workflows, query KENUXA intelligence, and much more.
Just speak your command after the wake word.`
  return { result: { capabilities: 'listed' }, speak }
})

registerHandler('speak_only', async (intent: ParsedIntent) => {
  const message = String(intent.entities['message'] ?? intent.speak_text ?? 'Understood.')
  return { result: { spoke: message }, speak: message }
})

registerHandler('unknown', async () => {
  return {
    result: null,
    speak: "I didn't understand that command. Try again or say 'help' for what I can do.",
  }
})
