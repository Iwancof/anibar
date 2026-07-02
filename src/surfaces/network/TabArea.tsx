import { Gtk } from "ags/gtk4"
import { createMemo, createState } from "gnim"
import type { Accessor } from "gnim"
import type { FlowEntry, LogEntry } from "../../runtime/netmon-source.ts"
import TabBar from "../../shared/ui/TabBar.tsx"
import FlowsTab from "./FlowsTab.tsx"
import LogTab from "./LogTab.tsx"

type TabName = "flows" | "log"

export interface TabAreaProps {
  flows: Accessor<FlowEntry[]>
  logs: Accessor<LogEntry[]>
}

export default function TabArea(props: TabAreaProps) {
  const [activeTab, setActiveTab] = createState<TabName>("flows")

  const flowsVisible = createMemo(() => activeTab() === "flows")
  const logVisible = createMemo(() => activeTab() === "log")

  return (
    <box class="NpTabArea" orientation={Gtk.Orientation.VERTICAL} spacing={0} vexpand>
      <TabBar
        tabs={[{ id: "flows", label: "FLOWS" }, { id: "log", label: "LOG" }]}
        active={activeTab}
        onSelect={(id) => setActiveTab(id)}
        variant="underline"
      />
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
