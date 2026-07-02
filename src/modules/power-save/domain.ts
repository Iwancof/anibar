// ── pwsavectl measure types ──

export const MEASURE_NAMES = ["ppd", "brightness", "boost", "cores", "gpu", "wifi"] as const
export type MeasureName = (typeof MEASURE_NAMES)[number]

export interface MeasureStatus {
  measure: MeasureName
  enabled: boolean
}

export interface PwsaveStatus {
  summary: "all_enabled" | "all_disabled" | "partial"
  measures: MeasureStatus[]
}

export function parsePwsaveStatus(json: string): PwsaveStatus | null {
  try {
    const raw = JSON.parse(json)
    if (!raw || !Array.isArray(raw.measures)) return null
    const measures: MeasureStatus[] = raw.measures
      .filter((m: any) => MEASURE_NAMES.includes(m.measure))
      .map((m: any) => ({ measure: m.measure as MeasureName, enabled: !!m.enabled }))
    const summary = raw.summary === "all_enabled" ? "all_enabled"
      : raw.summary === "all_disabled" ? "all_disabled"
      : "partial"
    return { summary, measures }
  } catch {
    return null
  }
}

export function isAllEnabled(status: PwsaveStatus): boolean {
  return status.measures.every((m) => m.enabled)
}

export function isMeasureEnabled(status: PwsaveStatus, name: MeasureName): boolean {
  return status.measures.find((m) => m.measure === name)?.enabled ?? false
}

// ── Lid action types ──

export const LID_ACTIONS = ["suspend", "hibernate", "ignore"] as const
export type LidAction = (typeof LID_ACTIONS)[number]

export const LID_ACTION_LABELS: Record<LidAction, string> = {
  suspend: "SLEEP",
  hibernate: "HIBERNATE",
  ignore: "IGNORE",
}

export function parseLidAction(raw: string): LidAction {
  const trimmed = raw.trim().toLowerCase()
  if (trimmed === "hibernate") return "hibernate"
  if (trimmed === "ignore") return "ignore"
  return "suspend" // default
}
