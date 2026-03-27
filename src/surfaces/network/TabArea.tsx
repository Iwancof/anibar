import { Gtk } from "ags/gtk4"
import { createMemo, createState } from "gnim"
import type { Accessor } from "gnim"
import type { FlowEntry, LogEntry } from "../../runtime/netmon-source.ts"
import FlowsTab from "./FlowsTab.tsx"
import LogTab from "./LogTab.tsx"

type TabName = "flows" | "log"

export interface TabAreaProps {
  flows: Accessor<FlowEntry[]>
  logs: Accessor<LogEntry[]>
}

export default function TabArea(props: TabAreaProps) {
  const [activeTab, setActiveTab] = createState<TabName>("flows")

  const flowsBtn = createMemo(() =>
    activeTab() === "flows" ? "NpTabBtn NpTabBtnActive" : "NpTabBtn"
  )
  const logBtn = createMemo(() =>
    activeTab() === "log" ? "NpTabBtn NpTabBtnActive" : "NpTabBtn"
  )

  const flowsVisible = createMemo(() => activeTab() === "flows")
  const logVisible = createMemo(() => activeTab() === "log")

  return (
    <box class="NpTabArea" orientation={Gtk.Orientation.VERTICAL} spacing={0} vexpand>
      <box class="NpTabBar" spacing={0}>
        <button class={flowsBtn} onClicked={() => setActiveTab("flows")}>
          <label label="FLOWS" />
        </button>
        <button class={logBtn} onClicked={() => setActiveTab("log")}>
          <label label="LOG" />
        </button>
      </box>
      <Gtk.ScrolledWindow
        class="NpTabScroll"
        vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
        hscrollbarPolicy={Gtk.PolicyType.NEVER}
        vexpand
      >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
          <FlowsTab flows={props.flows} visible={flowsVisible} />
          <LogTab logs={props.logs} visible={logVisible} />
        </box>
      </Gtk.ScrolledWindow>
    </box>
  )
}
