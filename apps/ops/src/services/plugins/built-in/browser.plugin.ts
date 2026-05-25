/**
 * Browser Plugin — web navigation and search
 */
import { registerPlugin, createPlugin } from '../plugin-manager'
import { registerHandler }              from '@/services/commands/router.service'

registerPlugin(
  createPlugin({
    name:        'browser',
    displayName: 'Browser Control',
    description: 'Navigate the web, search Google, open URLs',
    category:    'automation',
    commands:    ['open_url', 'search_web', 'get_page_content'],
    isBuiltIn:   true,
  }),
  () => {
    registerHandler('open_url', async (intent) => {
      let url = String(intent.entities['url'] ?? intent.entities['site_name'] ?? '')
      if (!url) return { result: null, speak: 'What URL should I open?' }
      if (!url.startsWith('http')) url = `https://${url}`
      window.open(url, '_blank', 'noopener')
      return { result: { opened: url }, speak: `Opening ${url}.` }
    })

    registerHandler('search_web', async (intent) => {
      const query = String(intent.entities['query'] ?? '')
      if (!query) return { result: null, speak: 'What should I search for?' }
      const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`
      window.open(url, '_blank', 'noopener')
      return { result: { query, url }, speak: `Searching Google for "${query}".` }
    })

    registerHandler('get_page_content', async () => {
      // In a real app: use Playwright via server API
      const res  = await fetch('/api/commands?action=get_page_content')
      const json = await res.json() as { content?: string }
      return {
        result: json,
        speak:  json.content
          ? `Got the page content. ${json.content.slice(0, 100)}`
          : 'Could not read the current page.',
      }
    })
  }
)
