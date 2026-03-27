import { Gtk } from "ags/gtk4"
import { createMemo, createState } from "gnim"
import type { Accessor } from "gnim"
import type { WifiSnapshot } from "../../modules/wifi/domain.ts"
import type { FlowEntry, LogEntry } from "../../runtime/netmon-source.ts"
import FlowsTab from "./FlowsTab.tsx"
import LogTab from "./LogTab.tsx"
import WifiTab from "./WifiTab.tsx"

type TabName = "aps" | "flows" | "log"

export interface TabAreaProps {
  wifiSnapshot: Accessor<WifiSnapshot>
  flows: Accessor<FlowEntry[]>
  logs: Accessor<LogEntry[]>
  onConnect: (ssid: string, password?: string) => void
}

export default function TabArea(props: TabAreaProps) {
  const [activeTab, setActiveTab] = createState<TabName>("aps")

  const apsBtn = createMemo(() =>
    activeTab() === "aps" ? "NpTabBtn NpTabBtnActive" : "NpTabBtn"
  )
  const flowsBtn = createMemo(() =>
    activeTab() === "flows" ? "NpTabBtn NpTabBtnActive" : "NpTabBtn"
  )
  const logBtn = createMemo(() =>
    activeTab() === "log" ? "NpTabBtn NpTabBtnActive" : "NpTabBtn"
  )

  const apsVisible = createMemo(() => activeTab() === "aps")
  const flowsVisible = createMemo(() => activeTab() === "flows")
  const logVisible = createMemo(() => activeTab() === "log")

  return (
    <box class="NpTabArea" orientation={Gtk.Orientation.VERTICAL} spacing={0}>
      <box class="NpTabBar" spacing={0}>
        <button class={apsBtn} onClicked={() => setActiveTab("aps")}>
          <label label="APs" />
        </button>
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
        heightRequest={180}
      >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
          <WifiTab
            wifiSnapshot={props.wifiSnapshot}
            visible={apsVisible}
            onConnect={props.onConnect}
          />
          <FlowsTab flows={props.flows} visible={flowsVisible} />
          <LogTab logs={props.logs} visible={logVisible} />
        </box>
      </Gtk.ScrolledWindow>
    </box>
  )
}
