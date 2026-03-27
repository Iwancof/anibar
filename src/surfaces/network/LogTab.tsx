import { Gtk } from "ags/gtk4"
import { createMemo } from "gnim"
import type { Accessor } from "gnim"
import type { LogEntry } from "../../runtime/netmon-source.ts"

const MAX_LOGS = 30

export interface LogTabProps {
  logs: Accessor<LogEntry[]>
  visible: Accessor<boolean>
}

function eventClass(event: string): string {
  switch (event) {
    case "NEW":
      return "NpLogEvent NpLogEventNew"
    case "DESTROY":
      return "NpLogEvent NpLogEventClose"
    default:
      return "NpLogEvent NpLogEventEstab"
  }
}

function stateLabel(entry: LogEntry): string {
  // Show event type + TCP state
  if (entry.state === "ESTABLISHED") return "ESTAB"
  if (entry.state === "SYN_SENT") return "SYN"
  if (entry.state === "FIN_WAIT") return "FIN"
  if (entry.state === "CLOSE_WAIT" || entry.state === "LAST_ACK" || entry.state === "TIME_WAIT") return "CLOSE"
  return entry.state.slice(0, 5)
}

function LogRow(props: { entry: Accessor<LogEntry | null> }) {
  const visible = createMemo(() => props.entry() != null)
  const time = createMemo(() => props.entry()?.timestamp ?? "")
  const evtLabel = createMemo(() => {
    const e = props.entry()
    return e ? `[${e.event}]` : ""
  })
  const evtClass = createMemo(() => {
    const e = props.entry()
    return e ? eventClass(e.event) : "NpLogEvent"
  })
  const state = createMemo(() => {
    const e = props.entry()
    return e ? stateLabel(e) : ""
  })
  const dest = createMemo(() => {
    const e = props.entry()
    return e ? `${e.dstIp}:${e.dstPort}` : ""
  })

  return (
    <box class="NpLogRow" spacing={4} visible={visible}>
      <label class="NpLogTime" label={time} widthRequest={56} xalign={0} />
      <label class={evtClass} label={evtLabel} widthRequest={56} xalign={0} />
      <label class="NpLogState" label={state} widthRequest={40} xalign={0} />
      <label class="NpLogDest" label={dest} hexpand xalign={0} ellipsize={3} />
    </box>
  )
}

export default function LogTab(props: LogTabProps) {
  return (
    <box
      class="NpTabContent"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={0}
      visible={props.visible}
    >
      {Array.from({ length: MAX_LOGS }).map((_, i) => {
        const entry = createMemo(() => props.logs()[i] ?? null)
        return <LogRow entry={entry} />
      })}
    </box>
  )
}
