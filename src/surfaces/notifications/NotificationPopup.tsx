import GLib from "gi://GLib?version=2.0"

import app from "ags/gtk4/app"
import { Astal, Gdk, Gtk } from "ags/gtk4"
import { createMemo, onCleanup } from "gnim"

import type { NotificationSource } from "../../runtime/notification-source.ts"
import { timeAgo } from "../../shared/format.ts"
import { scopedTimeoutWhile } from "../../shared/runtime/scoped-timeout.ts"
import { COLORS } from "../../shared/theme-tokens.ts"
import NotificationCard from "../../shared/ui/NotificationCard.tsx"

const MAX_POPUPS = 3
const TIMER_BAR_HEIGHT = 3
const TICK_MS = 30
const URGENCY_CRITICAL = COLORS.rgb["colors-critical"]
const URGENCY_LOW = COLORS.rgb["colors-muted"]
const URGENCY_NORMAL = COLORS.rgb["colors-accent"]

export interface NotificationPopupProps {
  gdkmonitor: Gdk.Monitor
  monitor: string
  notifications: NotificationSource
}

function urgencyColor(urgency: number): readonly [number, number, number] {
  if (urgency === 2) return URGENCY_CRITICAL
  if (urgency === 0) return URGENCY_LOW
  return URGENCY_NORMAL
}

export default function NotificationPopup(props: NotificationPopupProps) {
  const { TOP, RIGHT } = Astal.WindowAnchor
  const { notifications } = props

  const drawingAreas: (Gtk.DrawingArea | null)[] = new Array(MAX_POPUPS).fill(null)
  let windowRef: any = null

  const hasPopups = createMemo(() => notifications.popups().length > 0)

  // 可視状態はイベント駆動で同期し、タイマーバー再描画の tick は
  // ポップアップ表示中だけ回す (非表示時の常時 30ms tick を排除)。
  const syncVisibility = () => {
    if (!windowRef) return
    const show = hasPopups()
    if (windowRef.visible !== show) {
      windowRef.visible = show
      if (show) windowRef.present()
    }
  }
  onCleanup(hasPopups.subscribe(syncVisibility))

  scopedTimeoutWhile(GLib.PRIORITY_DEFAULT, TICK_MS, hasPopups, () => {
    for (let i = 0; i < MAX_POPUPS; i++) {
      if (drawingAreas[i]) drawingAreas[i]!.queue_draw()
    }
  }, `NotificationPopup:${props.monitor}`)

  return (
    <window
      name={`notifications:${props.monitor}`}
      class="NotifPopupWindow"
      visible={false}
      application={app}
      gdkmonitor={props.gdkmonitor}
      anchor={TOP | RIGHT}
      exclusivity={Astal.Exclusivity.NORMAL}
      // キーボードを絶対に取らない。ON_DEMAND だと表示された瞬間に
      // フォーカスが移り、IME の preedit (日本語入力途中の文字列) が
      // 切断される。カードはポインタ操作のみで dismiss できる。
      keymode={Astal.Keymode.NONE}
      layer={Astal.Layer.OVERLAY}
      // onRealize は一度も表示されない window では発火せず windowRef が
      // null のままポップアップが永遠に出ない。$ (構築時 setup) で取る。
      $={(self: Astal.Window) => { windowRef = self }}
    >
      {/* 右上アンカーの小窓。全画面アンカー + バックドロップだと
          表示中の最初のクリックを画面のどこでも食ってしまうため廃止 */}
      <box
        orientation={Gtk.Orientation.VERTICAL}
        spacing={6}
        class="NotifPopupList"
      >
        {Array.from({ length: MAX_POPUPS }).map((_, i) => {
            const item = createMemo(() => notifications.popups()[i] ?? null)
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
            const iconName = createMemo(() => {
              const n = item()
              return n && !n.isIconPath ? n.resolvedIcon : ""
            })
            const hasIconName = createMemo(() => (iconName() ?? "").length > 0)

            return (
              <NotificationCard
                variant="popup"
                visible={cardVisible}
                urgency={urgency}
                appName={appName}
                time={time}
                summary={summary}
                body={body}
                bodyVisible={hasBody}
                iconName={iconName}
                iconVisible={hasIconName}
                widthRequest={340}
                timerHeight={TIMER_BAR_HEIGHT}
                onClicked={() => {
                  const n = item()
                  if (n) notifications.dismiss(n.id)
                }}
                onTimerRealize={(self: Gtk.DrawingArea) => {
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
            )
          })}
        </box>
    </window>
  )
}
