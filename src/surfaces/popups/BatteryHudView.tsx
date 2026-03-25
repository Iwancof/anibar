import { Gtk } from "ags/gtk4"
import type { Accessor } from "gnim"
import {
  estimateBatteryMinutes,
  batteryHealthPercent,
  type BatterySnapshot,
} from "../../modules/battery/domain.ts"
import type { SystemStatsSnapshot } from "../../modules/system-stats/domain.ts"
import { formatDurationMinutes, formatWatts } from "../../shared/format.ts"

export interface BatteryHudViewProps {
  snapshot: Accessor<BatterySnapshot | null>
  systemStats: Accessor<SystemStatsSnapshot | null>
}

const SEGMENTS = 10

function segmentClass(
  i: number,
  filledCount: number,
  isCharging: boolean,
): string {
  // 充電中: 次のセグメントを点滅
  if (isCharging && i === filledCount && i < SEGMENTS) return "HudSeg HudSegBlink"
  if (i >= filledCount) return "HudSeg HudSegEmpty"
  if (i < SEGMENTS * 0.2) return "HudSeg HudSegCrit"
  if (i < SEGMENTS * 0.5) return "HudSeg HudSegWarn"
  return isCharging ? "HudSeg HudSegCharge" : "HudSeg HudSegOk"
}

export default function BatteryHudView(props: BatteryHudViewProps) {
  const isOnAC = (s: BatterySnapshot | null) =>
    s?.present === true &&
    (s.state === "charging" || s.state === "full" || s.state === "not-charging")

  const headerRight = props.snapshot((s) =>
    !s || !s.present ? "N/A" : isOnAC(s) ? "AC_IN" : "BATTERY",
  )

  const dotClass = props.snapshot((s) => {
    if (!s || !s.present) return "HudDot"
    if (isOnAC(s)) return "HudDot HudDotCharge"
    if (s.percent < 20) return "HudDot HudDotCrit"
    return "HudDot HudDotNormal"
  })

  const percentText = props.snapshot((s) =>
    !s || !s.present ? "--" : `${Math.round(s.percent)}`,
  )

  const percentClass = props.snapshot((s) => {
    if (!s || !s.present) return "HudPercent"
    if (s.percent < 20) return "HudPercent HudPercentCrit"
    if (isOnAC(s)) return "HudPercent HudPercentCharge"
    return "HudPercent HudPercentNormal"
  })

  const filledCount = props.snapshot((s) =>
    !s || !s.present ? 0 : Math.round((s.percent / 100) * SEGMENTS),
  )

  const isCharging = props.snapshot((s) =>
    s?.present === true && s.state === "charging",
  )

  const timeLeft = props.snapshot((s) => {
    if (!s || !s.present) return "--"
    const mins = estimateBatteryMinutes(s)
    if (mins == null) return "---"
    return (s.state === "charging" ? "~" : "") + formatDurationMinutes(mins)
  })

  const draw = props.snapshot((s) => {
    if (!s || !s.present || s.powerNowW == null) return "--"
    const prefix = isOnAC(s) ? "+" : ""
    return prefix + formatWatts(s.powerNowW)
  })

  const drawClass = props.snapshot((s) =>
    isOnAC(s) ? "HudStatValue HudStatCharge" : "HudStatValue HudStatWarn",
  )

  const health = props.snapshot((s) => {
    if (!s || !s.present) return "--"
    const h = batteryHealthPercent(s)
    return h != null ? `${h}%` : "--"
  })

  const cpuText = props.systemStats((s) =>
    s != null ? `${s.cpuPercent}%` : "--",
  )

  const cpuClass = props.systemStats((s) => {
    if (!s) return "HudStatValue HudStatNormal"
    if (s.cpuPercent > 80) return "HudStatValue HudStatCrit"
    if (s.cpuPercent > 50) return "HudStatValue HudStatWarn"
    return "HudStatValue HudStatNormal"
  })

  const energyLabel = props.snapshot((s) => {
    if (!s || !s.present || s.energyNowWh == null || s.energyFullWh == null) return "--"
    return `${s.energyNowWh.toFixed(1)} / ${s.energyFullWh.toFixed(1)} Wh`
  })

  const cycles = props.snapshot((s) =>
    s?.cycleCount != null ? `${s.cycleCount} cycles` : "",
  )

  // Top processes
  const proc0 = props.systemStats((s) => s?.topProcesses[0] ?? null)
  const proc1 = props.systemStats((s) => s?.topProcesses[1] ?? null)
  const proc2 = props.systemStats((s) => s?.topProcesses[2] ?? null)

  return (
    <box class="Hud" orientation={Gtk.Orientation.VERTICAL} spacing={0}>
      {/* ── Header ── */}
      <box class="HudHeader" spacing={0}>
        <box spacing={8} halign={Gtk.Align.START} hexpand>
          <box class={dotClass} widthRequest={8} heightRequest={8} valign={Gtk.Align.CENTER} />
          <label class="HudHeaderLabel" label="POWER::SYSTEM" />
        </box>
        <label class="HudHeaderRight" label={headerRight} halign={Gtk.Align.END} />
      </box>

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
                  class={(() => {
                    const fc = filledCount
                    const ch = isCharging
                    return fc((n: number) => ch((c: boolean) => segmentClass(i, n, c)))
                  })()}
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
          <box class="HudStat" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
            <label class="HudStatLabel" label="TIME LEFT" halign={Gtk.Align.START} />
            <label class="HudStatValue HudStatNormal" label={timeLeft} halign={Gtk.Align.START} />
          </box>
          <box class="HudStat" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
            <label class="HudStatLabel" label="DRAW" halign={Gtk.Align.START} />
            <label class={drawClass} label={draw} halign={Gtk.Align.START} />
          </box>
          <box class="HudStat" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
            <label class="HudStatLabel" label="HEALTH" halign={Gtk.Align.START} />
            <label class="HudStatValue HudStatCharge" label={health} halign={Gtk.Align.START} />
          </box>
          <box class="HudStat" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
            <label class="HudStatLabel" label="CPU" halign={Gtk.Align.START} />
            <label class={cpuClass} label={cpuText} halign={Gtk.Align.START} />
          </box>
        </box>

        {/* Energy + cycles */}
        <box spacing={12}>
          <label class="HudFooterLine" label={energyLabel} halign={Gtk.Align.START} />
          <label class="HudFooterDim" label={cycles} halign={Gtk.Align.START} />
        </box>

        {/* Top consumers */}
        <box class="HudProcessSection" orientation={Gtk.Orientation.VERTICAL} spacing={0}>
          <label class="HudProcessHeader" label="TOP CONSUMERS" halign={Gtk.Align.START} />
          <ProcessRow info={proc0} />
          <ProcessRow info={proc1} />
          <ProcessRow info={proc2} />
        </box>
      </box>
    </box>
  )
}

function ProcessRow(props: { info: any }) {
  const name = props.info((p: any) => p?.name ?? "---")
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
