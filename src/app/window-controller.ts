import GLib from "gi://GLib?version=2.0"

import app from "ags/gtk4/app"
import { Gtk } from "ags/gtk4"

import { DIM } from "../shared/theme-tokens.ts"
import { isConnectorAvailable } from "./monitor-registry.ts"

export const WINDOW_PREFIXES = {
  batteryPopup: "battery-popup:",
  bluetoothPopup: "bluetooth-popup:",
  dashboardMode: "dashboard-mode:",
  launcher: "launcher:",
  networkPopup: "network-popup:",
  notifCenter: "notif-center:",
  swipeDashboard: "swipe-dashboard:",
  workspace: "workspace:",
  wsGoto: "ws-goto:",
} as const

export const WINDOW_CLOSE_ANIM_MS = DIM["anim-close-ms"]

export interface WindowController {
  anyVisible(): boolean
  open(): number
  close(): number
  toggle(): number
  setVisibility(visible: boolean): number
  getWindows(): Gtk.Window[]
}

export interface WindowControllerOptions {
  closeAnimMs?: number
  pick?: (windows: Gtk.Window[]) => Gtk.Window[]
}

function connectorForWindow(prefix: string, window: Gtk.Window): string | null {
  const name = window.name ?? ""
  if (!name.startsWith(prefix)) return null
  return name.slice(prefix.length)
}

function setClass(window: Gtk.Window, add: string, remove: string): void {
  window.cssClasses = [...window.cssClasses.filter((c) => c !== remove && c !== add), add]
}

function clearClass(window: Gtk.Window, name: string): void {
  window.cssClasses = window.cssClasses.filter((c) => c !== name)
}

export function makeWindowController(
  prefix: string,
  opts: WindowControllerOptions = {},
): WindowController {
  let animating = false

  function allWindows(): Gtk.Window[] {
    return app.windows.filter((window) => connectorForWindow(prefix, window) != null)
  }

  function getWindows(): Gtk.Window[] {
    return allWindows().filter((window) => {
      const connector = connectorForWindow(prefix, window)
      return connector != null && isConnectorAvailable(connector)
    })
  }

  function pickWindows(windows: Gtk.Window[]): Gtk.Window[] {
    return opts.pick ? opts.pick(windows) : windows
  }

  function anyVisible(): boolean {
    return getWindows().some((window) => window.visible)
  }

  function open(): number {
    if (animating) return 0

    const windows = getWindows()
    const selected = pickWindows(windows)
    const selectedSet = new Set(selected)

    if (opts.pick) {
      for (const window of allWindows()) {
        if (!selectedSet.has(window)) {
          window.visible = false
          clearClass(window, "open")
          clearClass(window, "closing")
        }
      }
    }

    for (const window of selected) {
      window.visible = true
      window.present()
      if (opts.closeAnimMs != null) {
        setClass(window, "open", "closing")
      }
    }

    return selected.length
  }

  function close(): number {
    if (animating) return 0

    const windows = allWindows()

    if (opts.closeAnimMs == null) {
      for (const window of windows) {
        window.visible = false
      }
      return windows.length
    }

    if (!windows.some((window) => window.visible)) return 0

    animating = true
    for (const window of windows) {
      setClass(window, "closing", "open")
    }
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, opts.closeAnimMs, () => {
      for (const window of windows) {
        window.visible = false
        clearClass(window, "closing")
      }
      animating = false
      return GLib.SOURCE_REMOVE
    })

    return windows.length
  }

  function setVisibility(visible: boolean): number {
    return visible ? open() : close()
  }

  function toggle(): number {
    if (animating) return 0
    return setVisibility(!anyVisible())
  }

  return { anyVisible, open, close, toggle, setVisibility, getWindows }
}
