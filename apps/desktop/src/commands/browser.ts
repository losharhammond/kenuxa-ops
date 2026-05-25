import { shell } from 'electron'

type Payload = Record<string, unknown>

/**
 * open_url — opens a URL in the user's default browser.
 * Payload: { url: string }
 */
export async function handleOpenUrl(payload: Payload): Promise<object> {
  const url = String(payload['url'] ?? '')
  if (!url) throw new Error('url is required')

  // Validate scheme to prevent arbitrary shell exec
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error('Only http:// and https:// URLs are allowed')
  }

  await shell.openExternal(url)
  return { opened: true, url }
}

/**
 * browser_navigate — same as open_url (opens in default browser).
 * For true tab control the OPS Bridge Client uses Playwright/Chrome DevTools.
 * Payload: { url: string, query?: string }
 */
export async function handleBrowserNavigate(payload: Payload): Promise<object> {
  let url = String(payload['url'] ?? '')
  const query = payload['query'] as string | undefined

  // If a search query is given and no URL, do a Google search
  if (!url && query) {
    url = `https://www.google.com/search?q=${encodeURIComponent(query)}`
  }

  if (!url) throw new Error('url or query is required')

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error('Only http:// and https:// URLs are allowed')
  }

  await shell.openExternal(url)
  return { navigated: true, url }
}
