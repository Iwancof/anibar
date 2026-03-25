import type { HealthTone } from "./health.ts"

export interface BarIndicatorViewModel {
  id: string
  icon: string
  label: string
  tone: HealthTone
}
