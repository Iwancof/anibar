import GLib from "gi://GLib?version=2.0"
import { createState, createMemo, type Accessor } from "gnim"
import { safeExec } from "./command.ts"
import {
  parsePwsaveStatus,
  isAllEnabled,
  type PwsaveStatus,
  type MeasureName,
} from "../modules/power-save/domain.ts"

export interface PwsaveSource {
  status: Accessor<PwsaveStatus | null>
  allEnabled: Accessor<boolean>
  toggleMeasure: (name: MeasureName, enable: boolean) => void
  toggleAll: (enable: boolean) => void
}

const POLL_MS = 5000

export function createPwsaveSource(): PwsaveSource {
  const [status, setStatus] = createState<PwsaveStatus | null>(null)

  async function fetchStatus() {
    const raw = await safeExec(["sudo", "pwsavectl", "status"])
    const parsed = parsePwsaveStatus(raw)
    if (parsed) setStatus(parsed)
  }

  // Initial fetch + periodic poll
  fetchStatus()
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, POLL_MS, () => {
    fetchStatus()
    return GLib.SOURCE_CONTINUE
  })

  const allEnabled = createMemo(() => {
    const s = status()
    return s != null ? isAllEnabled(s) : false
  })

  async function toggleMeasure(name: MeasureName, enable: boolean) {
    const action = enable ? "enable" : "disable"
    await safeExec(["sudo", "pwsavectl", action, name])
    await fetchStatus()
  }

  async function toggleAll(enable: boolean) {
    const action = enable ? "enable" : "disable"
    await safeExec(["sudo", "pwsavectl", action, "all"])
    await fetchStatus()
  }

  return { status, allEnabled, toggleMeasure, toggleAll }
}
