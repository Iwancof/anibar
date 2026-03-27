import { Gtk } from "ags/gtk4"
import { createMemo, createState } from "gnim"
import type { Accessor } from "gnim"
import type { WifiSnapshot } from "../../modules/wifi/domain.ts"
import type { FlowEntry, LogEntry } from "../../runtime/netmon-source.ts"
import FlowsTab from "./FlowsTab.tsx"
import LogTab from "./LogTab.tsx"
import WifiTab from "./WifiTab.tsx"

type TabName = "flows" | "log" | "wifi"

export interface TabAreaProps {
  wifiSnapshot: Accessor<WifiSnapshot>
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
  const wifiBtn = createMemo(() =>
    activeTab() === "wifi" ? "NpTabBtn NpTabBtnActive" : "NpTabBtn"
  )

  const flowsVisible = createMemo(() => activeTab() === "flows")
  const logVisible = createMemo(() => activeTab() === "log")
  const wifiVisible = createMemo(() => activeTab() === "wifi")

  return (
    <box class="NpTabArea" orientation={Gtk.Orientation.VERTICAL} spacing={0}>
      <box class="NpTabBar" spacing={0}>
        <button class={flowsBtn} onClicked={() => setActiveTab("flows")}>
          <label label="FLOWS" />
        </button>
        <button class={logBtn} onClicked={() => setActiveTab("log")}>
          <label label="LOG" />
        </button>
        <button class={wifiBtn} onClicked={() => setActiveTab("wifi")}>
          <label label="WIFI" />
        </button>
      </box>
      <Gtk.ScrolledWindow
        class="NpTabScroll"
        vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
        hscrollbarPolicy={Gtk.PolicyType.NEVER}
        heightRequest={180}
      >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
          <FlowsTab flows={props.flows} visible={flowsVisible} />
          <LogTab logs={props.logs} visible={logVisible} />
          <WifiTab wifiSnapshot={props.wifiSnapshot} visible={wifiVisible} />
        </box>
      </Gtk.ScrolledWindow>
    </box>
  )
}
