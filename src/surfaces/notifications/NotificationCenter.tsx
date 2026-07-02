import app from "ags/gtk4/app"
import { Astal, Gdk, Gtk } from "ags/gtk4"
import { createMemo } from "gnim"

import type { NotificationSource } from "../../runtime/notification-source.ts"
import { closeNotifCenter } from "../../app/notification-controller.ts"

const MAX_HISTORY = 20

// DND toggle は通知センターヘッダーに配置

export interface NotificationCenterProps {
  gdkmonitor: Gdk.Monitor
  monitor: string
  notifications: NotificationSource
}

function timeAgo(epoch: number): string {
  const diff = Math.floor(Date.now() / 1000 - epoch)
  if (diff < 60) return "now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function urgencyBorder(urgency: number): string {
  if (urgency === 2) return "NotifHistoryCard NotifHistoryCritical"
  if (urgency === 0) return "NotifHistoryCard NotifHistoryLow"
  return "NotifHistoryCard"
}

export default function NotificationCenter(props: NotificationCenterProps) {
  const { TOP, LEFT, RIGHT, BOTTOM } = Astal.WindowAnchor
  const { notifications } = props

  const emptyLabel = createMemo(() =>
    notifications.all().length === 0 ? "No notifications" : "",
  )
  const hasEmpty = createMemo(() => notifications.all().length === 0)

  return (
    <window
      name={`notif-center:${props.monitor}`}
      class="NotifCenter"
      visible={false}
      application={app}
      gdkmonitor={props.gdkmonitor}
      anchor={TOP | LEFT | RIGHT | BOTTOM}
      exclusivity={Astal.Exclusivity.NORMAL}
      keymode={Astal.Keymode.ON_DEMAND}
      layer={Astal.Layer.TOP}
      onRealize={(self: any) => {
        const keyCtrl = new Gtk.EventControllerKey()
        keyCtrl.connect("key-pressed", (_ctrl: any, keyval: number) => {
          if (keyval === Gdk.KEY_Escape) {
            closeNotifCenter()
            return true
          }
          return false
        })
        self.add_controller(keyCtrl)
      }}
    >
      <overlay>
        <button class="NotifCenterBackdrop" hexpand vexpand onClicked={closeNotifCenter} />
        <box
          $type="overlay"
          halign={Gtk.Align.END}
          valign={Gtk.Align.START}
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
                <label label="Clear all" />
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
                {Array.from({ length: MAX_HISTORY }).map((_, i) => {
                  const item = createMemo(() => notifications.all()[i] ?? null)
                  const cardVisible = createMemo(() => item() != null)
                  const cardClass = createMemo(() => urgencyBorder(item()?.urgency ?? 1))
                  const appName = createMemo(() => item()?.appName ?? "")
                  const summary = createMemo(() => item()?.summary ?? "")
                  const body = createMemo(() => item()?.body ?? "")
                  const time = createMemo(() => {
                    const n = item()
                    return n ? timeAgo(n.time) : ""
                  })
                  const hasBody = createMemo(() => (item()?.body ?? "").length > 0)

                  return (
                    <button
                      class={cardClass}
                      visible={cardVisible}
                      onClicked={() => {
                        const n = item()
                        if (n) notifications.dismiss(n.id)
                      }}
                    >
                      <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                        <box spacing={8}>
                          <label class="NotifHistoryApp" label={appName} hexpand halign={Gtk.Align.START} />
                          <label class="NotifHistoryTime" label={time} halign={Gtk.Align.END} />
                        </box>
                        <label
                          class="NotifHistorySummary"
                          label={summary}
                          halign={Gtk.Align.START}
                          maxWidthChars={45}
                          ellipsize={3}
                        />
                        <label
                          class="NotifHistoryBody"
                          label={body}
                          visible={hasBody}
                          halign={Gtk.Align.START}
                          maxWidthChars={45}
                          ellipsize={3}
                        />
                      </box>
                    </button>
                  )
                })}
              </box>
            </Gtk.ScrolledWindow>
          </box>
        </box>
      </overlay>
    </window>
  )
}
