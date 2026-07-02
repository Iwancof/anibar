import { Astal, Gdk, Gtk } from "ags/gtk4"
import { createMemo } from "gnim"

import type { NotificationSource } from "../../runtime/notification-source.ts"
import { closeNotifCenter } from "../../app/controllers.ts"
import { fixedSlots } from "../../shared/fixed-slots.ts"
import { timeAgo } from "../../shared/format.ts"
import NotificationCard from "../../shared/ui/NotificationCard.tsx"
import PopupShell from "../../shared/ui/PopupShell.tsx"

const MAX_HISTORY = 20

// DND toggle は通知センターヘッダーに配置

export interface NotificationCenterProps {
  gdkmonitor: Gdk.Monitor
  monitor: string
  notifications: NotificationSource
}

export default function NotificationCenter(props: NotificationCenterProps) {
  const { notifications } = props

  const emptyLabel = createMemo(() =>
    notifications.all().length === 0 ? "NO HISTORY" : "",
  )
  const hasEmpty = createMemo(() => notifications.all().length === 0)

  return (
    <PopupShell
      name={`notif-center:${props.monitor}`}
      windowClass="NotifCenter"
      gdkmonitor={props.gdkmonitor}
      exclusivity={Astal.Exclusivity.NORMAL}
      keymode={Astal.Keymode.ON_DEMAND}
      layer={Astal.Layer.TOP}
      contentHalign={Gtk.Align.END}
      contentValign={Gtk.Align.START}
      onClose={closeNotifCenter}
    >
      <box class="NotifCenterPanel" orientation={Gtk.Orientation.VERTICAL} spacing={0}>
        <box class="NotifCenterHeader" spacing={8}>
          <label
            class="NotifCenterTitle"
            label="NOTIFICATIONS"
            hexpand
            halign={Gtk.Align.START}
          />
          <button
            class={notifications.dnd((d) => d ? "NotifDndBtn NotifDndOn" : "NotifDndBtn")}
            onClicked={() => notifications.setDnd(!notifications.dnd())}
            valign={Gtk.Align.CENTER}
          >
            <label label={notifications.dnd((d) => d ? "DND ON" : "DND")} />
          </button>
          <button
            class="NotifCenterClearBtn"
            onClicked={() => notifications.clear()}
          >
            <label label="CLEAR ALL" />
          </button>
        </box>
        <Gtk.ScrolledWindow
          class="NotifCenterScroll"
          hscrollbarPolicy={Gtk.PolicyType.NEVER}
          vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
          vexpand
          minContentHeight={200}
          maxContentHeight={500}
        >
          <box orientation={Gtk.Orientation.VERTICAL} spacing={4} class="NotifCenterList">
            <label
              class="NotifCenterEmpty"
              label={emptyLabel}
              visible={hasEmpty}
            />
            {fixedSlots(MAX_HISTORY).map((i) => {
              const item = createMemo(() => notifications.all()[i] ?? null)
              const cardVisible = createMemo(() => item() != null)
              const urgency = createMemo(() => item()?.urgency ?? 1)
              const appName = createMemo(() => item()?.appName ?? "")
              const summary = createMemo(() => item()?.summary ?? "")
              const body = createMemo(() => item()?.body ?? "")
              const time = createMemo(() => {
                const n = item()
                return n ? timeAgo(n.time) : ""
              })
              const hasBody = createMemo(() => (item()?.body ?? "").length > 0)

              return (
                <NotificationCard
                  variant="history"
                  visible={cardVisible}
                  urgency={urgency}
                  appName={appName}
                  time={time}
                  summary={summary}
                  body={body}
                  bodyVisible={hasBody}
                  onClicked={() => {
                    const n = item()
                    if (n) notifications.dismiss(n.id)
                  }}
                />
              )
            })}
          </box>
        </Gtk.ScrolledWindow>
      </box>
    </PopupShell>
  )
}
