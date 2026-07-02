import { Astal, Gdk, Gtk } from "ags/gtk4"
import { createMemo, type Accessor } from "gnim"

import { batteryTone, estimateBatteryMinutes, type BatterySnapshot } from "../../modules/battery/domain.ts"
import type { NotificationSource, NotificationItem } from "../../runtime/notification-source.ts"
import type { PlayerSource } from "../../runtime/player-source.ts"
import { DIM } from "../../shared/theme-tokens.ts"
import { formatDurationMinutes, placeholder, timeAgo } from "../../shared/format.ts"
import Icon from "../../shared/ui/Icon.tsx"
import NotificationCard from "../../shared/ui/NotificationCard.tsx"
import PanelHeader from "../../shared/ui/PanelHeader.tsx"
import PlayerControls from "../../shared/ui/PlayerControls.tsx"
import PopupShell from "../../shared/ui/PopupShell.tsx"
import SectionHeader from "../../shared/ui/SectionHeader.tsx"
import StatTile, { type StatTileTone } from "../../shared/ui/StatTile.tsx"
import ToggleRow from "../../shared/ui/ToggleRow.tsx"
import { ICONS } from "../../shared/ui/icons.ts"

// ── Props ──────────────────────────────────

export interface SwipeDashboardProps {
  gdkmonitor: Gdk.Monitor
  monitor: string
  batterySnapshot: Accessor<BatterySnapshot | null>
  notifications: NotificationSource
  player: PlayerSource
  pwsaveAllEnabled: Accessor<boolean>
  onToggleAllPowerSave: (active: boolean) => void
  onClose: () => void
}

// ── Battery section ────────────────────────

function tileTone(snapshot: BatterySnapshot | null): StatTileTone {
  switch (batteryTone(snapshot)) {
    case "healthy":
      return snapshot?.state === "charging" ? "charge" : "good"
    case "warning":
      return "warn"
    case "critical":
      return "crit"
    case "muted":
      return "muted"
  }
}

function formatDrawWatts(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—"
  const digits = Math.abs(value) >= 10 ? 0 : 1
  return value.toFixed(digits)
}

function BatterySection(props: { snapshot: Accessor<BatterySnapshot | null> }) {
  const percent = createMemo(() => {
    const s = props.snapshot()
    return s && s.present ? `${Math.round(s.percent)}` : "—"
  })

  const timeLeft = createMemo(() => {
    const s = props.snapshot()
    if (!s || !s.present) return "—"
    const mins = estimateBatteryMinutes(s)
    return mins == null || !Number.isFinite(mins) || mins <= 0
      ? placeholder(null)
      : formatDurationMinutes(mins)
  })

  const draw = createMemo(() => formatDrawWatts(props.snapshot()?.powerNowW))
  const drawVisible = createMemo(() => props.snapshot()?.powerNowW != null)
  const tone = createMemo(() => tileTone(props.snapshot()))

  return (
    <box class="GlanceSection" orientation={Gtk.Orientation.VERTICAL} spacing={8}>
      <SectionHeader label="POWER" />
      <box class="SwipeDashStatRow" spacing={8}>
        <StatTile label="BAT" value={percent} unit="%" tone={tone} />
        <StatTile label="TIME LEFT" value={timeLeft} tone="normal" />
        <box visible={drawVisible} hexpand>
          <StatTile label="DRAW" value={draw} unit="W" tone="normal" />
        </box>
      </box>
    </box>
  )
}

// ── Media section ──────────────────────────

function MediaSection(props: { player: PlayerSource }) {
  const { player } = props
  const active = createMemo(() => player.snapshot() != null)
  const idle = createMemo(() => !active())

  return (
    <box class="GlanceSection" orientation={Gtk.Orientation.VERTICAL} spacing={8}>
      <SectionHeader label="MEDIA" />
      <box class="SwipeDashMediaRow" spacing={8} visible={active}>
        <label
          class="SwipeDashMediaTrack"
          label={player.label}
          halign={Gtk.Align.START}
          hexpand
          maxWidthChars={30}
          ellipsize={3}
        />
        <PlayerControls
          isPlaying={player.isPlaying}
          onPrevious={() => player.previous()}
          onPlayPause={() => player.playPause()}
          onNext={() => player.next()}
        />
      </box>
      <label
        class="SwipeDashEmptyRow"
        label="MEDIA::IDLE"
        visible={idle}
        halign={Gtk.Align.FILL}
      />
    </box>
  )
}

// ── Notification section ───────────────────

const MAX_NOTIF = 5

function NotificationSection(props: { notifications: NotificationSource }) {
  const { notifications } = props
  const emptyVisible = createMemo(() => notifications.all().length === 0)

  return (
    <box class="GlanceSection" orientation={Gtk.Orientation.VERTICAL} spacing={8}>
      <SectionHeader label="NOTIFICATIONS" />
      {Array.from({ length: MAX_NOTIF }).map((_, i) => {
        const item = createMemo((): NotificationItem | null => notifications.all()[i] ?? null)
        const visible = createMemo(() => item() != null)
        const urgency = createMemo(() => item()?.urgency ?? 1)
        const appName = createMemo(() => item()?.appName ?? "")
        const summary = createMemo(() => item()?.summary ?? "")
        const body = createMemo(() => item()?.body ?? "")
        const bodyVisible = createMemo(() => (item()?.body ?? "").length > 0)
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
            body={body}
            bodyVisible={bodyVisible}
          />
        )
      })}
      <label
        class="SwipeDashEmptyRow"
        label="NO HISTORY"
        visible={emptyVisible}
        halign={Gtk.Align.FILL}
      />
    </box>
  )
}

// ── Quick section ──────────────────────────

function QuickSection(props: {
  notifications: NotificationSource
  pwsaveAllEnabled: Accessor<boolean>
  onToggleAllPowerSave: (active: boolean) => void
}) {
  return (
    <box class="GlanceSection" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
      <SectionHeader label="QUICK" />
      <ToggleRow
        label="DND"
        subLabel="NOTIF::MUTE"
        active={props.notifications.dnd}
        onToggle={props.notifications.setDnd}
      />
      <ToggleRow
        label="ALL POWER SAVE"
        subLabel="PWSAVE::ALL"
        active={props.pwsaveAllEnabled}
        onToggle={props.onToggleAllPowerSave}
      />
    </box>
  )
}

// ── Window ─────────────────────────────────

export default function SwipeDashboard(props: SwipeDashboardProps) {
  return (
    <PopupShell
      name={`swipe-dashboard:${props.monitor}`}
      windowClass="SwipeDash"
      gdkmonitor={props.gdkmonitor}
      exclusivity={Astal.Exclusivity.IGNORE}
      keymode={Astal.Keymode.ON_DEMAND}
      layer={Astal.Layer.OVERLAY}
      contentHalign={Gtk.Align.END}
      contentValign={Gtk.Align.FILL}
      onClose={props.onClose}
    >
      <box
        class="SwipeDashPanel"
        orientation={Gtk.Orientation.VERTICAL}
        widthRequest={DIM["panel-side"]}
      >
        <box class="SwipeDashHeader" spacing={8}>
          <PanelHeader class="SwipeDashPanelHeader" title="SYS::GLANCE" />
          <button class="SwipeDashCloseBtn" onClicked={props.onClose} valign={Gtk.Align.CENTER}>
            <Icon icon={ICONS.close} />
          </button>
        </box>

        <Gtk.ScrolledWindow
          class="SwipeDashScroll"
          hscrollbarPolicy={Gtk.PolicyType.NEVER}
          vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
          vexpand
        >
          <box class="SwipeDashContent" orientation={Gtk.Orientation.VERTICAL} spacing={14}>
            <BatterySection snapshot={props.batterySnapshot} />
            <MediaSection player={props.player} />
            <NotificationSection notifications={props.notifications} />
            <QuickSection
              notifications={props.notifications}
              pwsaveAllEnabled={props.pwsaveAllEnabled}
              onToggleAllPowerSave={props.onToggleAllPowerSave}
            />
          </box>
        </Gtk.ScrolledWindow>
      </box>
    </PopupShell>
  )
}
