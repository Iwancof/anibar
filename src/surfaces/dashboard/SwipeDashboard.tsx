import app from "ags/gtk4/app"
import { Astal, Gdk, Gtk } from "ags/gtk4"
import { createMemo, type Accessor } from "gnim"

import { estimateBatteryMinutes, type BatterySnapshot } from "../../modules/battery/domain.ts"
import type { NotificationSource, NotificationItem } from "../../runtime/notification-source.ts"
import type { PlayerSource } from "../../runtime/player-source.ts"
import { formatDurationMinutes, timeAgo } from "../../shared/format.ts"
import Icon from "../../shared/ui/Icon.tsx"
import NotificationCard from "../../shared/ui/NotificationCard.tsx"
import PlayerControls from "../../shared/ui/PlayerControls.tsx"
import SectionHeader from "../../shared/ui/SectionHeader.tsx"
import { ICONS } from "../../shared/ui/icons.ts"

// ── Props ──────────────────────────────────

export interface SwipeDashboardProps {
  gdkmonitor: Gdk.Monitor
  monitor: string
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
    const mins = estimateBatteryMinutes(s)
    return mins == null ? "" : `${formatDurationMinutes(mins)} remaining`
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
      <SectionHeader label="BATTERY" />
      <label class="SwipeDashSectionBody" label={label} halign={Gtk.Align.START} />
      <label class="SwipeDashSectionMeta" label={eta} halign={Gtk.Align.START} />
    </box>
  )
}

// ── Notification section ───────────────────

const MAX_NOTIF = 3

function NotificationSection(props: { notifications: NotificationSource }) {
  const { notifications } = props
  const countLabel = createMemo(() => {
    const n = notifications.all().length
    return n === 0 ? "No notifications" : `${n} total`
  })

  return (
    <box class="SwipeDashSection" orientation={Gtk.Orientation.VERTICAL} spacing={6}>
      <SectionHeader label="NOTIFICATIONS" meta={countLabel} />
      {Array.from({ length: MAX_NOTIF }).map((_, i) => {
        const item = createMemo((): NotificationItem | null => notifications.all()[i] ?? null)
        const visible = createMemo(() => item() != null)
        const urgency = createMemo(() => item()?.urgency ?? 1)
        const appName = createMemo(() => item()?.appName ?? "")
        const summary = createMemo(() => item()?.summary ?? "")
        const time = createMemo(() => {
          const n = item()
          return n ? timeAgo(n.time) : ""
        })

        return (
          <NotificationCard
            variant="mini"
            visible={visible}
            urgency={urgency}
            appName={appName}
            time={time}
            summary={summary}
          />
        )
      })}
    </box>
  )
}

// ── Player section ─────────────────────────

function PlayerSection(props: { player: PlayerSource }) {
  const { player } = props
  const visible = createMemo(() => player.snapshot() != null)
  const statusText = createMemo(() => {
    const s = player.snapshot()
    return s ? s.status : ""
  })

  return (
    <box class="SwipeDashSection" orientation={Gtk.Orientation.VERTICAL} spacing={6} visible={visible}>
      <SectionHeader label="NOW PLAYING" />
      <label
        class="SwipeDashPlayerTrack"
        label={player.label}
        halign={Gtk.Align.START}
        maxWidthChars={36}
        ellipsize={3}
      />
      <box spacing={6}>
        <label class="SwipeDashSectionMeta" label={statusText} hexpand halign={Gtk.Align.START} />
        <PlayerControls
          isPlaying={player.isPlaying}
          onPrevious={() => player.previous()}
          onPlayPause={() => player.playPause()}
          onNext={() => player.next()}
        />
      </box>
    </box>
  )
}

// ── Window ─────────────────────────────────

export default function SwipeDashboard(props: SwipeDashboardProps) {
  const { TOP, LEFT, RIGHT, BOTTOM } = Astal.WindowAnchor

  return (
    <window
      name={`swipe-dashboard:${props.monitor}`}
      class="SwipeDash"
      visible={false}
      application={app}
      gdkmonitor={props.gdkmonitor}
      anchor={TOP | LEFT | RIGHT | BOTTOM}
      exclusivity={Astal.Exclusivity.IGNORE}
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
                <Icon icon={ICONS.close} />
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
