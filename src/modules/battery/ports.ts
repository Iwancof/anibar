import type { Accessor } from "gnim"

import type { BatterySnapshot } from "./domain.ts"

export interface BatterySource {
  snapshot: Accessor<BatterySnapshot | null>
}
