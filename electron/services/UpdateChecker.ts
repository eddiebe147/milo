import { app } from 'electron'

export interface UpdateInfo {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  releaseUrl: string
  downloadUrl: string
  releaseNotes: string
  publishedAt: string
}

interface GitHubRelease {
  tag_name: string
  html_url: string
  body: string
  published_at: string
  assets: Array<{
    name: string
    browser_download_url: string
  }>
}

const GITHUB_REPO = 'eddiebe147/milo'
const RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`

function compareVersions(current: string, latest: string): number {
  const cleanVersion = (v: string) => v.replace(/^v/, '')
  const currentParts = cleanVersion(current).split('.').map(Number)
  const latestParts = cleanVersion(latest).split('.').map(Number)

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const c = currentParts[i] || 0
    const l = latestParts[i] || 0
    if (l > c) return 1
    if (l < c) return -1
  }
  return 0
}

export async function checkForUpdates(): Promise<UpdateInfo> {
  const currentVersion = app.getVersion()

  try {
    const response = await fetch(RELEASES_API, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'MILO-UpdateChecker',
      },
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const release: GitHubRelease = await response.json()
    const latestVersion = release.tag_name.replace(/^v/, '')

    const dmgAsset = release.assets.find(
      (a) => a.name.endsWith('.dmg') || a.name.includes('mac')
    )

    const hasUpdate = compareVersions(currentVersion, latestVersion) > 0

    return {
      hasUpdate,
      currentVersion,
      latestVersion,
      releaseUrl: release.html_url,
      downloadUrl: dmgAsset?.browser_download_url || release.html_url,
      releaseNotes: release.body || '',
      publishedAt: release.published_at,
    }
  } catch (error) {
    console.error('[UpdateChecker] Failed to check for updates:', error)
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      releaseUrl: `https://github.com/${GITHUB_REPO}/releases`,
      downloadUrl: `https://github.com/${GITHUB_REPO}/releases`,
      releaseNotes: '',
      publishedAt: '',
    }
  }
}

export function getCurrentVersion(): string {
  return app.getVersion()
}
