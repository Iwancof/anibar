import Gio from "gi://Gio?version=2.0"
import GLib from "gi://GLib?version=2.0"
import { createState } from "gnim"

import {
  parseManagedObjects,
  type BluezManagedObjects,
  type BluetoothSnapshot,
} from "../modules/bluetooth/domain.ts"
import type { BluetoothSource, BtActionResult } from "../modules/bluetooth/ports.ts"

const BLUEZ_BUS_NAME = "org.bluez"
const BLUEZ_PATH_PREFIX = "/org/bluez/"
const DBUS_BUS_NAME = "org.freedesktop.DBus"
const DBUS_OBJECT_PATH = "/org/freedesktop/DBus"
const OBJECT_MANAGER_INTERFACE = "org.freedesktop.DBus.ObjectManager"
const PROPERTIES_INTERFACE = "org.freedesktop.DBus.Properties"
const ADAPTER_INTERFACE = "org.bluez.Adapter1"
const DEVICE_INTERFACE = "org.bluez.Device1"
const REFRESH_DEBOUNCE_MS = 500
const INITIAL_RACE_REFRESH_MS = 1_000
const DEVICE_ACTION_TIMEOUT_MS = 30_000

const UNAVAILABLE_SNAPSHOT: BluetoothSnapshot = {
  available: false,
  adapters: [],
  devices: [],
}

const okResult: BtActionResult = { ok: true }

function asManagedObjects(value: unknown): BluezManagedObjects | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as BluezManagedObjects
  }

  return null
}

function dbusErrorCode(errorName: string | null): string {
  if (!errorName) return "Failed"

  return errorName.split(".").pop() || "Failed"
}

function dbusErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function actionError(error: unknown): BtActionResult {
  let remoteErrorName: string | null = null

  try {
    remoteErrorName = Gio.DBusError.get_remote_error(error as GLib.Error)
  } catch {}

  const fallbackName = error instanceof Error && error.name ? error.name : null

  return {
    ok: false,
    code: dbusErrorCode(remoteErrorName ?? fallbackName),
    message: dbusErrorMessage(error),
  }
}

export function createBluetoothSource(): BluetoothSource {
  const bus = Gio.DBus.system
  const [snapshot, setSnapshot] = createState<BluetoothSnapshot>(UNAVAILABLE_SNAPSHOT)
  const ownedDiscoveryAdapters = new Map<string, true>()
  let refreshSourceId = 0

  function setUnavailableSnapshot(): void {
    setSnapshot(UNAVAILABLE_SNAPSHOT)
  }

  function refreshSnapshot(): Promise<void> {
    return new Promise((resolve) => {
      bus.call(
        BLUEZ_BUS_NAME,
        "/",
        OBJECT_MANAGER_INTERFACE,
        "GetManagedObjects",
        null,
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null,
        (connection, result) => {
          try {
            const reply = connection.call_finish<"(a{oa{sa{sv}}})">(result)
            const [objects] = reply.recursiveUnpack<[unknown]>()
            const managedObjects = asManagedObjects(objects)
            if (!managedObjects) {
              setUnavailableSnapshot()
              return
            }

            setSnapshot(parseManagedObjects(managedObjects))
          } catch {
            setUnavailableSnapshot()
          } finally {
            resolve()
          }
        },
      )
    })
  }

  function scheduleRefresh(): void {
    if (refreshSourceId !== 0) return

    refreshSourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, REFRESH_DEBOUNCE_MS, () => {
      refreshSourceId = 0
      refreshSnapshot()
      return GLib.SOURCE_REMOVE
    })
  }

  function callBluezMethod(
    objectPath: string,
    interfaceName: string,
    methodName: string,
    parameters: GLib.Variant | null = null,
    timeoutMs = -1,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      bus.call(
        BLUEZ_BUS_NAME,
        objectPath,
        interfaceName,
        methodName,
        parameters,
        null,
        Gio.DBusCallFlags.NONE,
        timeoutMs,
        null,
        (connection, result) => {
          try {
            connection.call_finish(result)
            resolve()
          } catch (error) {
            reject(error)
          }
        },
      )
    })
  }

  async function runAction(action: () => Promise<void>): Promise<BtActionResult> {
    try {
      await action()
      await refreshSnapshot()
      return okResult
    } catch (error) {
      return actionError(error)
    }
  }

  function subscribeSignals(): number[] {
    return [
      bus.signal_subscribe(
        BLUEZ_BUS_NAME,
        PROPERTIES_INTERFACE,
        "PropertiesChanged",
        null,
        null,
        Gio.DBusSignalFlags.NONE,
        (_connection, _senderName, objectPath) => {
          if (objectPath.startsWith(BLUEZ_PATH_PREFIX)) {
            scheduleRefresh()
          }
        },
      ),
      bus.signal_subscribe(
        BLUEZ_BUS_NAME,
        OBJECT_MANAGER_INTERFACE,
        "InterfacesAdded",
        null,
        null,
        Gio.DBusSignalFlags.NONE,
        scheduleRefresh,
      ),
      bus.signal_subscribe(
        BLUEZ_BUS_NAME,
        OBJECT_MANAGER_INTERFACE,
        "InterfacesRemoved",
        null,
        null,
        Gio.DBusSignalFlags.NONE,
        scheduleRefresh,
      ),
      bus.signal_subscribe(
        DBUS_BUS_NAME,
        DBUS_BUS_NAME,
        "NameOwnerChanged",
        DBUS_OBJECT_PATH,
        BLUEZ_BUS_NAME,
        Gio.DBusSignalFlags.NONE,
        (_connection, _senderName, _objectPath, _interfaceName, _signalName, parameters) => {
          const [_name, _oldOwner, newOwner] = parameters.recursiveUnpack<[string, string, string]>()

          // A bluetoothd restart invalidates discovery sessions owned by this process.
          // Clear local ownership and publish unavailable immediately instead of waiting
          // for a failed ObjectManager refresh to settle.
          if (newOwner.length === 0) {
            ownedDiscoveryAdapters.clear()
            setUnavailableSnapshot()
            return
          }

          refreshSnapshot()
        },
      ),
    ]
  }

  const signalSubscriptions = subscribeSignals()

  refreshSnapshot()
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, INITIAL_RACE_REFRESH_MS, () => {
    refreshSnapshot()
    return GLib.SOURCE_REMOVE
  })

  async function setPowered(adapterPath: string, on: boolean): Promise<BtActionResult> {
    return runAction(() =>
      callBluezMethod(
        adapterPath,
        PROPERTIES_INTERFACE,
        "Set",
        new GLib.Variant("(ssv)", [ADAPTER_INTERFACE, "Powered", GLib.Variant.new_boolean(on)]),
      ),
    )
  }

  async function connectDevice(path: string): Promise<BtActionResult> {
    return runAction(() =>
      callBluezMethod(path, DEVICE_INTERFACE, "Connect", null, DEVICE_ACTION_TIMEOUT_MS),
    )
  }

  async function disconnectDevice(path: string): Promise<BtActionResult> {
    return runAction(() =>
      callBluezMethod(path, DEVICE_INTERFACE, "Disconnect", null, DEVICE_ACTION_TIMEOUT_MS),
    )
  }

  async function startDiscovery(adapterPath: string): Promise<BtActionResult> {
    const result = await runAction(() => callBluezMethod(adapterPath, ADAPTER_INTERFACE, "StartDiscovery"))
    if (result.ok) {
      ownedDiscoveryAdapters.set(adapterPath, true)
    }

    return result
  }

  async function stopDiscovery(adapterPath: string): Promise<BtActionResult> {
    // BlueZ discovery is reference-counted per client. Only balance StartDiscovery
    // calls made by this source so AGS never stops another client's scan.
    if (!ownedDiscoveryAdapters.has(adapterPath)) {
      return okResult
    }

    const result = await runAction(() => callBluezMethod(adapterPath, ADAPTER_INTERFACE, "StopDiscovery"))
    if (result.ok) {
      ownedDiscoveryAdapters.delete(adapterPath)
    }

    return result
  }

  // Keep subscription IDs alive for this process-lifetime singleton. Runtime
  // sources in this app do not expose dispose(), so we intentionally do not
  // unsubscribe here.
  void signalSubscriptions

  return {
    snapshot,
    setPowered,
    connectDevice,
    disconnectDevice,
    startDiscovery,
    stopDiscovery,
  }
}
