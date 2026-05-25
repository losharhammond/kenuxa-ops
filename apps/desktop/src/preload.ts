/**
 * Preload script — exposes IPC to renderer via contextBridge.
 * Runs in a sandboxed context with access to Node's ipcRenderer.
 */
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('kenuxa', {
  login: (email: string, password: string) =>
    ipcRenderer.invoke('auth:login', { email, password }),

  status: () =>
    ipcRenderer.invoke('auth:status'),
})
