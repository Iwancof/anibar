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

let animating = false

export function closeBatteryPopup(): void {
  if (animating) return
  const windows = getBatteryPopupWindows()
  if (!windows.some((w) => w.visible)) return

  animating = true
  windows.forEach((w) => {
    w.cssClasses = [...w.cssClasses.filter((c) => c !== "open"), "closing"]
  })
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, CLOSE_ANIMATION_MS, () => {
    windows.forEach((w) => {
      w.visible = false
      w.cssClasses = w.cssClasses.filter((c) => c !== "closing")
    })
    animating = false
    return false
  })
}

export function openBatteryPopup(): void {
  if (animating) return
  const windows = getBatteryPopupWindows()
  windows.forEach((w) => {
    w.visible = true
    w.present()
    w.cssClasses = [...w.cssClasses.filter((c) => c !== "closing"), "open"]
  })
}

export function toggleBatteryPopup(): void {
  if (animating) return
  if (anyBatteryPopupVisible()) {
    closeBatteryPopup()
  } else {
    openBatteryPopup()
  }
}

// ── Network popup ──────────────────────────

const NETWORK_POPUP_PREFIX = "network-popup:"

function getNetworkPopupWindows() {
  return app.windows.filter((w) => w.name.startsWith(NETWORK_POPUP_PREFIX))
}

let netAnimating = false

export function closeNetworkPopup(): void {
  if (netAnimating) return
  const windows = getNetworkPopupWindows()
  if (!windows.some((w) => w.visible)) return

  netAnimating = true
  windows.forEach((w) => {
    w.cssClasses = [...w.cssClasses.filter((c) => c !== "open"), "closing"]
  })
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, CLOSE_ANIMATION_MS, () => {
    windows.forEach((w) => {
      w.visible = false
      w.cssClasses = w.cssClasses.filter((c) => c !== "closing")
    })
    netAnimating = false
    return false
  })
}

export function openNetworkPopup(): void {
  if (netAnimating) return
  const windows = getNetworkPopupWindows()
  windows.forEach((w) => {
    w.visible = true
    w.present()
    w.cssClasses = [...w.cssClasses.filter((c) => c !== "closing"), "open"]
  })
}

export function toggleNetworkPopup(): void {
  if (netAnimating) return
  if (getNetworkPopupWindows().some((w) => w.visible)) {
    closeNetworkPopup()
  } else {
    openNetworkPopup()
  }
}
