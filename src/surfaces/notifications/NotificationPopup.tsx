import GLib from "gi://GLib?version=2.0"

import app from "ags/gtk4/app"
import { Astal, Gdk, Gtk } from "ags/gtk4"
import { createMemo } from "gnim"

import type { NotificationSource } from "../../runtime/notification-source.ts"

const MAX_POPUPS = 3
const TIMER_BAR_HEIGHT = 3
const TICK_MS = 30

export interface NotificationPopupProps {
  gdkmonitor: Gdk.Monitor
  monitorIndex: number
  notifications: NotificationSource
}

function urgencyClass(urgency: number): string {
  if (urgency === 2) return "NotifCard NotifCritical"
  if (urgency === 0) return "NotifCard NotifLow"
  return "NotifCard"
}

function urgencyColor(urgency: number): [number, number, number] {
  if (urgency === 2) return [255 / 255, 34 / 255, 102 / 255]
  if (urgency === 0) return [138 / 255, 149 / 255, 179 / 255]
  return [122 / 255, 162 / 255, 247 / 255]
}

function timeAgo(epoch: number): string {
  const diff = Math.floor(Date.now() / 1000 - epoch)
  if (diff < 60) return "now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  return `${Math.floor(diff / 3600)}h`
}

export default function NotificationPopup(props: NotificationPopupProps) {
  const { TOP, RIGHT } = Astal.WindowAnchor
  const { notifications } = props

  const drawingAreas: (Gtk.DrawingArea | null)[] = new Array(MAX_POPUPS).fill(null)
  let windowRef: any = null

  GLib.timeout_add(GLib.PRIORITY_DEFAULT, TICK_MS, () => {
    for (let i = 0; i < MAX_POPUPS; i++) {
      if (drawingAreas[i]) drawingAreas[i]!.queue_draw()
    }
    if (windowRef) {
      const hasPopups = notifications.popups().length > 0
      if (windowRef.visible !== hasPopups) {
        windowRef.visible = hasPopups
        if (hasPopups) windowRef.present()
      }
    }
    return GLib.SOURCE_CONTINUE
  })

  return (
    <window
      name={`notifications:${props.monitorIndex}`}
      class="NotifPopupWindow"
      visible={false}
      application={app}
      gdkmonitor={props.gdkmonitor}
      anchor={TOP | RIGHT}
      exclusivity={Astal.Exclusivity.NORMAL}
      layer={Astal.Layer.OVERLAY}
      onRealize={(self: any) => { windowRef = self }}
    >
      <box
        orientation={Gtk.Orientation.VERTICAL}
        spacing={6}
        valign={Gtk.Align.START}
        class="NotifPopupList"
      >
        {Array.from({ length: MAX_POPUPS }).map((_, i) => {
          const item = createMemo(() => notifications.popups()[i] ?? null)
          const cardVisible = createMemo(() => item() != null)
          const cardClass = createMemo(() => urgencyClass(item()?.urgency ?? 1))
          const appName = createMemo(() => item()?.appName ?? "")
          const summary = createMemo(() => item()?.summary ?? "")
          const body = createMemo(() => item()?.body ?? "")
          const time = createMemo(() => {
            const n = item()
            return n ? timeAgo(n.time) : ""
          })
          const hasBody = createMemo(() => (item()?.body ?? "").length > 0)
          const iconName = createMemo(() => {
            const n = item()
            return n && !n.isIconPath ? n.resolvedIcon : ""
          })
          const iconFile = createMemo(() => {
            const n = item()
            return n && n.isIconPath ? n.resolvedIcon : ""
          })
          const hasIconName = createMemo(() => (iconName() ?? "").length > 0)
          const hasIconFile = createMemo(() => (iconFile() ?? "").length > 0)

          return (
            <button
              class={cardClass}
              visible={cardVisible}
              onClicked={() => {
                const n = item()
                if (n) notifications.dismiss(n.id)
              }}
            >
              <box orientation={Gtk.Orientation.VERTICAL} spacing={4} widthRequest={320}>
                <box spacing={10}>
                  <image
                    class="NotifIcon"
                    iconName={iconName}
                    pixelSize={28}
                    visible={hasIconName}
                    valign={Gtk.Align.START}
                  />
                  <image
                    class="NotifIcon"
                    file={iconFile}
                    pixelSize={28}
                    visible={hasIconFile}
                    valign={Gtk.Align.START}
                  />
                  <box orientation={Gtk.Orientation.VERTICAL} spacing={2} hexpand>
                    <box spacing={8}>
                      <label class="NotifAppName" label={appName} hexpand halign={Gtk.Align.START} />
                      <label class="NotifTime" label={time} halign={Gtk.Align.END} />
                    </box>
                    <label
                      class="NotifSummary"
                      label={summary}
                      halign={Gtk.Align.START}
                      maxWidthChars={36}
                      ellipsize={3}
                    />
                    <label
                      class="NotifBody"
                      label={body}
                      visible={hasBody}
                      halign={Gtk.Align.START}
                      maxWidthChars={36}
                      ellipsize={3}
                      wrap
                    />
                  </box>
                </box>
                <Gtk.DrawingArea
                  heightRequest={TIMER_BAR_HEIGHT}
                  hexpand
                  onRealize={(self: Gtk.DrawingArea) => {
                    drawingAreas[i] = self
                    self.set_draw_func((_area, cr, w, _h) => {
                      const n = item()
                      if (!n) return
                      const startTime = notifications.popupTimestamps.get(n.id)
                      if (!startTime) return
                      const elapsed = Date.now() - startTime
                      const ratio = Math.max(0, 1 - elapsed / notifications.popupTimeoutMs)
                      const [r, g, b] = urgencyColor(n.urgency)
                      cr.setSourceRGBA(r, g, b, 0.7)
                      cr.rectangle(0, 0, w * ratio, TIMER_BAR_HEIGHT)
                      cr.fill()
                    })
                  }}
                />
              </box>
            </button>
          )
        })}
      </box>
    </window>
  )
}
