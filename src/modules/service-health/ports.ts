import type { Accessor } from "gnim"

import type { ServiceHealthSnapshot } from "./domain.ts"

export interface ServiceHealthSource {
  snapshot: Accessor<ServiceHealthSnapshot>
}
