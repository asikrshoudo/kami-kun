const REPO = 'asikrshoudo/nion-cli'

export async function checkForUpdates(currentVersion: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPO}/releases/latest`,
      {
        headers: { 'User-Agent': 'nion-cli' },
        signal: AbortSignal.timeout(4000),
      }
    )
    if (!response.ok) return null
    const data = await response.json() as { tag_name?: string }
    const latest = data.tag_name?.replace(/^v/, '') ?? null
    if (!latest) return null
    return latest !== currentVersion ? latest : null
  } catch {
    return null
  }
}
