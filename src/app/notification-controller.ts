import GLib from "gi://GLib?version=2.0"
import app from "ags/gtk4/app"

const PREFIX = "notif-center:"
const CLOSE_ANIM_MS = 200

function getWindows() {
  return app.windows.filter((w) => w.name.startsWith(PREFIX))
}

let animating = false

export function closeNotifCenter(): void {
  if (animating) return
  const windows = getWindows()
  if (!windows.some((w) => w.visible)) return

  animating = true
  windows.forEach((w) => {
    w.cssClasses = [...w.cssClasses.filter((c) => c !== "open"), "closing"]
  })
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, CLOSE_ANIM_MS, () => {
    windows.forEach((w) => {
      w.visible = false
      w.cssClasses = w.cssClasses.filter((c) => c !== "closing")
    })
    animating = false
    return false
  })
}

export function openNotifCenter(): void {
  if (animating) return
  const windows = getWindows()
  windows.forEach((w) => {
    w.visible = true
    w.present()
    w.cssClasses = [...w.cssClasses.filter((c) => c !== "closing"), "open"]
  })
}

export function toggleNotifCenter(): void {
  if (animating) return
  if (getWindows().some((w) => w.visible)) {
    closeNotifCenter()
  } else {
    openNotifCenter()
  }
}
