import { Gtk } from "ags/gtk4"
import { createMemo } from "gnim"
import type { Accessor } from "gnim"

import type { WorkspaceSnapshot, WorkspaceInfo } from "../../modules/workspace/domain.ts"

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

export default function WorkspaceView(props: WorkspaceViewProps) {
  return (
    <box class="WsPanel" orientation={Gtk.Orientation.VERTICAL} spacing={16} widthRequest={600}>
      {/* Header */}
      <box class="WsHeader" spacing={8}>
        <label class="WsHeaderLabel" label="WORKSPACES" halign={Gtk.Align.START} hexpand />
        <label
          class="WsHeaderActive"
          label={props.snapshot((s) => s ? `Active: ${s.activeId}` : "--")}
          halign={Gtk.Align.END}
        />
      </box>

      {/* Workspace grid */}
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
            <WsCard ws={ws} isActive={isActive} visible={exists} />
          )
        })}
      </box>
    </box>
  )
}

interface WsCardProps {
  ws: Accessor<WorkspaceInfo>
  isActive: Accessor<boolean>
  visible: Accessor<boolean>
}

function WsCard(props: WsCardProps) {
  const cardClass = props.isActive((active) =>
    active ? "WsCard WsCardActive" : "WsCard",
  )

  const wsName = props.ws((w) => w.name || " ")
  const windowCount = props.ws((w) => `${w.windows} window${w.windows !== 1 ? "s" : ""}`)
  const lastTitle = props.ws((w) => w.lastWindowTitle || " ")

  // Show up to 3 client names
  const clientList = props.ws((w) =>
    w.clients.length > 0
      ? w.clients.slice(0, 3).map((c) => c.class || "unknown").join(", ")
      : "empty",
  )

  return (
    <box
      class={cardClass}
      visible={props.visible}
      orientation={Gtk.Orientation.VERTICAL}
      spacing={6}
      hexpand
    >
      <box spacing={0}>
        <label class="WsCardId" label={wsName} halign={Gtk.Align.START} hexpand />
        <label class="WsCardBadge" label={windowCount} halign={Gtk.Align.END} />
      </box>
      <label class="WsCardTitle" label={lastTitle} halign={Gtk.Align.START} xalign={0} ellipsize={3} />
      <label class="WsCardClients" label={clientList} halign={Gtk.Align.START} xalign={0} ellipsize={3} />
    </box>
  )
}
