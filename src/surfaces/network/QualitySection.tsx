import { Gtk } from "ags/gtk4"
import { createMemo } from "gnim"
import type { Accessor } from "gnim"
import type { QualitySnapshot } from "../../runtime/quality-source.ts"
import SectionHeader from "../../shared/ui/SectionHeader.tsx"
import StatTile, { type StatTileTone } from "../../shared/ui/StatTile.tsx"

export interface QualitySectionProps {
  qualitySnapshot: Accessor<QualitySnapshot>
}

type QualityLevel = "good" | "warn" | "bad"

function rttLevel(rtt: number | null): QualityLevel {
  if (rtt == null) return "bad"
  if (rtt <= 20) return "good"
  if (rtt <= 50) return "warn"
  return "bad"
}

function jitterLevel(jitter: number | null): QualityLevel {
  if (jitter == null) return "bad"
  if (jitter <= 5) return "good"
  if (jitter <= 15) return "warn"
  return "bad"
}

function lossLevel(loss: number): QualityLevel {
  if (loss <= 1) return "good"
  if (loss <= 5) return "warn"
  return "bad"
}

function linkLevel(speed: number | null): QualityLevel {
  if (speed == null) return "bad"
  if (speed >= 200) return "good"
  if (speed >= 50) return "warn"
  return "bad"
}

function rssiLevel(rssi: number | null): QualityLevel {
  if (rssi == null) return "bad"
  if (rssi >= -50) return "good"
  if (rssi >= -70) return "warn"
  return "bad"
}

function levelTone(level: QualityLevel): StatTileTone {
  switch (level) {
    case "good": return "good"
    case "warn": return "warn"
    case "bad": return "crit"
  }
}

function MiniCard(props: { label: string; value: Accessor<string>; level: Accessor<QualityLevel> }) {
  const tone = createMemo(() => levelTone(props.level()))
  return <StatTile label={props.label} value={props.value} tone={tone} />
}

export default function QualitySection(props: QualitySectionProps) {
  const rttVal = createMemo(() => {
    const v = props.qualitySnapshot().rtt
    return v != null ? `${v.toFixed(1)}` : "—"
  })
  const rttLvl = createMemo(() => rttLevel(props.qualitySnapshot().rtt))

  const jitterVal = createMemo(() => {
    const v = props.qualitySnapshot().jitter
    return v != null ? `${v.toFixed(1)}` : "—"
  })
  const jitterLvl = createMemo(() => jitterLevel(props.qualitySnapshot().jitter))

  const lossVal = createMemo(() => `${props.qualitySnapshot().loss.toFixed(1)}%`)
  const lossLvl = createMemo(() => lossLevel(props.qualitySnapshot().loss))

  const linkVal = createMemo(() => {
    const v = props.qualitySnapshot().linkSpeed
    return v != null ? `${v.toFixed(0)}` : "—"
  })
  const linkLvl = createMemo(() => linkLevel(props.qualitySnapshot().linkSpeed))

  const rssiVal = createMemo(() => {
    const v = props.qualitySnapshot().rssi
    return v != null ? `${v}` : "—"
  })
  const rssiLvl = createMemo(() => rssiLevel(props.qualitySnapshot().rssi))

  const chVal = createMemo(() => {
    const v = props.qualitySnapshot().channel
    return v != null ? `${v}` : "—"
  })
  // Channel is informational, always neutral
  const chLvl = createMemo((): QualityLevel => {
    return props.qualitySnapshot().channel != null ? "good" : "bad"
  })

  return (
    <box class="NpSection" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
      <SectionHeader label="QUALITY" />
      <box class="NpQualRow" spacing={4}>
        <MiniCard label="RTT ms" value={rttVal} level={rttLvl} />
        <MiniCard label="JITTER ms" value={jitterVal} level={jitterLvl} />
        <MiniCard label="LOSS" value={lossVal} level={lossLvl} />
        <MiniCard label="LINK Mbps" value={linkVal} level={linkLvl} />
        <MiniCard label="RSSI dBm" value={rssiVal} level={rssiLvl} />
        <MiniCard label="CH" value={chVal} level={chLvl} />
      </box>
    </box>
  )
}
