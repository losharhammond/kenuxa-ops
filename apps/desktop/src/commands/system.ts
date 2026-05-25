/**
 * System commands — open apps, switch windows.
 * Uses platform-native scripts via child_process to avoid native module deps.
 */

import { exec }  from 'child_process'
import { shell } from 'electron'
import * as util from 'util'

const execAsync = util.promisify(exec)
type Payload    = Record<string, unknown>

// ── open_app ───────────────────────────────────────────────────────────────────

/**
 * open_app — launch an application by name.
 * Payload: { app: string }
 *
 * Windows:  start "" "app.exe"  or  start ms-apps:// for UWP
 * macOS:    open -a "App Name"
 * Linux:    xdg-open / gtk-launch appname
 */
export async function handleOpenApp(payload: Payload): Promise<object> {
  const appName = String(payload['app'] ?? '').trim()
  if (!appName) throw new Error('app is required')

  // Sanitize: block shell injection
  if (/[;&|`$\\<>]/.test(appName)) {
    throw new Error('Invalid app name')
  }

  let cmd: string

  switch (process.platform) {
    case 'win32':
      // Try common Windows apps first
      cmd = buildWindowsOpenCmd(appName)
      break
    case 'darwin':
      cmd = `open -a "${appName.replace(/"/g, '')}"`
      break
    default:
      // Linux: try gtk-launch first, fallback to xdg-open
      cmd = `gtk-launch "${appName.replace(/"/g, '')}" 2>/dev/null || xdg-open "${appName.replace(/"/g, '')}"`
  }

  try {
    await execAsync(cmd, { timeout: 10_000 })
    return { launched: true, app: appName }
  } catch (err) {
    // Fallback: try shell.openExternal as a last resort for URLs/apps
    const fallbackUrl = `${appName}`
    if (appName.startsWith('http')) {
      await shell.openExternal(fallbackUrl)
      return { launched: true, app: appName, method: 'shell.openExternal' }
    }
    throw new Error(`Could not launch "${appName}": ${(err as Error).message}`)
  }
}

function buildWindowsOpenCmd(appName: string): string {
  const safe = appName.replace(/"/g, '').toLowerCase()

  // Common Windows apps → short commands
  const shortcuts: Record<string, string> = {
    'notepad':       'notepad',
    'calculator':    'calc',
    'paint':         'mspaint',
    'word':          'start winword',
    'excel':         'start excel',
    'powerpoint':    'start powerpnt',
    'outlook':       'start outlook',
    'chrome':        'start chrome',
    'firefox':       'start firefox',
    'edge':          'start msedge',
    'explorer':      'explorer',
    'task manager':  'taskmgr',
    'cmd':           'start cmd',
    'powershell':    'start powershell',
    'vscode':        'code',
    'visual studio code': 'code',
  }

  for (const [key, cmd] of Object.entries(shortcuts)) {
    if (safe.includes(key)) return cmd
  }

  // Generic: try running it directly (works if it's on PATH)
  return `start "" "${appName.replace(/"/g, '')}"`
}

// ── switch_window ──────────────────────────────────────────────────────────────

/**
 * switch_window — bring a window with the given title to the foreground.
 * Payload: { title: string }
 *
 * Windows: PowerShell Win32 API call
 * macOS:   AppleScript
 * Linux:   wmctrl / xdotool
 */
export async function handleSwitchWindow(payload: Payload): Promise<object> {
  const title = String(payload['title'] ?? '').trim()
  if (!title) throw new Error('title is required')

  // Sanitize
  if (/[;&|`$\\<>]/.test(title)) {
    throw new Error('Invalid window title')
  }

  let cmd: string

  switch (process.platform) {
    case 'win32':
      // PowerShell: find window by partial title and bring to front
      cmd = `powershell -NoProfile -Command "
        Add-Type @'
          using System;
          using System.Runtime.InteropServices;
          public class WinOps {
            [DllImport(\\"user32.dll\\")] public static extern bool SetForegroundWindow(IntPtr hWnd);
            [DllImport(\\"user32.dll\\")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
          }
'@
        $procs = Get-Process | Where-Object { $_.MainWindowTitle -like '*${title.replace(/'/g, "''")}*' }
        foreach ($p in $procs) {
          [WinOps]::ShowWindow($p.MainWindowHandle, 9)
          [WinOps]::SetForegroundWindow($p.MainWindowHandle)
        }
      "`
      break

    case 'darwin':
      cmd = `osascript -e 'tell application "System Events" to set frontmost of (first process whose name contains "${title.replace(/"/g, '')}") to true'`
      break

    default:
      // Linux: wmctrl (may not be installed)
      cmd = `wmctrl -a "${title.replace(/"/g, '')}"`
  }

  try {
    await execAsync(cmd, { timeout: 8_000 })
    return { switched: true, title }
  } catch (err) {
    throw new Error(`Could not switch to window "${title}": ${(err as Error).message}`)
  }
}
