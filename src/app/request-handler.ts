import { anyDashboardVisible, setDashboardVisibility, toggleDashboardVisibility } from "./dashboard-controller.ts"
import { anyLauncherVisible, toggleLauncher, openLauncher, closeLauncher } from "./launcher-controller.ts"
import { anySwipeDashboardVisible, setSwipeDashboardVisibility, toggleSwipeDashboard } from "./swipe-dashboard-controller.ts"

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

  if (scope === "swipe-dashboard") {
    switch (action) {
      case "toggle":
        toggleSwipeDashboard()
        return `swipe-dashboard ${anySwipeDashboardVisible() ? "visible" : "hidden"}`
      case "open":
      case "show":
        setSwipeDashboardVisibility(true)
        return "swipe-dashboard visible"
      case "close":
      case "hide":
        setSwipeDashboardVisibility(false)
        return "swipe-dashboard hidden"
      case "status":
        return anySwipeDashboardVisible() ? "swipe-dashboard visible" : "swipe-dashboard hidden"
      default:
        return `unknown swipe-dashboard action "${action}"`
    }
  }

  if (scope !== "dashboard") {
    return 'unknown request. use "ags request dashboard|launcher|swipe-dashboard toggle"'
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
