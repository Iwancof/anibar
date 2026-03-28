import app from "ags/gtk4/app"

const PREFIX = "dashboard-mode:"

function getWindows() {
  return app.windows.filter((w) => w.name.startsWith(PREFIX))
}

export function anyDashboardModeVisible(): boolean {
  return getWindows().some((w) => w.visible)
}

export function openDashboardMode(): void {
  getWindows().forEach((w) => {
    w.visible = true
    w.present()
  })
}

export function closeDashboardMode(): void {
  getWindows().forEach((w) => {
    w.visible = false
  })
}

export function toggleDashboardMode(): void {
  if (anyDashboardModeVisible()) {
    closeDashboardMode()
  } else {
    openDashboardMode()
  }
}
