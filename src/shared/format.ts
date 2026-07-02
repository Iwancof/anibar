export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function formatPercent(value: number): string {
  return `${Math.round(clamp(value, 0, 100))}%`
}

export function placeholder(value: string | number | null | undefined): string {
  return value == null ? "—" : String(value)
}

export function formatWatts(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "n/a"
  }

  const digits = Math.abs(value) >= 10 ? 0 : 1
  return `${value.toFixed(digits)} W`
}

export function formatBytesPerSecond(value: number): string {
  const safe = Math.max(0, value)
  const units = ["B/s", "KiB/s", "MiB/s", "GiB/s", "TiB/s"]

  let current = safe
  let unit = 0

  while (current >= 1024 && unit < units.length - 1) {
    current /= 1024
    unit += 1
  }

  const digits = current >= 100 ? 0 : current >= 10 ? 1 : 2
  return `${current.toFixed(digits)} ${units[unit]}`
}

export function timeAgo(epochSeconds: number): string {
  const diff = Math.max(0, Math.floor(Date.now() / 1000 - epochSeconds))
  if (diff < 60) return "now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export function formatDurationMinutes(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return "n/a"
  }

  const rounded = Math.round(value)
  const hours = Math.floor(rounded / 60)
  const minutes = rounded % 60

  if (hours === 0) {
    return `${minutes}m`
  }

  if (minutes === 0) {
    return `${hours}h`
  }

  return `${hours}h ${minutes}m`
}
