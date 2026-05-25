/**
 * GET /api/download/[platform]
 *
 * Redirects to the correct GitHub Release asset for the requested platform.
 * Platform values: windows | macos | linux
 *
 * To update the download URL:
 *  1. Push a tag "desktop-v1.x.x" to trigger the GitHub Actions build
 *  2. Once the release is published, update AGENT_VERSION below
 *
 * Set env var DESKTOP_AGENT_GITHUB_REPO to your repo (default: kenuxa/desktop-agent)
 */

import { NextRequest, NextResponse } from 'next/server'

const AGENT_VERSION = process.env['DESKTOP_AGENT_VERSION'] ?? '1.0.0'
const GITHUB_REPO   = process.env['DESKTOP_AGENT_GITHUB_REPO'] ?? 'kenuxa/desktop-agent'
const RELEASES_BASE = `https://github.com/${GITHUB_REPO}/releases/download/desktop-v${AGENT_VERSION}`

const PLATFORM_ASSETS: Record<string, { file: string; mime: string }> = {
  windows: {
    file: `KENUXA-Desktop-Agent-Setup-${AGENT_VERSION}.exe`,
    mime: 'application/vnd.microsoft.portable-executable',
  },
  macos: {
    file: `KENUXA-Desktop-Agent-${AGENT_VERSION}.dmg`,
    mime: 'application/x-apple-diskimage',
  },
  linux: {
    file: `KENUXA-Desktop-Agent-${AGENT_VERSION}.AppImage`,
    mime: 'application/x-executable',
  },
}

interface RouteParams {
  params: Promise<{ platform: string }>
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { platform } = await params
  const asset = PLATFORM_ASSETS[platform.toLowerCase()]

  if (!asset) {
    return NextResponse.json(
      { error: `Unknown platform "${platform}". Use: windows, macos, or linux` },
      { status: 400 }
    )
  }

  const downloadUrl = `${RELEASES_BASE}/${asset.file}`

  // 302 redirect to the GitHub Release asset
  // The browser will follow the redirect and prompt the file download
  return NextResponse.redirect(downloadUrl, {
    status: 302,
    headers: {
      'X-Download-Platform': platform,
      'X-Download-Version':  AGENT_VERSION,
    },
  })
}
