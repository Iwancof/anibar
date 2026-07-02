import { formatPercent, placeholder } from "../../shared/format.ts"
import type { HealthTone } from "../../shared/health.ts"

import {
  bluetoothTone,
  connectedDevices,
  defaultAdapter,
  type BluetoothAdapterSnapshot,
  type BluetoothDeviceSnapshot,
  type BluetoothSnapshot,
} from "./domain.ts"

export interface BluetoothDeviceRowViewModel {
  path: string
  adapterPath: string
  label: string
  detail: string
  icon: string | null
  batteryLabel: string
  rssiLabel: string
  connected: boolean
  paired: boolean
  trusted: boolean
  tone: HealthTone
}

export interface BluetoothViewModel {
  title: string
  adapter: BluetoothAdapterSnapshot | null
  adapterLabel: string
  adapterMeta: string
  summary: string
  scanLabel: string
  connectedCount: number
  devices: BluetoothDeviceRowViewModel[]
  tone: HealthTone
}

function formatBattery(value: number | null): string {
  return placeholder(value == null ? null : formatPercent(value))
}

function formatRssi(value: number | null): string {
  return placeholder(value == null ? null : `${value} dBm`)
}

function deviceTone(device: BluetoothDeviceSnapshot): HealthTone {
  if (device.connected && device.batteryPercent != null && device.batteryPercent <= 20) {
    return "warning"
  }

  return device.connected ? "healthy" : "muted"
}

function deviceDetail(device: BluetoothDeviceSnapshot): string {
  const link = device.connected ? "LINK::UP" : "LINK::DOWN"
  const pair = device.paired ? "PAIRED" : "KNOWN"
  const trust = device.trusted ? "TRUSTED" : "UNTRUSTED"

  return `${link} / ${pair} / ${trust}`
}

function toDeviceRow(device: BluetoothDeviceSnapshot): BluetoothDeviceRowViewModel {
  return {
    path: device.path,
    adapterPath: device.adapterPath,
    label: device.name,
    detail: deviceDetail(device),
    icon: device.icon,
    batteryLabel: formatBattery(device.batteryPercent),
    rssiLabel: formatRssi(device.rssi),
    connected: device.connected,
    paired: device.paired,
    trusted: device.trusted,
    tone: deviceTone(device),
  }
}

function adapterMeta(adapter: BluetoothAdapterSnapshot | null): string {
  if (!adapter) {
    return "DBUS::DOWN"
  }

  return `${adapter.path} / ${placeholder(adapter.address)}`
}

function summaryFor(snapshot: BluetoothSnapshot, adapter: BluetoothAdapterSnapshot | null, connectedCount: number): string {
  if (!snapshot.available || !adapter) {
    return "DBUS::DOWN"
  }

  if (!adapter.powered) {
    return "POWER::OFF"
  }

  if (adapter.discovering) {
    return "SCAN::ACTIVE"
  }

  if (connectedCount > 0) {
    return `LINK::UP ${connectedCount}`
  }

  return "SCAN::IDLE"
}

export function toBluetoothViewModel(snapshot: BluetoothSnapshot): BluetoothViewModel {
  const adapter = defaultAdapter(snapshot)
  const connectedCount = connectedDevices(snapshot).length

  return {
    title: "BT::DEVICES",
    adapter,
    adapterLabel: adapter?.name ?? "NO ADAPTER",
    adapterMeta: adapterMeta(adapter),
    summary: summaryFor(snapshot, adapter, connectedCount),
    scanLabel: adapter?.discovering ? "SCAN::ACTIVE" : "SCAN::IDLE",
    connectedCount,
    devices: snapshot.devices.map(toDeviceRow),
    tone: bluetoothTone(snapshot),
  }
}
