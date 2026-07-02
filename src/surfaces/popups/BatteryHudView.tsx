import { Gtk } from "ags/gtk4"
import { createState } from "gnim"
import type { Accessor } from "gnim"
import {
  estimateBatteryMinutes,
  batteryTone,
  batteryHealthPercent,
  isOnAC,
  type BatterySnapshot,
} from "../../modules/battery/domain.ts"
import type { SystemStatsSnapshot } from "../../modules/system-stats/domain.ts"
import {
  MEASURE_NAMES,
  LID_ACTIONS,
  LID_ACTION_LABELS,
  isMeasureEnabled,
  isAllEnabled,
  type PwsaveStatus,
  type MeasureName,
  type LidAction,
} from "../../modules/power-save/domain.ts"
import { formatDurationMinutes, formatWatts } from "../../shared/format.ts"
import PanelHeader from "../../shared/ui/PanelHeader.tsx"
import SectionHeader from "../../shared/ui/SectionHeader.tsx"
import StatTile, { type StatTileTone } from "../../shared/ui/StatTile.tsx"
import ToggleRow from "../../shared/ui/ToggleRow.tsx"
import { ICONS } from "../../shared/ui/icons.ts"

export interface BatteryHudViewProps {
  snapshot: Accessor<BatterySnapshot | null>
  systemStats: Accessor<SystemStatsSnapshot | null>
  pwsaveStatus: Accessor<PwsaveStatus | null>
  lidAction: Accessor<LidAction>
  onToggleMeasure: (name: MeasureName, enable: boolean) => void
  onToggleAll: (enable: boolean) => void
  onSetLidAction: (action: LidAction) => void
}

const SEGMENTS = 10
type HudTone = "normal" | "charge" | "warning" | "critical"

function hudTone(snapshot: BatterySnapshot | null): HudTone {
  if (!snapshot || !snapshot.present) return "normal"
  if (isOnAC(snapshot)) return "charge"
  const tone = batteryTone(snapshot)
  if (tone === "critical") return "critical"
  if (tone === "warning") return "warning"
  return "normal"
}

function segmentClass(
  i: number,
  filledCount: number,
  tone: HudTone,
): string {
  if (i >= filledCount) return "HudSeg HudSegEmpty"
  if (tone === "critical") return "HudSeg HudSegCrit"
  if (tone === "warning") return "HudSeg HudSegWarn"
  return tone === "charge" ? "HudSeg HudSegCharge" : "HudSeg HudSegOk"
}

const MEASURE_META: Record<MeasureName, { label: string; sub: string }> = {
  ppd: { label: "Power Profile", sub: "PPD" },
  brightness: { label: "Brightness", sub: "LUX" },
  boost: { label: "Turbo Boost", sub: "CPU::TURBO" },
  cores: { label: "Limit Cores", sub: "CPU::CORES" },
  gpu: { label: "GPU Low Power", sub: "GPU::DPM" },
  wifi: { label: "Wi-Fi Save", sub: "NET::PWR" },
}

export default function BatteryHudView(props: BatteryHudViewProps) {
  const headerRight = props.snapshot((s) =>
    !s || !s.present ? "—" : isOnAC(s) ? "AC::IN" : "BATTERY",
  )

  const dotClass = props.snapshot((s) => {
    if (!s || !s.present) return "UiPanelHeaderDot"
    const tone = hudTone(s)
    if (tone === "charge") return "UiPanelHeaderDot UiPanelHeaderDotCharge"
    if (tone === "critical") return "UiPanelHeaderDot UiPanelHeaderDotCrit"
    if (tone === "warning") return "UiPanelHeaderDot UiPanelHeaderDotWarn"
    return "UiPanelHeaderDot UiPanelHeaderDotNormal"
  })

  const percentText = props.snapshot((s) =>
    !s || !s.present ? "—" : `${Math.round(s.percent)}`,
  )

  const percentClass = props.snapshot((s) => {
    if (!s || !s.present) return "HudPercent"
    const tone = hudTone(s)
    if (tone === "critical") return "HudPercent HudPercentCrit"
    if (tone === "warning") return "HudPercent HudPercentWarn"
    if (tone === "charge") return "HudPercent HudPercentCharge"
    return "HudPercent HudPercentNormal"
  })

  const segState = props.snapshot((s) => ({
    filled: !s || !s.present ? 0 : Math.round((s.percent / 100) * SEGMENTS),
    tone: hudTone(s),
  }))

  const timeLeft = props.snapshot((s) => {
    if (!s || !s.present) return "—"
    const mins = estimateBatteryMinutes(s)
    if (mins == null) return "—"
    return (s.state === "charging" ? "~" : "") + formatDurationMinutes(mins)
  })

  const draw = props.snapshot((s) => {
    if (!s || !s.present || s.powerNowW == null) return "—"
    const prefix = isOnAC(s) ? "+" : ""
    return prefix + formatWatts(s.powerNowW)
  })

  const drawTone = props.snapshot((s): StatTileTone =>
    isOnAC(s) ? "charge" : "warn",
  )

  const health = props.snapshot((s) => {
    if (!s || !s.present) return "—"
    const h = batteryHealthPercent(s)
    return h != null ? `${h}%` : "—"
  })

  const cpuText = props.systemStats((s) =>
    s != null ? `${s.cpuPercent}%` : "—",
  )

  const cpuTone = props.systemStats((s): StatTileTone => {
    if (!s) return "info"
    if (s.cpuPercent > 80) return "crit"
    if (s.cpuPercent > 50) return "warn"
    return "info"
  })

  const energyLabel = props.snapshot((s) => {
    if (!s || !s.present || s.energyNowWh == null || s.energyFullWh == null) return "—"
    return `${s.energyNowWh.toFixed(1)} / ${s.energyFullWh.toFixed(1)} Wh`
  })

  const cycles = props.snapshot((s) =>
    s?.cycleCount != null ? `${s.cycleCount} cycles` : "",
  )

  const proc0 = props.systemStats((s) => s?.topProcesses[0] ?? null)
  const proc1 = props.systemStats((s) => s?.topProcesses[1] ?? null)
  const proc2 = props.systemStats((s) => s?.topProcesses[2] ?? null)

  // ── Pull-down state ──
  const [menuOpen, setMenuOpen] = createState(false)

  const lidLabel = props.lidAction((a) => LID_ACTION_LABELS[a])
  const triggerClass = menuOpen((open) =>
    open ? "HudPulldownTrigger HudPulldownTriggerOpen" : "HudPulldownTrigger",
  )

  function selectLidAction(action: LidAction) {
    props.onSetLidAction(action)
    setMenuOpen(false)
  }

  const allEnabled = props.pwsaveStatus((s) => s != null ? isAllEnabled(s) : false)

  return (
    <box class="Hud" orientation={Gtk.Orientation.VERTICAL} spacing={0}>
      <PanelHeader title="POWER::SYSTEM" meta={headerRight} dotClass={dotClass} />

      {/* ── Main content ── */}
      <box class="HudBody" orientation={Gtk.Orientation.VERTICAL} spacing={12}>
        {/* Percent + segments */}
        <box spacing={16}>
          <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.END}>
            <box spacing={0}>
              <label class={percentClass} label={percentText} />
              <label class="HudPercentUnit" label="%" valign={Gtk.Align.END} />
            </box>
          </box>
          <box orientation={Gtk.Orientation.VERTICAL} spacing={4} hexpand valign={Gtk.Align.END}>
            <box class="HudSegBar" spacing={3} homogeneous>
              {Array.from({ length: SEGMENTS }).map((_, i) => (
                <box
                  class={segState((s) => segmentClass(i, s.filled, s.tone))}
                  heightRequest={20}
                />
              ))}
            </box>
            <box spacing={0}>
              <label class="HudSegScale" label="0" halign={Gtk.Align.START} hexpand />
              <label class="HudSegScale" label="50" />
              <label class="HudSegScale" label="100" halign={Gtk.Align.END} hexpand />
            </box>
          </box>
        </box>

        {/* Stats grid */}
        <box spacing={8} homogeneous>
          <StatTile label="TIME LEFT" value={timeLeft} tone="info" />
          <StatTile label="DRAW" value={draw} tone={drawTone} />
          <StatTile label="HEALTH" value={health} tone="charge" />
          <StatTile label="CPU" value={cpuText} tone={cpuTone} />
        </box>

        {/* Energy + cycles */}
        <box spacing={12}>
          <label class="HudFooterLine" label={energyLabel} halign={Gtk.Align.START} />
          <label class="HudFooterDim" label={cycles} halign={Gtk.Align.START} />
        </box>

        {/* Top consumers */}
        <box class="HudProcessSection" orientation={Gtk.Orientation.VERTICAL} spacing={0}>
          <SectionHeader label="TOP CONSUMERS" />
          <ProcessRow info={proc0} />
          <ProcessRow info={proc1} />
          <ProcessRow info={proc2} />
        </box>

        {/* ── Power Controls ── */}
        <box class="HudPowerSection" orientation={Gtk.Orientation.VERTICAL} spacing={0}>
          <SectionHeader label="POWER CONTROLS" />

          {/* Lid close action — pull-down with overlay menu */}
          <overlay>
            <box class="HudPulldownRow" spacing={0}>
              <box orientation={Gtk.Orientation.VERTICAL} hexpand halign={Gtk.Align.START} valign={Gtk.Align.CENTER}>
                <label class="HudPulldownLabel" label="Lid Close Action" halign={Gtk.Align.START} />
                <label class="HudPulldownSub" label="LID::SWITCH" halign={Gtk.Align.START} />
              </box>
              <button
                class={triggerClass}
                onClicked={() => setMenuOpen(!menuOpen())}
                valign={Gtk.Align.CENTER}
              >
                <label label={lidLabel} />
              </button>
            </box>

            {/* Menu floats on top via overlay */}
            <box $type="overlay"
                 class="HudPdMenu" orientation={Gtk.Orientation.VERTICAL} spacing={0}
                 visible={menuOpen} halign={Gtk.Align.END} valign={Gtk.Align.END}>
              <label class="HudPdSection" label="LID::ACTION" halign={Gtk.Align.START} />
              {LID_ACTIONS.map((action) => (
                <LidMenuItem
                  action={action}
                  currentAction={props.lidAction}
                  onSelect={() => selectLidAction(action)}
                />
              ))}
            </box>
          </overlay>

          <box class="HudSepLine" />

          {/* All toggle */}
          <ToggleRow
            label="All Power Save"
            subLabel="SAVE::ALL"
            active={allEnabled}
            onToggle={props.onToggleAll}
            emphasis
          />

          {/* Individual measure toggles */}
          {MEASURE_NAMES.map((name) => (
            <MeasureToggleRow
              name={name}
              pwsaveStatus={props.pwsaveStatus}
              onToggle={(enable) => props.onToggleMeasure(name, enable)}
            />
          ))}
        </box>
      </box>
    </box>
  )
}

// ── Pull-down menu item ──
function LidMenuItem(props: {
  action: LidAction
  currentAction: Accessor<LidAction>
  onSelect: () => void
}) {
  const itemClass = props.currentAction((current) =>
    current === props.action ? "HudPdItem HudPdItemSelected" : "HudPdItem",
  )
  const checkLabel = props.currentAction((current) =>
    current === props.action ? ICONS.check : "",
  )

  return (
    <button class={itemClass} onClicked={props.onSelect}>
      <box spacing={8}>
        <label label={LID_ACTION_LABELS[props.action]} hexpand halign={Gtk.Align.CENTER} />
        <label class="HudPdCheck" label={checkLabel} widthRequest={18} halign={Gtk.Align.END} />
      </box>
    </button>
  )
}

// ── Toggle row for individual measure ──
function MeasureToggleRow(props: {
  name: MeasureName
  pwsaveStatus: Accessor<PwsaveStatus | null>
  onToggle: (enable: boolean) => void
}) {
  const meta = MEASURE_META[props.name]

  const enabled = props.pwsaveStatus((s) => s != null ? isMeasureEnabled(s, props.name) : false)

  return (
    <ToggleRow
      label={meta.label}
      subLabel={meta.sub}
      active={enabled}
      onToggle={props.onToggle}
    />
  )
}

// ── Process row ──
function ProcessRow(props: { info: any }) {
  const name = props.info((p: any) => p?.name ?? "—")
  const cpu = props.info((p: any) => p != null ? `${p.cpu.toFixed(1)}%` : "")
  const barWidth = props.info((p: any) => {
    if (p == null) return 0
    return Math.min(Math.round((p.cpu / 20) * 80), 80)
  })
  const barClass = props.info((p: any) => {
    if (p == null) return "HudProcBar"
    if (p.cpu > 10) return "HudProcBar HudProcBarHigh"
    if (p.cpu > 5) return "HudProcBar HudProcBarMed"
    return "HudProcBar HudProcBarLow"
  })
  const cpuClass = props.info((p: any) => {
    if (p == null) return "HudProcCpu"
    if (p.cpu > 10) return "HudProcCpu HudProcCpuHigh"
    if (p.cpu > 5) return "HudProcCpu HudProcCpuMed"
    return "HudProcCpu HudProcCpuLow"
  })

  return (
    <box class="HudProcRow" spacing={10}>
      <label class="HudProcName" label={name} hexpand halign={Gtk.Align.START} />
      <box class="HudProcBarBg" widthRequest={80} heightRequest={3} valign={Gtk.Align.CENTER}>
        <box class={barClass} widthRequest={barWidth} heightRequest={3} halign={Gtk.Align.START} />
      </box>
      <label class={cpuClass} label={cpu} widthRequest={45} halign={Gtk.Align.END} />
    </box>
  )
}
