export type HealthTone = "healthy" | "warning" | "critical" | "muted"

export function toneClass(tone: HealthTone): string {
  return `tone-${tone}`
}
