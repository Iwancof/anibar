import { anyDashboardVisible, setDashboardVisibility, toggleDashboardVisibility } from "./dashboard-controller.ts"

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

  if (scope !== "dashboard") {
    return 'unknown request. use "ags request dashboard toggle|open|close|status"'
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
