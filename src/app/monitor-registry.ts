import GLib from "gi://GLib?version=2.0"
import Gdk from "gi://Gdk?version=4.0"
import Gio from "gi://Gio?version=2.0"

import app from "ags/gtk4/app"
import { Gtk } from "ags/gtk4"
import { createRoot, onCleanup } from "gnim"

import { computeMonitorDiff } from "../shared/monitor-diff.ts"

export { computeMonitorDiff as computeDiff } from "../shared/monitor-diff.ts"

const LOG_TAG = "[monitor-registry]"
function log(msg: string): void {
  const t = GLib.get_monotonic_time() / 1000
  console.log(`${LOG_TAG} ${t.toFixed(1)}ms ${msg}`)
}
function warn(msg: string): void {
  const t = GLib.get_monotonic_time() / 1000
  console.warn(`${LOG_TAG} ${t.toFixed(1)}ms ${msg}`)
}

export type MonitorWindowFactory = (
  monitor: Gdk.Monitor,
  connector: string,
  index: number,
) => Gtk.Window[]

export interface MonitorEntry {
  connector: string
  monitor: Gdk.Monitor
  windows: Gtk.Window[]
  visibleBeforeUnavailable: boolean[]
  dispose: () => void
  disposed: boolean
  available: boolean
  disconnectMonitorSignals: () => void
}

export interface MonitorRegistry {
  addMonitor(monitor: Gdk.Monitor, index: number): void
  removeMonitor(connector: string): void
  reconcile(): void
  disposeAll(): void
  readonly registry: ReadonlyMap<string, MonitorEntry>
}

function describeWindow(window: Gtk.Window): string {
  try {
    return `${window.name ?? "<noname>"} (realized=${window.get_realized()}, visible=${window.visible})`
  } catch (e) {
    return `<window-describe-failed: ${e}>`
  }
}

function safeRebindWindow(window: Gtk.Window, monitor: Gdk.Monitor, connector: string): void {
  const desc = describeWindow(window)
  try {
    window.gdkmonitor = monitor
    log(`  rebind ok (${connector}): ${desc}`)
  } catch (e) {
    warn(`  rebind failed (${connector}) for ${desc}: ${e}`)
  }
}

function safeSetWindowVisible(window: Gtk.Window, visible: boolean, connector: string): void {
  const desc = describeWindow(window)
  try {
    window.visible = visible
    if (visible) window.present()
    log(`  visible=${visible} ok (${connector}): ${desc}`)
  } catch (e) {
    warn(`  visible=${visible} failed (${connector}) for ${desc}: ${e}`)
  }
}

export function createMonitorRegistry(factory: MonitorWindowFactory): MonitorRegistry {
  const registry = new Map<string, MonitorEntry>()
  // connector 未確定 monitor を watch する。key=Gdk.Monitor object, value=notify::connector handler id
  const pending = new Map<Gdk.Monitor, number>()

  function watchPendingConnector(monitor: Gdk.Monitor): void {
    if (pending.has(monitor)) return
    const handlerId = monitor.connect("notify::connector", () => {
      const c = monitor.get_connector()
      log(`pending monitor notify::connector → connector=${c}`)
      const id = pending.get(monitor)
      if (id !== undefined) {
        pending.delete(monitor)
        try {
          monitor.disconnect(id)
        } catch (e) {
          warn(`disconnect notify::connector(pending) failed: ${e}`)
        }
      }
      // connector が確定したので reconcile 再実行
      reconcile()
    })
    pending.set(monitor, handlerId)
    log(`watching pending monitor (valid=${monitor.valid}, pending count=${pending.size})`)
  }

  function unwatchPending(monitor: Gdk.Monitor): void {
    const id = pending.get(monitor)
    if (id === undefined) return
    pending.delete(monitor)
    try {
      monitor.disconnect(id)
    } catch (e) {
      warn(`disconnect notify::connector(unwatch) failed: ${e}`)
    }
  }

  function bindMonitorSignals(entry: MonitorEntry, monitor: Gdk.Monitor): void {
    const connector = entry.connector
    const invalidateId = monitor.connect("invalidate", () => {
      log(`monitor ${connector} invalidate → defer reconcile`)
      GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
        log(`monitor ${connector} invalidate idle → reconcile`)
        reconcile()
        return GLib.SOURCE_REMOVE
      })
    })

    const validId = monitor.connect("notify::valid", () => {
      log(`monitor ${connector} notify::valid → valid=${monitor.valid}`)
      if (!monitor.valid) {
        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
          log(`monitor ${connector} notify::valid idle → reconcile`)
          reconcile()
          return GLib.SOURCE_REMOVE
        })
      }
    })

    entry.disconnectMonitorSignals = () => {
      try {
        monitor.disconnect(invalidateId)
      } catch (e) {
        warn(`  disconnect invalidate failed for ${connector}: ${e}`)
      }
      try {
        monitor.disconnect(validId)
      } catch (e) {
        warn(`  disconnect notify::valid failed for ${connector}: ${e}`)
      }
    }
  }

  function rebindMonitor(entry: MonitorEntry, monitor: Gdk.Monitor, index: number): void {
    if (entry.monitor === monitor && entry.available) return
    log(`rebindMonitor begin: ${entry.connector} (idx=${index}, valid=${monitor.valid})`)
    entry.disconnectMonitorSignals()
    entry.monitor = monitor
    entry.available = true
    bindMonitorSignals(entry, monitor)
    for (const [index2, window] of entry.windows.entries()) {
      safeRebindWindow(window, monitor, entry.connector)
      safeSetWindowVisible(
        window,
        entry.visibleBeforeUnavailable[index2] ?? window.visible,
        entry.connector,
      )
    }
    log(`rebindMonitor done: ${entry.connector}`)
  }

  function addMonitor(monitor: Gdk.Monitor, index: number): void {
    const connector = monitor.get_connector()
    if (!connector || connector.length === 0) {
      log(`addMonitor defer: no connector yet (idx=${index}, valid=${monitor.valid})`)
      watchPendingConnector(monitor)
      return
    }

    if (registry.has(connector)) {
      log(`addMonitor skip duplicate: ${connector}`)
      return
    }
    log(`addMonitor begin: ${connector} (idx=${index}, valid=${monitor.valid})`)

    createRoot((dispose) => {
      const windows = factory(monitor, connector, index)
      log(`  factory produced ${windows.length} windows for ${connector}`)

      const entry: MonitorEntry = {
        connector,
        monitor,
        windows,
        visibleBeforeUnavailable: windows.map((window) => window.visible),
        dispose,
        disposed: false,
        available: true,
        disconnectMonitorSignals: () => {},
      }
      bindMonitorSignals(entry, monitor)

      onCleanup(() => {
        log(`onCleanup: ${connector} — disconnect monitor signals only`)
        entry.disconnectMonitorSignals()
        log(`onCleanup done: ${connector}`)
      })

      registry.set(connector, entry)
      log(`addMonitor done: ${connector} (registry size=${registry.size})`)
    })
  }

  function removeMonitor(connector: string): void {
    const entry = registry.get(connector)
    if (!entry) {
      log(`removeMonitor no entry: ${connector}`)
      return
    }
    if (entry.disposed) {
      log(`removeMonitor already disposed: ${connector}`)
      return
    }
    log(`removeMonitor begin: ${connector}`)
    entry.disposed = true
    entry.disconnectMonitorSignals()
    registry.delete(connector)
    log(`removeMonitor done: ${connector} (registry size=${registry.size})`)
  }

  function reconcile(): void {
    const current = app.get_monitors()
    const currentByConnector = new Map<string, { monitor: Gdk.Monitor; index: number }>()
    const currentSet = new Set<Gdk.Monitor>()
    current.forEach((m, i) => {
      currentSet.add(m)
      const c = m.get_connector()
      if (c && c.length > 0 && !currentByConnector.has(c)) {
        currentByConnector.set(c, { monitor: m, index: i })
      }
    })

    // 消えた monitor の pending watch を解除
    for (const m of [...pending.keys()]) {
      if (!currentSet.has(m)) unwatchPending(m)
    }

    const diff = computeMonitorDiff(registry.keys(), currentByConnector.keys())
    log(`reconcile: current=[${[...currentByConnector.keys()].join(",")}] pending=${pending.size} registry=[${[...registry.keys()].join(",")}] toAdd=[${diff.toAdd.join(",")}] toRemove=[${diff.toRemove.join(",")}]`)
    for (const connector of diff.toRemove) {
      const entry = registry.get(connector)
      if (!entry || !entry.available) continue
      log(`mark unavailable: ${connector}`)
      entry.available = false
      entry.visibleBeforeUnavailable = entry.windows.map((window) => window.visible)
      entry.disconnectMonitorSignals()
      for (const window of entry.windows) {
        if (!window.visible) continue
        safeSetWindowVisible(window, false, connector)
      }
    }
    for (const [connector, info] of currentByConnector) {
      const entry = registry.get(connector)
      if (entry) rebindMonitor(entry, info.monitor, info.index)
    }
    for (const connector of diff.toAdd) {
      const info = currentByConnector.get(connector)
      if (info) addMonitor(info.monitor, info.index)
    }

    // connector 未確定の monitor は watch 登録（reconcile 再実行は notify::connector 側で）
    current.forEach((m) => {
      const c = m.get_connector()
      if (!c || c.length === 0) watchPendingConnector(m)
    })
  }

  function disposeAll(): void {
    log(`disposeAll: registry=${registry.size}, pending=${pending.size}`)
    for (const m of [...pending.keys()]) unwatchPending(m)
    for (const entry of registry.values()) {
      entry.disconnectMonitorSignals()
    }
    registry.clear()
  }

  return { addMonitor, removeMonitor, reconcile, disposeAll, registry }
}

export function getMonitorsListModel(): Gio.ListModel<Gdk.Monitor> {
  const display = Gdk.Display.get_default()
  if (!display) throw new Error("monitor-registry: no default Gdk.Display")
  return display.get_monitors() as Gio.ListModel<Gdk.Monitor>
}
