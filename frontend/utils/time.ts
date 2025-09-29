/**
 * Formats a timestamp to a relative time string
 * @param iso ISO timestamp string
 * @returns Formatted time string (e.g., "2m", "1h", "3d")
 */
export function formatLastMessageTime(iso?: string): string {
  if (!iso) return ""

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""

  const now = Date.now()
  const diff = now - date.getTime()

  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return "now"
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`

  return date.toLocaleDateString()
}