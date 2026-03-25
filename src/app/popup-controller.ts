import GLib from "gi://GLib?version=2.0"
import app from "ags/gtk4/app"

const BATTERY_POPUP_PREFIX = "battery-popup:"
const CLOSE_ANIMATION_MS = 200

function getBatteryPopupWindows() {
  return app.windows.filter((w) => w.name.startsWith(BATTERY_POPUP_PREFIX))
}

export function anyBatteryPopupVisible(): boolean {
  return getBatteryPopupWindows().some((w) => w.visible)
}

let closing = false

export function closeBatteryPopup(): void {
  if (closing || !anyBatteryPopupVisible()) return

  closing = true
  const windows = getBatteryPopupWindows()
  windows.forEach((w) => {
    w.cssClasses = [...w.cssClasses.filter((c) => c !== "open"), "closing"]
  })
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, CLOSE_ANIMATION_MS, () => {
    windows.forEach((w) => {
      w.visible = false
      w.cssClasses = w.cssClasses.filter((c) => c !== "closing")
    })
    closing = false
    return false
  })
}

export function openBatteryPopup(): void {
  if (closing) return
  const windows = getBatteryPopupWindows()
  windows.forEach((w) => {
    w.visible = true
    w.present()
    w.cssClasses = [...w.cssClasses.filter((c) => c !== "closing"), "open"]
  })
}

export function toggleBatteryPopup(): void {
  if (anyBatteryPopupVisible()) {
    closeBatteryPopup()
  } else {
    openBatteryPopup()
  }
}
