import { Gtk } from "ags/gtk4"
import { createState } from "gnim"

import type {
  PwsaveStatus,
  MeasureName,
  LidAction,
} from "../modules/power-save/domain.ts"
import type { BatterySnapshot } from "../modules/battery/domain.ts"
import type { SystemStatsSnapshot } from "../modules/system-stats/domain.ts"
import BatteryHudView from "../surfaces/popups/BatteryHudView.tsx"
import PreviewWindow from "./PreviewWindow.tsx"
import { startPreviewApp } from "./startPreview.ts"

// ── Mock data ──
const mockBattery: BatterySnapshot = {
  present: true,
  percent: 72,
  state: "discharging",
  energyNowWh: 36.2,
  energyFullWh: 50.5,
  energyFullDesignWh: 54.0,
  powerNowW: 8.3,
  cycleCount: 142,
}

const mockStats: SystemStatsSnapshot = {
  cpuPercent: 12,
  topProcesses: [
    { name: "firefox", cpu: 5.2 },
    { name: "code", cpu: 3.1 },
    { name: "ags", cpu: 1.8 },
  ],
}

const mockPwsave: PwsaveStatus = {
  summary: "partial",
  measures: [
    { measure: "ppd", enabled: true },
    { measure: "brightness", enabled: false },
    { measure: "boost", enabled: true },
    { measure: "cores", enabled: false },
    { measure: "gpu", enabled: false },
    { measure: "wifi", enabled: true },
  ],
}

startPreviewApp({
  instanceName: "ags-preview-power",
  main() {
    const [battery] = createState<BatterySnapshot | null>(mockBattery)
    const [stats] = createState<SystemStatsSnapshot | null>(mockStats)
    const [pwsave, setPwsave] = createState<PwsaveStatus | null>(mockPwsave)
    const [lidAction, setLidAction] = createState<LidAction>("suspend")

    function toggleMeasure(name: MeasureName, enable: boolean) {
      const current = pwsave()
      if (!current) return
      const updated: PwsaveStatus = {
        ...current,
        measures: current.measures.map((m) =>
          m.measure === name ? { ...m, enabled: enable } : m,
        ),
      }
      updated.summary = updated.measures.every((m) => m.enabled)
        ? "all_enabled"
        : updated.measures.every((m) => !m.enabled)
        ? "all_disabled"
        : "partial"
      setPwsave(updated)
    }

    function toggleAll(enable: boolean) {
      const current = pwsave()
      if (!current) return
      setPwsave({
        summary: enable ? "all_enabled" : "all_disabled",
        measures: current.measures.map((m) => ({ ...m, enabled: enable })),
      })
    }

    return (
      <PreviewWindow
        title="Power Controls Preview"
        subtitle="Pull-down menu + toggle switches for pwsavectl"
        width={480}
        height={900}
      >
        <box class="HudPreviewPanel">
          <BatteryHudView
            snapshot={battery}
            systemStats={stats}
            pwsaveStatus={pwsave}
            lidAction={lidAction}
            onToggleMeasure={toggleMeasure}
            onToggleAll={toggleAll}
            onSetLidAction={setLidAction}
          />
        </box>
      </PreviewWindow>
    )
  },
})
