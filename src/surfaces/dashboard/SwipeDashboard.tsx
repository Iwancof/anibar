import app from "ags/gtk4/app"
import { Astal, Gdk, Gtk } from "ags/gtk4"
import { createMemo, type Accessor } from "gnim"

import type { BatterySnapshot } from "../../modules/battery/domain.ts"
import type { NotificationSource, NotificationItem } from "../../runtime/notification-source.ts"
import type { PlayerSource } from "../../runtime/player-source.ts"

// ── Props ──────────────────────────────────

export interface SwipeDashboardProps {
  gdkmonitor: Gdk.Monitor
  monitorIndex: number
  batterySnapshot: Accessor<BatterySnapshot | null>
  notifications: NotificationSource
  player: PlayerSource
  onClose: () => void
}

// ── Battery section ────────────────────────

function BatterySection(props: { snapshot: Accessor<BatterySnapshot | null> }) {
  const label = createMemo(() => {
    const s = props.snapshot()
    if (!s || !s.present) return "No battery"
    const pct = `${Math.round(s.percent)}%`
    const state =
      s.state === "charging" ? "Charging"
        : s.state === "discharging" ? "Discharging"
          : s.state === "full" ? "Full"
            : s.state === "not-charging" ? "On AC"
              : "Unknown"
    return `${pct} \u2022 ${state}`
  })

  const eta = createMemo(() => {
    const s = props.snapshot()
    if (!s || !s.present) return ""
    if (s.powerNowW <= 0) return ""
    const hours = (s.state === "charging" && s.energyFullWh != null && s.energyNowWh != null)
      ? (s.energyFullWh - s.energyNowWh) / s.powerNowW
      : (s.state === "discharging" && s.energyNowWh != null)
        ? s.energyNowWh / s.powerNowW
        : 0
    if (hours <= 0) return ""
    const mins = Math.round(hours * 60)
    if (mins < 60) return `${mins}m remaining`
    return `${Math.floor(mins / 60)}h ${mins % 60}m remaining`
  })

  const toneClass = createMemo(() => {
    const s = props.snapshot()
    if (!s || !s.present) return "SwipeDashSection"
    if (s.percent <= 15 && s.state === "discharging") return "SwipeDashSection SwipeDashCritical"
    if (s.percent <= 30 && s.state === "discharging") return "SwipeDashSection SwipeDashWarning"
    return "SwipeDashSection"
  })

  return (
    <box class={toneClass} orientation={Gtk.Orientation.VERTICAL} spacing={4}>
      <label class="SwipeDashSectionTitle" label="BATTERY" halign={Gtk.Align.START} />
      <label class="SwipeDashSectionBody" label={label} halign={Gtk.Align.START} />
      <label class="SwipeDashSectionMeta" label={eta} halign={Gtk.Align.START} />
    </box>
  )
}

// ── Notification section ───────────────────

const MAX_NOTIF = 3

function timeAgo(epoch: number): string {
  const diff = Math.floor(Date.now() / 1000 - epoch)
  if (diff < 60) return "now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function NotificationSection(props: { notifications: NotificationSource }) {
  const { notifications } = props
  const countLabel = createMemo(() => {
    const n = notifications.all().length
    return n === 0 ? "No notifications" : `${n} total`
  })

  return (
    <box class="SwipeDashSection" orientation={Gtk.Orientation.VERTICAL} spacing={6}>
      <box spacing={4}>
        <label class="SwipeDashSectionTitle" label="NOTIFICATIONS" hexpand halign={Gtk.Align.START} />
        <label class="SwipeDashSectionMeta" label={countLabel} halign={Gtk.Align.END} />
      </box>
      {Array.from({ length: MAX_NOTIF }).map((_, i) => {
        const item = createMemo((): NotificationItem | null => notifications.all()[i] ?? null)
        const visible = createMemo(() => item() != null)
        const appName = createMemo(() => item()?.appName ?? "")
        const summary = createMemo(() => item()?.summary ?? "")
        const time = createMemo(() => {
          const n = item()
          return n ? timeAgo(n.time) : ""
        })

        return (
          <box class="SwipeDashNotif" visible={visible} orientation={Gtk.Orientation.VERTICAL} spacing={2}>
            <box spacing={4}>
              <label class="SwipeDashNotifApp" label={appName} hexpand halign={Gtk.Align.START} />
              <label class="SwipeDashNotifTime" label={time} halign={Gtk.Align.END} />
            </box>
            <label
              class="SwipeDashNotifSummary"
              label={summary}
              halign={Gtk.Align.START}
              maxWidthChars={40}
              ellipsize={3}
            />
          </box>
        )
      })}
    </box>
  )
}

// ── Player section ─────────────────────────

function PlayerSection(props: { player: PlayerSource }) {
  const { player } = props
  const visible = createMemo(() => player.snapshot() != null)
  const statusIcon = player.isPlaying((p) => (p ? "\u23F8" : "\u25B6"))
  const statusText = createMemo(() => {
    const s = player.snapshot()
    return s ? s.status : ""
  })

  return (
    <box class="SwipeDashSection" orientation={Gtk.Orientation.VERTICAL} spacing={6} visible={visible}>
      <label class="SwipeDashSectionTitle" label="NOW PLAYING" halign={Gtk.Align.START} />
      <label
        class="SwipeDashPlayerTrack"
        label={player.label}
        halign={Gtk.Align.START}
        maxWidthChars={36}
        ellipsize={3}
      />
      <box spacing={6}>
        <label class="SwipeDashSectionMeta" label={statusText} hexpand halign={Gtk.Align.START} />
        <button class="SwipeDashPlayerBtn" onClicked={() => player.previous()}>
          <label label={"\u23EE"} />
        </button>
        <button class="SwipeDashPlayerBtn" onClicked={() => player.playPause()}>
          <label label={statusIcon} />
        </button>
        <button class="SwipeDashPlayerBtn" onClicked={() => player.next()}>
          <label label={"\u23ED"} />
        </button>
      </box>
    </box>
  )
}

// ── Window ─────────────────────────────────

export default function SwipeDashboard(props: SwipeDashboardProps) {
  const { TOP, RIGHT, BOTTOM } = Astal.WindowAnchor

  return (
    <window
      name={`swipe-dashboard:${props.monitorIndex}`}
      class="SwipeDash"
      visible={false}
      application={app}
      gdkmonitor={props.gdkmonitor}
      anchor={TOP | RIGHT | BOTTOM}
      exclusivity={Astal.Exclusivity.NORMAL}
      keymode={Astal.Keymode.ON_DEMAND}
      layer={Astal.Layer.OVERLAY}
      onRealize={(self: any) => {
        const keyCtrl = new Gtk.EventControllerKey()
        keyCtrl.connect("key-pressed", (_ctrl: any, keyval: number) => {
          if (keyval === Gdk.KEY_Escape) {
            props.onClose()
            return true
          }
          return false
        })
        self.add_controller(keyCtrl)
      }}
    >
      <overlay>
        <button class="SwipeDashBackdrop" hexpand vexpand onClicked={props.onClose} />
        <box
          $type="overlay"
          halign={Gtk.Align.END}
          valign={Gtk.Align.FILL}
        >
          <box class="SwipeDashPanel" orientation={Gtk.Orientation.VERTICAL} spacing={12}>
            <box class="SwipeDashHeader" spacing={8}>
              <label class="SwipeDashTitle" label="Dashboard" hexpand halign={Gtk.Align.START} />
              <button class="SwipeDashCloseBtn" onClicked={props.onClose}>
                <label label="\u2715" />
              </button>
            </box>

            <Gtk.ScrolledWindow
              class="SwipeDashScroll"
              hscrollbarPolicy={Gtk.PolicyType.NEVER}
              vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
              vexpand
            >
              <box orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                <BatterySection snapshot={props.batterySnapshot} />
                <NotificationSection notifications={props.notifications} />
                <PlayerSection player={props.player} />
              </box>
            </Gtk.ScrolledWindow>
          </box>
        </box>
      </overlay>
    </window>
  )
}
