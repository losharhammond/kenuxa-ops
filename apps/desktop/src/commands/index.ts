/**
 * Command router — maps bridge command types to handlers.
 *
 * All handlers receive the raw payload and return a plain object.
 * Errors thrown here are caught by bridge.ts and sent back as { success: false, error }.
 */

import { handleInfo }            from './info'
import { handleOpenApp, handleSwitchWindow } from './system'
import { handleOpenUrl, handleBrowserNavigate } from './browser'
import { handleFileOpen, handleFileSearch }     from './files'
import { handleKeyboardType }    from './keyboard'
import { handleNotify }          from './notify'

type Payload = Record<string, unknown>

export async function routeCommand(type: string, payload: Payload): Promise<unknown> {
  switch (type) {
    // Info
    case 'info':             return handleInfo()

    // System / OS
    case 'open_app':         return handleOpenApp(payload)
    case 'switch_window':    return handleSwitchWindow(payload)

    // Browser
    case 'open_url':         return handleOpenUrl(payload)
    case 'browser_navigate': return handleBrowserNavigate(payload)

    // File system
    case 'file_open':        return handleFileOpen(payload)
    case 'file_search':      return handleFileSearch(payload)

    // Input
    case 'keyboard_type':    return handleKeyboardType(payload)

    // Notifications
    case 'notify':           return handleNotify(payload)

    default:
      throw new Error(`Unknown command type: ${type}`)
  }
}
