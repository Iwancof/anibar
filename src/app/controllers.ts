import { exec } from "ags/process"
import { Gtk } from "ags/gtk4"

import {
  makeWindowController,
  WINDOW_CLOSE_ANIM_MS,
  WINDOW_PREFIXES,
} from "./window-controller.ts"

function getFocusedMonitorName(): string | null {
  try {
    const monitors = JSON.parse(exec(["hyprctl", "monitors", "-j"])) as Array<Record<string, unknown>>
    const focused = monitors.find((monitor) => monitor.focused === true)
    return typeof focused?.name === "string" && focused.name.length > 0 ? focused.name : null
  } catch {
    return null
  }
}

function pickFocusedMonitorWindow(prefix: string, windows: Gtk.Window[]): Gtk.Window[] {
  if (windows.length === 0) return []

  const focusedMonitor = getFocusedMonitorName()
  if (!focusedMonitor) return [windows[0]]

  return [windows.find((window) => window.name === `${prefix}${focusedMonitor}`) ?? windows[0]]
}

const batteryPopup = makeWindowController(WINDOW_PREFIXES.batteryPopup, {
  closeAnimMs: WINDOW_CLOSE_ANIM_MS,
})
const bluetoothPopup = makeWindowController(WINDOW_PREFIXES.bluetoothPopup, {
  closeAnimMs: WINDOW_CLOSE_ANIM_MS,
})
const dashboardMode = makeWindowController(WINDOW_PREFIXES.dashboardMode)
const launcher = makeWindowController(WINDOW_PREFIXES.launcher, {
  pick: (windows) => pickFocusedMonitorWindow(WINDOW_PREFIXES.launcher, windows),
})
const networkPopup = makeWindowController(WINDOW_PREFIXES.networkPopup, {
  closeAnimMs: WINDOW_CLOSE_ANIM_MS,
})
const notifCenter = makeWindowController(WINDOW_PREFIXES.notifCenter, {
  closeAnimMs: WINDOW_CLOSE_ANIM_MS,
})
const swipeDashboard = makeWindowController(WINDOW_PREFIXES.swipeDashboard)
const workspace = makeWindowController(WINDOW_PREFIXES.workspace)
const wsGoto = makeWindowController(WINDOW_PREFIXES.wsGoto, {
  pick: (windows) => pickFocusedMonitorWindow(WINDOW_PREFIXES.wsGoto, windows),
})

export const anyBatteryPopupVisible = batteryPopup.anyVisible
export const batteryPopupVisible = batteryPopup.visible
export const openBatteryPopup = batteryPopup.open
export const closeBatteryPopup = batteryPopup.close
export const toggleBatteryPopup = batteryPopup.toggle

export const anyBluetoothPopupVisible = bluetoothPopup.anyVisible
export const openBluetoothPopup = bluetoothPopup.open
export const closeBluetoothPopup = bluetoothPopup.close
export const toggleBluetoothPopup = bluetoothPopup.toggle

export const anyDashboardModeVisible = dashboardMode.anyVisible
export const dashboardModeVisible = dashboardMode.visible
export const openDashboardMode = dashboardMode.open
export const closeDashboardMode = dashboardMode.close
export const toggleDashboardMode = dashboardMode.toggle

export const anyLauncherVisible = launcher.anyVisible
export const openLauncher = launcher.open
export const closeLauncher = launcher.close
export const toggleLauncher = launcher.toggle

export const networkPopupVisible = networkPopup.visible
export const openNetworkPopup = networkPopup.open
export const closeNetworkPopup = networkPopup.close
export const toggleNetworkPopup = networkPopup.toggle

export const openNotifCenter = notifCenter.open
export const closeNotifCenter = notifCenter.close
export const toggleNotifCenter = notifCenter.toggle

export const anySwipeDashboardVisible = swipeDashboard.anyVisible
export const setSwipeDashboardVisibility = swipeDashboard.setVisibility
export const openSwipeDashboard = swipeDashboard.open
export const closeSwipeDashboard = swipeDashboard.close
export const toggleSwipeDashboard = swipeDashboard.toggle

export const anyWorkspaceVisible = workspace.anyVisible
export const setWorkspaceVisibility = workspace.setVisibility
export const toggleWorkspaceVisibility = workspace.toggle

export const anyDashboardVisible = anyWorkspaceVisible
export const setDashboardVisibility = setWorkspaceVisibility
export const toggleDashboardVisibility = toggleWorkspaceVisibility

export const anyWsGotoVisible = wsGoto.anyVisible
export const openWsGoto = wsGoto.open
export const closeWsGoto = wsGoto.close
export const toggleWsGoto = wsGoto.toggle
