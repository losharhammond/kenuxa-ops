/**
 * keyboard_type — types text into the currently focused window.
 * Uses platform-native scripting — no native module dependencies.
 *
 * Payload: { text: string }
 *
 * Windows: PowerShell SendKeys via System.Windows.Forms
 * macOS:   AppleScript keystroke
 * Linux:   xdotool type
 */

import { exec }  from 'child_process'
import * as util from 'util'

const execAsync = util.promisify(exec)
type Payload    = Record<string, unknown>

export async function handleKeyboardType(payload: Payload): Promise<object> {
  const text = String(payload['text'] ?? '')
  if (!text) throw new Error('text is required')

  // Limit length to prevent abuse
  const safeText = text.slice(0, 2000)

  let cmd: string

  switch (process.platform) {
    case 'win32': {
      // Escape special SendKeys chars: +^%~(){}[]
      const escaped = safeText
        .replace(/\+/g, '{+}')
        .replace(/\^/g, '{^}')
        .replace(/~/g, '{~}')
        .replace(/%/g, '{%}')
        .replace(/\(/g, '{(}')
        .replace(/\)/g, '{)}')
        .replace(/\{/g, '{{}')
        .replace(/\}/g, '{}}')
        .replace(/\[/g, '{[}')
        .replace(/\]/g, '{]}')
        .replace(/'/g, "''")  // PowerShell single-quote escape

      cmd = `powershell -NoProfile -Command "
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.SendKeys]::SendWait('${escaped}')
      "`
      break
    }

    case 'darwin': {
      // AppleScript — escape backslashes and double-quotes
      const escaped = safeText
        .replace(/\\/g, '\\\\')
        .replace(/"/g,  '\\"')
      cmd = `osascript -e 'tell application "System Events" to keystroke "${escaped}"'`
      break
    }

    default: {
      // Linux: xdotool (requires xdotool package)
      const escaped = safeText.replace(/'/g, "'\\''")
      cmd = `xdotool type --clearmodifiers '${escaped}'`
    }
  }

  try {
    await execAsync(cmd, { timeout: 15_000 })
    return { typed: true, length: safeText.length }
  } catch (err) {
    throw new Error(`Keyboard type failed: ${(err as Error).message}`)
  }
}
