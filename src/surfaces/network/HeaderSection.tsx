import { createMemo, type Accessor } from "gnim"

import type { NetworkSnapshot } from "../../modules/network/domain.ts"
import type { WifiSnapshot } from "../../modules/wifi/domain.ts"
import PanelHeader from "../../shared/ui/PanelHeader.tsx"

export interface HeaderSectionProps {
  networkSnapshot: Accessor<NetworkSnapshot>
  wifiSnapshot: Accessor<WifiSnapshot>
}

export default function HeaderSection(props: HeaderSectionProps) {
  const interfaceName = createMemo(() =>
    props.wifiSnapshot().iface?.name
      ?? props.networkSnapshot().interfaceName
      ?? "LIVE",
  )

  return (
    <PanelHeader title="NET::LINK" meta={interfaceName} />
  )
}
