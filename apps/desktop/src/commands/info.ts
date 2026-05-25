import { app } from 'electron'
import * as os  from 'os'

export function handleInfo(): object {
  return {
    platform:     process.platform,
    arch:         process.arch,
    version:      app.getVersion(),
    hostname:     os.hostname(),
    capabilities: ['browser', 'filesystem', 'notify', 'keyboard'],
    nodeVersion:  process.versions.node,
    electronVersion: process.versions.electron,
    uptime:       process.uptime(),
  }
}
