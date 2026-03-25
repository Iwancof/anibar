import { Gtk } from "ags/gtk4"

import type { Accessor } from "gnim"

import type { BarIndicatorViewModel } from "../../shared/bar-indicator.ts"
import BarIndicator from "../../shared/ui/BarIndicator.tsx"

export interface BarIndicatorStripProps {
  indicators: Accessor<BarIndicatorViewModel>[]
}

export default function BarIndicatorStrip(props: BarIndicatorStripProps) {
  return (
    <box spacing={12} halign={Gtk.Align.END}>
      {props.indicators.map((indicator) => (
        <BarIndicator model={indicator} />
      ))}
    </box>
  )
}
