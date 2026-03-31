import app from "ags/gtk4/app"
import { exec } from "ags/process"

const LAUNCHER_PREFIX = "launcher:"

function getLauncherWindows() {
  return app.windows.filter((w) => w.name.startsWith(LAUNCHER_PREFIX))
}

function getFocusedMonitorName(): string | null {
  try {
    const monitors = JSON.parse(exec(["hyprctl", "monitors", "-j"])) as Array<Record<string, unknown>>
    const focused = monitors.find((monitor) => monitor.focused === true)
    return typeof focused?.name === "string" && focused.name.length > 0 ? focused.name : null
  } catch {
    return null
  }
}

function getFocusedLauncherWindow() {
  const windows = getLauncherWindows()
  if (windows.length === 0) return null

  const focusedMonitor = getFocusedMonitorName()
  if (!focusedMonitor) return windows[0]

  return windows.find((w) => w.name === `${LAUNCHER_PREFIX}${focusedMonitor}`) ?? windows[0]
}

export function anyLauncherVisible(): boolean {
  return getLauncherWindows().some((w) => w.visible)
}

export function openLauncher(): void {
  closeLauncher()

  const window = getFocusedLauncherWindow()
  if (!window) return

  window.visible = true
  window.present()
}

export function closeLauncher(): void {
  getLauncherWindows().forEach((w) => {
    w.visible = false
  })
}

export function toggleLauncher(): void {
  if (anyLauncherVisible()) {
    closeLauncher()
  } else {
    openLauncher()
  }
}
