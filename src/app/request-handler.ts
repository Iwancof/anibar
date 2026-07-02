import { anyDashboardVisible, setDashboardVisibility, toggleDashboardVisibility } from "./dashboard-controller.ts"
import { anyLauncherVisible, toggleLauncher, openLauncher, closeLauncher } from "./launcher-controller.ts"
import {
  anySwipeDashboardVisible,
  closeSwipeDashboard,
  openSwipeDashboard,
  toggleSwipeDashboard,
} from "./swipe-dashboard-controller.ts"
import { toggleBatteryPopup, openBatteryPopup, closeBatteryPopup } from "./popup-controller.ts"
import { toggleNetworkPopup, openNetworkPopup, closeNetworkPopup } from "./network-controller.ts"
import { toggleNotifCenter, openNotifCenter, closeNotifCenter } from "./notification-controller.ts"
import { toggleDashboardMode, openDashboardMode, closeDashboardMode } from "./dashboard-mode-controller.ts"

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

  if (scope !== "dashboard") {
    return 'unknown request. use "ags request battery|network|notif-center|dashboard|launcher|swipe-dashboard toggle"'
  }

  switch (action) {
    case "toggle":
      toggleDashboardVisibility()
      return `dashboard ${anyDashboardVisible() ? "visible" : "hidden"}`
    case "open":
    case "show":
      setDashboardVisibility(true)
      return "dashboard visible"
    case "close":
    case "hide":
      setDashboardVisibility(false)
      return "dashboard hidden"
    case "status":
      return anyDashboardVisible() ? "dashboard visible" : "dashboard hidden"
    default:
      return `unknown dashboard action "${action}"`
  }
}
