import { shell }   from 'electron'
import * as fs      from 'fs'
import * as path    from 'path'
import * as os      from 'os'

type Payload = Record<string, unknown>

/**
 * file_open — opens a file or folder with the default OS application.
 * Payload: { path: string }
 */
export async function handleFileOpen(payload: Payload): Promise<object> {
  const filePath = String(payload['path'] ?? '').trim()
  if (!filePath) throw new Error('path is required')

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  const err = await shell.openPath(filePath)
  if (err) throw new Error(`Could not open file: ${err}`)

  return { opened: true, path: filePath }
}

/**
 * file_search — recursively searches a directory for files matching a query.
 * Payload: { directory: string, query: string, extension?: string }
 * Returns up to 50 matching file paths.
 */
export async function handleFileSearch(payload: Payload): Promise<object> {
  const directory  = String(payload['directory'] ?? os.homedir()).trim()
  const query      = String(payload['query']     ?? '').toLowerCase().trim()
  const extension  = payload['extension'] as string | undefined

  if (!fs.existsSync(directory)) {
    throw new Error(`Directory not found: ${directory}`)
  }

  const results: string[] = []
  const MAX_RESULTS = 50
  const MAX_DEPTH   = 4

  function walk(dir: string, depth: number) {
    if (depth > MAX_DEPTH || results.length >= MAX_RESULTS) return

    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return  // Permission denied or other error — skip
    }

    for (const entry of entries) {
      if (results.length >= MAX_RESULTS) break

      const fullPath = path.join(dir, entry.name)

      // Skip hidden dirs and node_modules / .git
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue

      if (entry.isDirectory()) {
        walk(fullPath, depth + 1)
      } else if (entry.isFile()) {
        const nameMatch = !query || entry.name.toLowerCase().includes(query)
        const extMatch  = !extension || entry.name.endsWith(extension)
        if (nameMatch && extMatch) {
          results.push(fullPath)
        }
      }
    }
  }

  walk(directory, 0)

  return { files: results, count: results.length, query, directory }
}
