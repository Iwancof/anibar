import type { HealthTone } from "../../shared/health.ts"

export interface BluetoothAdapterSnapshot {
  path: string
  name: string
  address: string
  powered: boolean
  discovering: boolean
}

export interface BluetoothDeviceSnapshot {
  path: string
  adapterPath: string
  address: string
  name: string
  icon: string | null
  paired: boolean
  trusted: boolean
  connected: boolean
  rssi: number | null
  batteryPercent: number | null
}

export interface BluetoothSnapshot {
  available: boolean
  adapters: BluetoothAdapterSnapshot[]
  devices: BluetoothDeviceSnapshot[]
}

export type BluezManagedObjects = Record<string, Record<string, Record<string, unknown>>>

const ADAPTER_INTERFACE = "org.bluez.Adapter1"
const DEVICE_INTERFACE = "org.bluez.Device1"
const BATTERY_INTERFACE = "org.bluez.Battery1"

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

function asBoolean(value: unknown): boolean {
  return typeof value === "boolean" ? value : false
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function inferAdapterPath(devicePath: string): string | null {
  const marker = "/dev_"
  const index = devicePath.indexOf(marker)
  if (index <= 0) {
    return null
  }

  return devicePath.slice(0, index)
}

function deviceName(props: Record<string, unknown>, address: string): string {
  return asString(props.Alias) ?? asString(props.Name) ?? address
}

function sortByPath<T extends { path: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => left.path.localeCompare(right.path))
}

function sortDevices(devices: BluetoothDeviceSnapshot[]): BluetoothDeviceSnapshot[] {
  return [...devices].sort((left, right) => {
    if (left.connected !== right.connected) {
      return left.connected ? -1 : 1
    }

    return (
      left.name.localeCompare(right.name) ||
      left.address.localeCompare(right.address) ||
      left.path.localeCompare(right.path)
    )
  })
}

export function parseManagedObjects(objects: BluezManagedObjects): BluetoothSnapshot {
  const adapters: BluetoothAdapterSnapshot[] = []
  const batteryByPath = new Map<string, number>()

  for (const [path, interfaces] of Object.entries(objects)) {
    const adapter = interfaces[ADAPTER_INTERFACE]
    if (adapter) {
      const address = asString(adapter.Address) ?? ""
      adapters.push({
        path,
        name: (asString(adapter.Alias) ?? asString(adapter.Name) ?? address) || path,
        address,
        powered: asBoolean(adapter.Powered),
        discovering: asBoolean(adapter.Discovering),
      })
    }

    const battery = interfaces[BATTERY_INTERFACE]
    if (battery) {
      const percent = asNumber(battery.Percentage)
      if (percent != null) {
        batteryByPath.set(path, percent)
      }
    }
  }

  const devices: BluetoothDeviceSnapshot[] = []

  for (const [path, interfaces] of Object.entries(objects)) {
    const device = interfaces[DEVICE_INTERFACE]
    if (!device) {
      continue
    }

    const address = asString(device.Address)
    if (!address) {
      continue
    }

    const adapterPath = asString(device.Adapter) ?? inferAdapterPath(path)
    if (!adapterPath) {
      continue
    }

    devices.push({
      path,
      adapterPath,
      address,
      name: deviceName(device, address),
      icon: asString(device.Icon),
      paired: asBoolean(device.Paired),
      trusted: asBoolean(device.Trusted),
      connected: asBoolean(device.Connected),
      rssi: asNumber(device.RSSI),
      batteryPercent: batteryByPath.get(path) ?? null,
    })
  }

  const sortedAdapters = sortByPath(adapters)

  return {
    available: sortedAdapters.length > 0,
    adapters: sortedAdapters,
    devices: sortDevices(devices),
  }
}

export function defaultAdapter(snapshot: BluetoothSnapshot): BluetoothAdapterSnapshot | null {
  return snapshot.adapters[0] ?? null
}

export function connectedDevices(snapshot: BluetoothSnapshot): BluetoothDeviceSnapshot[] {
  return snapshot.devices.filter((device) => device.connected)
}

export function bluetoothTone(snapshot: BluetoothSnapshot): HealthTone {
  if (!snapshot.available || !snapshot.adapters.some((adapter) => adapter.powered)) {
    return "muted"
  }

  if (connectedDevices(snapshot).some((device) => device.batteryPercent != null && device.batteryPercent <= 20)) {
    return "warning"
  }

  return "healthy"
}
