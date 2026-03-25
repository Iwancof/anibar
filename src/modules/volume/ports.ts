import type { Accessor } from "gnim"

import type { VolumeSnapshot } from "./domain.ts"

export interface VolumeSource {
  snapshot: Accessor<VolumeSnapshot | null>
}
