/**
 * KENUXA OPS — Electron Main Process
 * Wraps the Next.js app in a desktop shell with full system access.
 * Handles IPC for: app launching, file system, notifications, shell ops.
 */

import {
  app, BrowserWindow, ipcMain, dialog,
  shell, clipboard, Notification, Tray, Menu, nativeImage,
} from 'electron'
import * as path   from 'path'
import * as os     from 'os'
import * as fs     from 'fs'
import { exec }    from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// ── Constants ──────────────────────────────────────────────────────────────────

const IS_DEV  = process.env.NODE_ENV === 'development'
const APP_URL = IS_DEV ? 'http://localhost:3002' : `file://${path.join(__dirname, '../out/index.html')}`

// ── Known application map (cross-platform) ────────────────────────────────────

const APP_MAP: Record<string, Record<string, string>> = {
  darwin: {
    chrome:     'open -a "Google Chrome"',
    safari:     'open -a Safari',
    firefox:    'open -a Firefox',
    vscode:     'open -a "Visual Studio Code"',
    terminal:   'open -a Terminal',
    finder:     'open -a Finder',
    mail:       'open -a Mail',
    calendar:   'open -a Calendar',
    spotify:    'open -a Spotify',
    slack:      'open -a Slack',
    zoom:       'open -a zoom.us',
    notion:     'open -a Notion',
  },
  win32: {
    chrome:     'start chrome',
    edge:       'start msedge',
    firefox:    'start firefox',
    vscode:     'code',
    terminal:   'start cmd',
    explorer:   'explorer',
    outlook:    'start outlook',
    calendar:   'start outlookcal:',
    spotify:    'start spotify',
    slack:      'start slack',
    zoom:       'start zoom',
    notepad:    'notepad',
    wordpad:    'wordpad',
  },
  linux: {
    chrome:    'google-chrome',
    firefox:   'firefox',
    vscode:    'code',
    terminal:  'gnome-terminal',
    files:     'nautilus',
    thunderbird: 'thunderbird',
    spotify:   'spotify',
    slack:     'slack',
  },
}

// ── State ─────────────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isWakeWordActive = false

// ── Create main window ────────────────────────────────────────────────────────

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width:          1280,
    height:         800,
    minWidth:       900,
    minHeight:      600,
    titleBarStyle:  'hiddenInset',
    vibrancy:       'under-window',
    visualEffectState: 'active',
    backgroundColor: '#050508',
    icon:           path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload:            path.join(__dirname, 'preload.js'),
      contextIsolation:   true,
      nodeIntegration:    false,
      webSecurity:        true,
      allowRunningInsecureContent: false,
      // Allow microphone for voice features
      permissions: ['microphone'],
    },
  })

  mainWindow.loadURL(APP_URL)

  // Grant microphone permission
  mainWindow.webContents.session.setPermissionRequestHandler((_, permission, callback) => {
    const allowed = ['microphone', 'media'].includes(permission)
    callback(allowed)
  })

  if (IS_DEV) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  mainWindow.on('closed', () => { mainWindow = null })

  // Intercept external links — open in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// ── System tray ────────────────────────────────────────────────────────────────

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '../public/icon-tray.png'))
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)

  const updateMenu = () => {
    tray?.setContextMenu(Menu.buildFromTemplate([
      {
        label: 'KENUXA OPS',
        enabled: false,
        icon: icon.isEmpty() ? undefined : icon.resize({ width: 16, height: 16 }),
      },
      { type: 'separator' },
      {
        label: isWakeWordActive ? '🎙️ Wake Word: ON' : '🔇 Wake Word: OFF',
        click: () => {
          isWakeWordActive = !isWakeWordActive
          mainWindow?.webContents.send('ops:system-event', {
            type: 'wake_word_toggle',
            data: { active: isWakeWordActive },
          })
          updateMenu()
        },
      },
      { type: 'separator' },
      { label: 'Open Dashboard', click: () => { mainWindow?.show(); mainWindow?.focus() } },
      { label: 'Voice Console',  click: () => {
        mainWindow?.show()
        mainWindow?.focus()
        mainWindow?.webContents.send('ops:system-event', { type: 'navigate', data: '/voice' })
      }},
      { type: 'separator' },
      { label: 'Quit KENUXA OPS', role: 'quit' },
    ]))
  }

  updateMenu()
  tray.setToolTip('KENUXA OPS — Voice Operations')
  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.focus()
    } else {
      mainWindow?.show()
    }
  })
}

// ── IPC Handlers ──────────────────────────────────────────────────────────────

function registerIpcHandlers() {
  // ── App launching ──────────────────────────────────────────────────────────
  ipcMain.handle('app:open', async (_, appName: string) => {
    const platform = process.platform as 'darwin' | 'win32' | 'linux'
    const apps = APP_MAP[platform] ?? {}
    const normalized = appName.toLowerCase().replace(/\s+/g, '_')

    // Find command
    const command = apps[normalized] ?? apps[appName.toLowerCase()]
    if (command) {
      try {
        await execAsync(command)
        return { success: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }

    // Fallback: try to open as URL (web apps)
    const webApps: Record<string, string> = {
      gmail:      'https://mail.google.com',
      drive:      'https://drive.google.com',
      docs:       'https://docs.google.com',
      sheets:     'https://sheets.google.com',
      meet:       'https://meet.google.com',
      github:     'https://github.com',
      kenuxa:     'https://kenuxa.com',
      reach:      'http://localhost:3000',
    }
    const webUrl = webApps[normalized]
    if (webUrl) {
      await shell.openExternal(webUrl)
      return { success: true }
    }

    return { success: false, error: `Unknown application: ${appName}` }
  })

  // ── System info ────────────────────────────────────────────────────────────
  ipcMain.handle('system:info', async () => ({
    platform: process.platform,
    arch:     process.arch,
    hostname: os.hostname(),
    username: os.userInfo().username,
    memory:   { total: os.totalmem(), free: os.freemem() },
    uptime:   os.uptime(),
  }))

  // ── File system ────────────────────────────────────────────────────────────
  ipcMain.handle('fs:open-file', async (_, options?: Electron.OpenDialogOptions) => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      ...options,
    })
    return result.canceled ? null : result.filePaths[0] ?? null
  })

  ipcMain.handle('fs:save-file', async (_, content: string, filename?: string) => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: filename ?? 'untitled.txt',
    })
    if (result.canceled || !result.filePath) return false
    fs.writeFileSync(result.filePath, content, 'utf8')
    return true
  })

  ipcMain.handle('fs:search', async (_, query: string, directory?: string) => {
    const dir = directory ?? os.homedir()
    try {
      const platform = process.platform
      let cmd: string
      if (platform === 'win32') {
        cmd = `dir /s /b "${dir}" | findstr /i "${query}"`
      } else {
        cmd = `find "${dir}" -maxdepth 4 -iname "*${query}*" 2>/dev/null | head -20`
      }
      const { stdout } = await execAsync(cmd)
      return stdout.trim().split('\n').filter(Boolean).slice(0, 20)
    } catch {
      return []
    }
  })

  // ── Notifications ──────────────────────────────────────────────────────────
  ipcMain.on('notification:show', (_, title: string, body: string) => {
    if (Notification.isSupported()) {
      new Notification({ title, body, silent: false }).show()
    }
  })

  // ── Clipboard ──────────────────────────────────────────────────────────────
  ipcMain.handle('clipboard:read',  () => clipboard.readText())
  ipcMain.handle('clipboard:write', (_, text: string) => { clipboard.writeText(text) })

  // ── Shell ─────────────────────────────────────────────────────────────────
  ipcMain.handle('shell:open-url',     (_, url: string) => shell.openPath(url))
  ipcMain.handle('shell:open-browser', (_, url: string) => shell.openExternal(url))

  // ── Window controls ────────────────────────────────────────────────────────
  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.on('window:close', () => mainWindow?.close())
  ipcMain.on('window:hide',  () => mainWindow?.hide())
  ipcMain.on('window:show',  () => { mainWindow?.show(); mainWindow?.focus() })

  // ── OPS-specific ──────────────────────────────────────────────────────────
  ipcMain.on('ops:wake-word-state', (_, active: boolean) => {
    isWakeWordActive = active
  })
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createMainWindow()
  createTray()
  registerIpcHandlers()

  // macOS: re-create window when dock icon clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
    else { mainWindow?.show(); mainWindow?.focus() }
  })
})

// Quit when all windows closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Prevent second instance
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// Security: prevent new windows
app.on('web-contents-created', (_, contents) => {
  contents.on('new-window', (event, url) => {
    event.preventDefault()
    shell.openExternal(url)
  })
})
