/**
 * KENUXA OPS — Plugin Manager
 * Manages built-in and external plugins, registers their commands
 */
import { registerHandler } from '@/services/commands/router.service'
import type { Plugin, PluginManifest, CommandIntent } from '@/types/ops'

type PluginSetupFn = () => void

const registeredPlugins = new Map<string, Plugin>()
const pluginSetupFns    = new Map<string, PluginSetupFn>()

// ── Register a plugin ──────────────────────────────────────────────────────────

export function registerPlugin(plugin: Plugin, setup: PluginSetupFn): void {
  if (registeredPlugins.has(plugin.name)) {
    console.warn(`[plugins] Plugin already registered: ${plugin.name}`)
    return
  }

  registeredPlugins.set(plugin.name, plugin)
  pluginSetupFns.set(plugin.name, setup)

  if (plugin.isActive) {
    setup()
    console.log(`[plugins] Loaded: ${plugin.displayName} v${plugin.version}`)
  }
}

// ── Enable/disable a plugin ────────────────────────────────────────────────────

export function enablePlugin(name: string): boolean {
  const plugin = registeredPlugins.get(name)
  const setup  = pluginSetupFns.get(name)
  if (!plugin || !setup) return false

  plugin.isActive = true
  setup()
  return true
}

export function disablePlugin(name: string): boolean {
  const plugin = registeredPlugins.get(name)
  if (!plugin) return false
  plugin.isActive = false
  return true
}

// ── List plugins ───────────────────────────────────────────────────────────────

export function getPlugins(): Plugin[] {
  return Array.from(registeredPlugins.values())
}

export function getPlugin(name: string): Plugin | undefined {
  return registeredPlugins.get(name)
}

// ── Initialize all built-in plugins ───────────────────────────────────────────

export async function initBuiltInPlugins(): Promise<void> {
  // Dynamic imports to avoid circular deps
  await import('./built-in/browser.plugin')
  await import('./built-in/gmail.plugin')
  await import('./built-in/core.plugin')
  console.log(`[plugins] ${registeredPlugins.size} built-in plugins initialized`)
}

// ── Create plugin manifest helper ─────────────────────────────────────────────

export function createPlugin(opts: {
  name:        string
  displayName: string
  description: string
  version?:    string
  category:    Plugin['category']
  commands:    string[]
  triggers?:   string[]
  isBuiltIn?:  boolean
}): Plugin {
  const manifest: PluginManifest = {
    commands:       opts.commands,
    triggers:       opts.triggers ?? [],
    settingsSchema: {},
  }

  return {
    id:          opts.name,
    name:        opts.name,
    displayName: opts.displayName,
    description: opts.description,
    version:     opts.version ?? '1.0.0',
    category:    opts.category,
    isBuiltIn:   opts.isBuiltIn ?? false,
    isActive:    true,
    manifest,
  }
}
