import app from "ags/gtk4/app"

const PREFIX = "swipe-dashboard:"

function getWindows() {
  return app.windows.filter((w) => w.name.startsWith(PREFIX))
}

export function anySwipeDashboardVisible(): boolean {
  return getWindows().some((w) => w.visible)
}

export function setSwipeDashboardVisibility(visible: boolean): number {
  const windows = getWindows()

  windows.forEach((w) => {
    w.visible = visible
    if (visible) {
      w.present()
    }
  })

  return windows.length
}

export function toggleSwipeDashboard(): number {
  return setSwipeDashboardVisibility(!anySwipeDashboardVisible())
}
