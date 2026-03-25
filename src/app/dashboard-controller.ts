import app from "ags/gtk4/app"

const DASHBOARD_PREFIX = "dashboard:"

function getDashboardWindows() {
  return app.windows.filter((window) => window.name.startsWith(DASHBOARD_PREFIX))
}

export function anyDashboardVisible(): boolean {
  return getDashboardWindows().some((window) => window.visible)
}

export function setDashboardVisibility(visible: boolean): number {
  const windows = getDashboardWindows()

  windows.forEach((window) => {
    window.visible = visible
    if (visible) {
      window.present()
    }
  })

  return windows.length
}

export function toggleDashboardVisibility(): number {
  return setDashboardVisibility(!anyDashboardVisible())
}
