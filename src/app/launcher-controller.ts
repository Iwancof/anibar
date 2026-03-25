import app from "ags/gtk4/app"

const LAUNCHER_PREFIX = "launcher:"

function getLauncherWindows() {
  return app.windows.filter((w) => w.name.startsWith(LAUNCHER_PREFIX))
}

export function anyLauncherVisible(): boolean {
  return getLauncherWindows().some((w) => w.visible)
}

export function openLauncher(): void {
  getLauncherWindows().forEach((w) => {
    w.visible = true
    w.present()
  })
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
