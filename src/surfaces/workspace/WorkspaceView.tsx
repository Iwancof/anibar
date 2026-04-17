import { Gtk } from "ags/gtk4"
import { createMemo, createState } from "gnim"
import type { Accessor } from "gnim"

import type { WorkspaceSnapshot, WorkspaceInfo } from "../../modules/workspace/domain.ts"
import { getDisplayLayoutSource } from "../../runtime/display-layout-source.ts"
import { switchToWorkspace } from "../../runtime/workspace-source.ts"
import { toggleDashboardVisibility } from "../../app/dashboard-controller.ts"
import DisplayLayoutView from "./DisplayLayoutView.tsx"

export interface WorkspaceViewProps {
  snapshot: Accessor<WorkspaceSnapshot | null>
}

const MAX_WS = 9

const EMPTY_WS: WorkspaceInfo = {
  id: 0,
  name: "",
  windows: 0,
  lastWindowTitle: "",
  clients: [],
}

type DashboardTab = "workspaces" | "displays"

export default function WorkspaceView(props: WorkspaceViewProps) {
  const displayLayouts = getDisplayLayoutSource()
  const [activeTab, setActiveTab] = createState<DashboardTab>("workspaces")
  const panelWidth = activeTab((tab) => tab === "displays" ? 1120 : 600)

  return (
    <box class="WsPanel" orientation={Gtk.Orientation.VERTICAL} spacing={16} widthRequest={panelWidth}>
      <box class="WsTopBar" spacing={8}>
        <button
          class={activeTab((tab) => tab === "workspaces" ? "WsTabButton WsTabButtonActive" : "WsTabButton")}
          onClicked={() => setActiveTab("workspaces")}
        >
          <label label="Workspaces" />
        </button>
        <button
          class={activeTab((tab) => tab === "displays" ? "WsTabButton WsTabButtonActive" : "WsTabButton")}
          onClicked={() => setActiveTab("displays")}
        >
          <label label="Displays" />
        </button>
      </box>

      <box visible={activeTab((tab) => tab === "workspaces")} orientation={Gtk.Orientation.VERTICAL} spacing={16}>
        <box class="WsHeader" spacing={8}>
          <label class="WsHeaderLabel" label="WORKSPACES" halign={Gtk.Align.START} hexpand />
          <label
            class="WsHeaderActive"
            label={props.snapshot((s) => s ? `Active: ${s.activeId}` : "--")}
            halign={Gtk.Align.END}
          />
        </box>

        <box class="WsGrid" spacing={8} homogeneous>
          {Array.from({ length: MAX_WS }).map((_, i) => {
            const wsIndex = i
            const ws = createMemo(() => {
              const s = props.snapshot()
              if (!s) return EMPTY_WS
              return s.workspaces[wsIndex] ?? EMPTY_WS
            })
            const isActive = createMemo(() => {
              const s = props.snapshot()
              const w = ws()
              return s != null && w.id === s.activeId
            })
            const exists = createMemo(() => ws().id > 0)

            return (
              <WsCard ws={ws} isActive={isActive} visible={exists} onClicked={() => {
                const w = ws()
                if (w.id > 0) {
                  switchToWorkspace(w.id)
                  toggleDashboardVisibility()
                }
              }} />
            )
          })}
        </box>
      </box>

      <box visible={activeTab((tab) => tab === "displays")}>
        <DisplayLayoutView
          currentProfile={displayLayouts.current}
          savedProfiles={displayLayouts.savedProfiles}
          onApply={displayLayouts.applyProfile}
          onSave={displayLayouts.saveProfile}
          onRefresh={displayLayouts.refresh}
        />
      </box>
    </box>
  )
}

interface WsCardProps {
  ws: Accessor<WorkspaceInfo>
  isActive: Accessor<boolean>
  visible: Accessor<boolean>
  onClicked: () => void
}

function WsCard(props: WsCardProps) {
  const cardClass = props.isActive((active) =>
    active ? "WsCard WsCardActive" : "WsCard",
  )

  const wsName = props.ws((w) => w.name || " ")
  const windowCount = props.ws((w) => `${w.windows} window${w.windows !== 1 ? "s" : ""}`)
  const lastTitle = props.ws((w) => w.lastWindowTitle || " ")

  const clientList = props.ws((w) =>
    w.clients.length > 0
      ? w.clients.slice(0, 3).map((c) => c.class || "unknown").join(", ")
      : "empty",
  )

  return (
    <button
      class={cardClass}
      visible={props.visible}
      onClicked={props.onClicked}
      hexpand
    >
      <box orientation={Gtk.Orientation.VERTICAL} spacing={6}>
        <box spacing={0}>
          <label class="WsCardId" label={wsName} halign={Gtk.Align.START} hexpand />
          <label class="WsCardBadge" label={windowCount} halign={Gtk.Align.END} />
        </box>
        <label class="WsCardTitle" label={lastTitle} halign={Gtk.Align.START} xalign={0} ellipsize={3} />
        <label class="WsCardClients" label={clientList} halign={Gtk.Align.START} xalign={0} ellipsize={3} />
      </box>
    </button>
  )
}
