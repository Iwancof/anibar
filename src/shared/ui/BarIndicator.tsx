import type { Accessor } from "gnim"

import type { BarIndicatorViewModel } from "../bar-indicator.ts"
import { toneClass } from "../health.ts"
import Icon from "./Icon.tsx"

export interface BarIndicatorProps {
  model: Accessor<BarIndicatorViewModel>
}

export default function BarIndicator(props: BarIndicatorProps) {
  return (
    <box
      class={props.model((m) => `BarIndicator ${toneClass(m.tone)}`)}
      spacing={4}
    >
      <Icon class="BarIndicatorIcon" icon={props.model((m) => m.icon)} />
      <label class="BarIndicatorLabel" label={props.model((m) => m.label)} />
    </box>
  )
}
