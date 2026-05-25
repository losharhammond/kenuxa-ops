/**
 * KENUXA OPS — Electron Preload Script
 * Bridges the renderer (Next.js app) with Electron main process IPC.
 * Exposes a safe, explicit API via contextBridge.
 */

import { contextBridge, ipcRenderer } from 'electron'

// ── Type definitions (mirrored in web app as global) ───────────────────────────

export interface ElectronAPI {
  // App control
  openApp:      (appName: string) => Promise<{ success: boolean; error?: string }>
  minimizeApp:  () => void
  maximizeApp:  () => void
  closeApp:     () => void
  hideApp:      () => void
  showApp:      () => void

  // System info
  getSystemInfo: () => Promise<{
    platform:  string
    arch:      string
    hostname:  string
    username:  string
    memory:    { total: number; free: number }
    uptime:    number
  }>

  // File system
  openFile:     (options?: { filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>
  saveFile:     (content: string, filename?: string) => Promise<boolean>
  searchFiles:  (query: string, directory?: string) => Promise<string[]>

  // Notifications
  showNotification: (title: string, body: string, options?: {
    icon?: string
    sound?: boolean
    urgency?: 'low' | 'normal' | 'critical'
  }) => void

  // Clipboard
  readClipboard:  () => Promise<string>
  writeClipboard: (text: string) => Promise<void>

  // Shell
  openUrl:        (url: string) => Promise<void>
  openInBrowser:  (url: string) => Promise<void>

  // OPS-specific
  setWakeWordActive: (active: boolean) => void
  onVoiceCommand:    (callback: (text: string) => void) => () => void
  onSystemEvent:     (callback: (event: { type: string; data: unknown }) => void) => () => void
}

// ── Expose to renderer ─────────────────────────────────────────────────────────

contextBridge.exposeInMainWorld('electron', {
  // App control
  openApp: (appName: string) => ipcRenderer.invoke('app:open', appName),
  minimizeApp: () => ipcRenderer.send('window:minimize'),
  maximizeApp: () => ipcRenderer.send('window:maximize'),
  closeApp:    () => ipcRenderer.send('window:close'),
  hideApp:     () => ipcRenderer.send('window:hide'),
  showApp:     () => ipcRenderer.send('window:show'),

  // System info
  getSystemInfo: () => ipcRenderer.invoke('system:info'),

  // File system
  openFile:    (options?: unknown) => ipcRenderer.invoke('fs:open-file', options),
  saveFile:    (content: string, filename?: string) => ipcRenderer.invoke('fs:save-file', content, filename),
  searchFiles: (query: string, directory?: string) => ipcRenderer.invoke('fs:search', query, directory),

  // Notifications
  showNotification: (title: string, body: string, options?: unknown) =>
    ipcRenderer.send('notification:show', title, body, options),

  // Clipboard
  readClipboard:  () => ipcRenderer.invoke('clipboard:read'),
  writeClipboard: (text: string) => ipcRenderer.invoke('clipboard:write', text),

  // Shell
  openUrl:       (url: string) => ipcRenderer.invoke('shell:open-url', url),
  openInBrowser: (url: string) => ipcRenderer.invoke('shell:open-browser', url),

  // OPS-specific
  setWakeWordActive: (active: boolean) => ipcRenderer.send('ops:wake-word-state', active),

  onVoiceCommand: (callback: (text: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, text: string) => callback(text)
    ipcRenderer.on('ops:voice-command', handler)
    return () => ipcRenderer.removeListener('ops:voice-command', handler)
  },

  onSystemEvent: (callback: (event: { type: string; data: unknown }) => void) => {
    const handler = (_: Electron.IpcRendererEvent, event: { type: string; data: unknown }) => callback(event)
    ipcRenderer.on('ops:system-event', handler)
    return () => ipcRenderer.removeListener('ops:system-event', handler)
  },
} satisfies ElectronAPI)

// ── Augment the Window type for TypeScript ────────────────────────────────────

declare global {
  interface Window {
    electron?: ElectronAPI
  }
}
