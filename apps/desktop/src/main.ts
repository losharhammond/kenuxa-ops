/**
 * KENUXA Desktop Agent — Main Process
 *
 * Responsibilities:
 *  1. System tray icon (always running in background)
 *  2. Login window (BrowserWindow with Supabase auth)
 *  3. Start WebSocket bridge server on port 7411
 *  4. Register device with KENUXA OPS after login
 *  5. Send heartbeat every 30s so OPS shows "active"
 */

import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  Notification,
  ipcMain,
  shell,
} from 'electron'
import * as path from 'path'
import * as fs   from 'fs'
import { startBridgeServer, stopBridgeServer } from './bridge'
import { registerDevice, startHeartbeat, stopHeartbeat } from './registry'
import { createSupabaseClient } from './supabase'

// ── Constants ──────────────────────────────────────────────────────────────────

const VERSION      = app.getVersion()
const USER_DATA    = app.getPath('userData')
const SESSION_FILE = path.join(USER_DATA, 'session.json')
const BRIDGE_PORT  = 7411

// ── App state ──────────────────────────────────────────────────────────────────

let tray:        Tray        | null = null
let loginWin:    BrowserWindow | null = null
let isConnected  = false

// ── Single instance lock ───────────────────────────────────────────────────────

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

app.on('second-instance', () => {
  if (loginWin) { loginWin.show(); loginWin.focus() }
})

// ── App ready ──────────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  app.setAppUserModelId('com.kenuxa.desktop-agent')

  createTray()

  // Try to resume saved session
  const saved = loadSession()
  if (saved?.accessToken) {
    await connectWithSession(saved)
  } else {
    openLoginWindow()
  }
})

app.on('window-all-closed', () => {
  // Keep running in tray — do NOT quit
})

app.on('before-quit', () => {
  stopHeartbeat()
  stopBridgeServer()
})

// ── Tray ───────────────────────────────────────────────────────────────────────

function createTray() {
  // Use a 16x16 template image (macOS) or 32x32 ico (Windows)
  const iconPath = path.join(__dirname, '..', 'assets',
    process.platform === 'darwin' ? 'trayTemplate.png' : 'icon.png'
  )

  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    : nativeImage.createEmpty()

  tray = new Tray(icon)
  tray.setToolTip('KENUXA Desktop Agent')
  updateTrayMenu()
}

function updateTrayMenu() {
  if (!tray) return

  const menu = Menu.buildFromTemplate([
    {
      label:   isConnected ? '✅  Connected to OPS' : '🔴  Not connected',
      enabled: false,
    },
    {
      label:   `v${VERSION}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: isConnected ? 'Disconnect' : 'Login to OPS',
      click: () => {
        if (isConnected) {
          handleDisconnect()
        } else {
          openLoginWindow()
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Open OPS Dashboard',
      click: () => shell.openExternal('http://localhost:3002/agent'),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ])

  tray!.setContextMenu(menu)
}

// ── Login window ───────────────────────────────────────────────────────────────

function openLoginWindow() {
  if (loginWin) { loginWin.show(); loginWin.focus(); return }

  loginWin = new BrowserWindow({
    width:           440,
    height:          520,
    resizable:       false,
    center:          true,
    title:           'KENUXA Desktop Agent — Login',
    backgroundColor: '#09090b',
    webPreferences: {
      preload:             path.join(__dirname, 'preload.js'),
      contextIsolation:    true,
      nodeIntegration:     false,
      sandbox:             false,
    },
  })

  loginWin.loadFile(path.join(__dirname, '..', 'src', 'renderer', 'index.html'))
  loginWin.on('closed', () => { loginWin = null })
}

// ── IPC: login from renderer ───────────────────────────────────────────────────

ipcMain.handle('auth:login', async (_event, { email, password }: { email: string; password: string }) => {
  try {
    const supabase = createSupabaseClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error || !data.session) {
      return { success: false, error: error?.message ?? 'Login failed' }
    }

    const session = {
      accessToken:  data.session.access_token,
      refreshToken: data.session.refresh_token,
      userId:       data.user.id,
      email:        data.user.email ?? email,
    }

    saveSession(session)
    await connectWithSession(session)

    loginWin?.close()
    return { success: true }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
})

ipcMain.handle('auth:status', () => ({
  connected: isConnected,
  version:   VERSION,
}))

// ── Connect / Disconnect ───────────────────────────────────────────────────────

async function connectWithSession(session: {
  accessToken:  string
  refreshToken: string
  userId:       string
  email:        string
}) {
  try {
    // 1. Start the local bridge server
    await startBridgeServer(BRIDGE_PORT)

    // 2. Register/re-register device with OPS
    const device = await registerDevice({
      accessToken: session.accessToken,
      userId:      session.userId,
      platform:    getPlatform(),
      version:     VERSION,
    })

    if (!device.success) {
      console.warn('[main] Device registration failed:', device.error)
      // Don't block — bridge still runs locally
    }

    // 3. Start heartbeat
    startHeartbeat({
      accessToken: session.accessToken,
      deviceId:    device.deviceId ?? generateDeviceId(),
    })

    isConnected = true
    updateTrayMenu()

    // 4. Show system notification
    showNotification(
      'KENUXA Desktop Agent',
      '✅ Connected to OPS — voice commands now control your desktop.'
    )
  } catch (err) {
    console.error('[main] Connection failed:', err)
    isConnected = false
    updateTrayMenu()
  }
}

function handleDisconnect() {
  stopHeartbeat()
  stopBridgeServer()
  clearSession()
  isConnected = false
  updateTrayMenu()
  openLoginWindow()
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getPlatform(): 'windows' | 'macos' | 'linux' {
  switch (process.platform) {
    case 'win32':  return 'windows'
    case 'darwin': return 'macos'
    default:       return 'linux'
  }
}

function generateDeviceId(): string {
  const idFile = path.join(USER_DATA, 'device.id')
  if (fs.existsSync(idFile)) return fs.readFileSync(idFile, 'utf8').trim()
  // Stable fingerprint from hostname + platform + username
  const raw  = `${require('os').hostname()}-${process.platform}-${process.env['USERNAME'] ?? process.env['USER'] ?? 'user'}`
  const id   = Buffer.from(raw).toString('base64').replace(/[^a-z0-9]/gi, '').slice(0, 32)
  fs.writeFileSync(idFile, id, 'utf8')
  return id
}

function saveSession(session: object) {
  fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true })
  fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2), 'utf8')
}

function loadSession(): Record<string, string> | null {
  try {
    if (!fs.existsSync(SESSION_FILE)) return null
    return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8')) as Record<string, string>
  } catch {
    return null
  }
}

function clearSession() {
  try { fs.unlinkSync(SESSION_FILE) } catch { /* ignore */ }
}

export function showNotification(title: string, body: string) {
  if (Notification.isSupported()) {
    new Notification({ title, body, silent: false }).show()
  }
}
