import type { Accessor } from "gnim"

import type { NetworkSnapshot } from "./domain.ts"

export interface NetworkSource {
  snapshot: Accessor<NetworkSnapshot>
}
