import type { Accessor } from "gnim"
import type { SystemStatsSnapshot } from "./domain.ts"

export interface SystemStatsSource {
  snapshot: Accessor<SystemStatsSnapshot | null>
}
