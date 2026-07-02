import { Gtk } from "ags/gtk4"
import { createMemo } from "gnim"
import type { Accessor } from "gnim"
import type { FlowEntry } from "../../runtime/netmon-source.ts"
import { fixedSlots } from "../../shared/fixed-slots.ts"

const MAX_FLOWS = 15

export interface FlowsTabProps {
  flows: Accessor<FlowEntry[]>
  visible: Accessor<boolean>
}

function FlowRow(props: { entry: Accessor<FlowEntry | null> }) {
  const visible = createMemo(() => props.entry() != null)
  const dstPort = createMemo(() => props.entry()?.dstPort ?? "")
  const dstHost = createMemo(() => {
    const e = props.entry()
    if (!e) return ""
    return e.hostname || e.dstIp
  })
  const proto = createMemo(() => props.entry()?.proto ?? "")

  return (
    <box class="NpFlowRow" spacing={4} visible={visible}>
      <label class="NpFlowPort" label={dstPort} widthRequest={42} xalign={1} />
      <label class="NpFlowProto" label={proto} widthRequest={32} xalign={0} />
      <label class="NpFlowHost" label={dstHost} hexpand xalign={0} ellipsize={3} />
    </box>
  )
}

export default function FlowsTab(props: FlowsTabProps) {
  return (
    <box
      class="NpTabContent"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={0}
      visible={props.visible}
    >
      {fixedSlots(MAX_FLOWS).map((i) => {
        const entry = createMemo(() => props.flows()[i] ?? null)
        return <FlowRow entry={entry} />
      })}
    </box>
  )
}
