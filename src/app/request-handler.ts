import {
  anyLauncherVisible,
  anySwipeDashboardVisible,
  anyWorkspaceVisible,
  closeBatteryPopup,
  closeBluetoothPopup,
  closeDashboardMode,
  closeLauncher,
  closeNetworkPopup,
  closeNotifCenter,
  closeSwipeDashboard,
  openBatteryPopup,
  openBluetoothPopup,
  openDashboardMode,
  openLauncher,
  openNetworkPopup,
  openNotifCenter,
  openSwipeDashboard,
  setWorkspaceVisibility,
  toggleBatteryPopup,
  toggleBluetoothPopup,
  toggleDashboardMode,
  toggleLauncher,
  toggleNetworkPopup,
  toggleNotifCenter,
  toggleSwipeDashboard,
  toggleWorkspaceVisibility,
} from "./controllers.ts"

function normalizeArgs(args: string[]): string[] {
  return args.filter(Boolean).filter((arg, index) => {
    if (arg.startsWith("--gapplication")) {
      return false
    }

    if (index === 0 && (arg.includes("ags") || arg.includes("io.Astal"))) {
      return false
    }

    return true
  })
}

export function handleAppRequest(args: string[]): string {
  const [scope, action = "toggle"] = normalizeArgs(args)

  if (scope === "launcher") {
    switch (action) {
      case "toggle":
        toggleLauncher()
        return `launcher ${anyLauncherVisible() ? "visible" : "hidden"}`
      case "open":
        openLauncher()
        return "launcher visible"
      case "close":
        closeLauncher()
        return "launcher hidden"
      default:
        return `unknown launcher action "${action}"`
    }
  }

  if (scope === "dashboard-mode") {
    switch (action) {
      case "toggle": toggleDashboardMode(); return "ok"
      case "open": openDashboardMode(); return "ok"
      case "close": closeDashboardMode(); return "ok"
      default: return `unknown dashboard-mode action "${action}"`
    }
  }

  if (scope === "swipe-dashboard") {
    switch (action) {
      case "toggle":
        toggleSwipeDashboard()
        return `swipe-dashboard ${anySwipeDashboardVisible() ? "visible" : "hidden"}`
      case "open":
      case "show":
        openSwipeDashboard()
        return "swipe-dashboard visible"
      case "close":
      case "hide":
        closeSwipeDashboard()
        return "swipe-dashboard hidden"
      case "status":
        return anySwipeDashboardVisible() ? "swipe-dashboard visible" : "swipe-dashboard hidden"
      default:
        return `unknown swipe-dashboard action "${action}"`
    }
  }

  if (scope === "battery") {
    switch (action) {
      case "toggle": toggleBatteryPopup(); return "ok"
      case "open": openBatteryPopup(); return "ok"
      case "close": closeBatteryPopup(); return "ok"
      default: return `unknown battery action "${action}"`
    }
  }

  if (scope === "bluetooth") {
    switch (action) {
      case "toggle": toggleBluetoothPopup(); return "ok"
      case "open": openBluetoothPopup(); return "ok"
      case "close": closeBluetoothPopup(); return "ok"
      default: return `unknown bluetooth action "${action}"`
    }
  }

  if (scope === "network") {
    switch (action) {
      case "toggle": toggleNetworkPopup(); return "ok"
      case "open": openNetworkPopup(); return "ok"
      case "close": closeNetworkPopup(); return "ok"
      default: return `unknown network action "${action}"`
    }
  }

  if (scope === "notif-center") {
    switch (action) {
      case "toggle": toggleNotifCenter(); return "ok"
      case "open": openNotifCenter(); return "ok"
      case "close": closeNotifCenter(); return "ok"
      default: return `unknown notif-center action "${action}"`
    }
  }

  if (scope !== "dashboard" && scope !== "workspace") {
    return 'unknown request. use "ags request battery|bluetooth|network|notif-center|dashboard|workspace|launcher|swipe-dashboard toggle"'
  }

  const label = scope === "workspace" ? "workspace" : "dashboard"
  switch (action) {
    case "toggle":
      toggleWorkspaceVisibility()
      return `${label} ${anyWorkspaceVisible() ? "visible" : "hidden"}`
    case "open":
    case "show":
      setWorkspaceVisibility(true)
      return `${label} visible`
    case "close":
    case "hide":
      setWorkspaceVisibility(false)
      return `${label} hidden`
    case "status":
      return anyWorkspaceVisible() ? `${label} visible` : `${label} hidden`
    default:
      return `unknown ${label} action "${action}"`
  }
}
