import GLib from "gi://GLib?version=2.0"

import { Astal, Gdk, Gtk } from "ags/gtk4"
import { createMemo, createState } from "gnim"
import type { Accessor } from "gnim"

import { closeBluetoothPopup } from "../../app/controllers.ts"
import {
  defaultAdapter,
  type BluetoothDeviceSnapshot,
  type BluetoothSnapshot,
} from "../../modules/bluetooth/domain.ts"
import type { BtActionResult } from "../../modules/bluetooth/ports.ts"
import { fixedSlots } from "../../shared/fixed-slots.ts"
import { placeholder } from "../../shared/format.ts"
import { DIM } from "../../shared/theme-tokens.ts"
import CommandButton from "../../shared/ui/CommandButton.tsx"
import Icon from "../../shared/ui/Icon.tsx"
import PanelHeader from "../../shared/ui/PanelHeader.tsx"
import PopupShell from "../../shared/ui/PopupShell.tsx"
import SectionHeader from "../../shared/ui/SectionHeader.tsx"
import ToggleRow from "../../shared/ui/ToggleRow.tsx"
import { bluetoothDeviceIcon, ICONS } from "../../shared/ui/icons.ts"

const MAX_DEVICES = 10
const ERROR_VISIBLE_MS = 4_000

export interface BluetoothPopupProps extends BluetoothPopupViewProps {
  gdkmonitor: Gdk.Monitor
  monitor: string
}

export interface BluetoothPopupViewProps {
  snapshot: Accessor<BluetoothSnapshot>
  onSetPowered: (adapterPath: string, on: boolean) => Promise<BtActionResult>
  onConnectDevice: (path: string) => Promise<BtActionResult>
  onDisconnectDevice: (path: string) => Promise<BtActionResult>
  onStartDiscovery: (adapterPath: string) => Promise<BtActionResult>
  onStopDiscovery: (adapterPath: string) => Promise<BtActionResult>
}

function headerMeta(snapshot: BluetoothSnapshot): string {
  const adapter = defaultAdapter(snapshot)
  if (!adapter) return "HCI::NONE"
  return adapter.powered ? "PWR::ON" : "PWR::OFF"
}

function emptyDeviceLabel(snapshot: BluetoothSnapshot): string {
  if (!snapshot.available) return "DBUS::DOWN"
  if (!defaultAdapter(snapshot)) return "HCI::NONE"
  return "NO DEVICES"
}

function batteryLabel(device: BluetoothDeviceSnapshot | null): string {
  if (device?.batteryPercent == null) return placeholder(null)
  return `${ICONS.batteryPercent} ${Math.round(device.batteryPercent)}`
}

function actionLabel(device: BluetoothDeviceSnapshot | null): string {
  return device?.connected ? "DISCONNECT" : "CONNECT"
}

function sanitizeErrorMessage(message: string): string {
  return message.replace(/\s+/g, " ").trim()
}

export function BluetoothPopupView(props: BluetoothPopupViewProps) {
  const adapter = createMemo(() => defaultAdapter(props.snapshot()))
  const devices = createMemo(() => props.snapshot().devices.slice(0, MAX_DEVICES))
  const headerRight = createMemo(() => headerMeta(props.snapshot()))
  const headerDotClass = createMemo(() => {
    const a = adapter()
    if (!a?.powered) return "UiPanelHeaderDot"
    if (a.discovering) return "UiPanelHeaderDot UiPanelHeaderDotAccent BtPanelHeaderDotPulse"
    return "UiPanelHeaderDot UiPanelHeaderDotAccent"
  })
  const powerActive = createMemo(() => adapter()?.powered ?? false)
  const scanLabel = createMemo(() => adapter()?.discovering ? "STOP SCAN" : "SCAN")
  const deviceCountMeta = createMemo(() => `${devices().length}/${MAX_DEVICES}`)
  const emptyLabel = createMemo(() => emptyDeviceLabel(props.snapshot()))

  const [errorText, setErrorText] = createState("")
  let errorTimer = 0

  function showError(code: string, message: string): void {
    if (errorTimer !== 0) {
      GLib.source_remove(errorTimer)
      errorTimer = 0
    }

    setErrorText(`ERR::${code} ${sanitizeErrorMessage(message)}`)
    errorTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, ERROR_VISIBLE_MS, () => {
      setErrorText("")
      errorTimer = 0
      return GLib.SOURCE_REMOVE
    })
  }

  async function runAction(action: () => Promise<BtActionResult>): Promise<void> {
    const result = await action()
    if (!result.ok) {
      showError(result.code, result.message)
    }
  }

  function handlePowerToggle(on: boolean): void {
    const a = adapter()
    if (!a) {
      showError("HCI::NONE", "adapter unavailable")
      return
    }

    void runAction(() => props.onSetPowered(a.path, on))
  }

  function handleScan(): void {
    const a = adapter()
    if (!a) {
      showError("HCI::NONE", "adapter unavailable")
      return
    }

    void runAction(() => a.discovering ? props.onStopDiscovery(a.path) : props.onStartDiscovery(a.path))
  }

  function handleDeviceAction(device: BluetoothDeviceSnapshot): void {
    void runAction(() =>
      device.connected ? props.onDisconnectDevice(device.path) : props.onConnectDevice(device.path),
    )
  }

  return (
    <box class="BtView" orientation={Gtk.Orientation.VERTICAL} spacing={0} widthRequest={DIM["panel-side"]}>
      <PanelHeader title="BT::DEVICES" meta={headerRight} dotClass={headerDotClass} />
      <box class="BtBody UiPanelBody" orientation={Gtk.Orientation.VERTICAL} spacing={12}>
        <box class="BtSection" orientation={Gtk.Orientation.VERTICAL} spacing={8}>
          <SectionHeader label="ADAPTER" />
          <box class="BtAdapterControls" spacing={10}>
            <box hexpand>
              <ToggleRow
                label="Power"
                subLabel="HCI::PWR"
                active={powerActive}
                onToggle={handlePowerToggle}
              />
            </box>
            <CommandButton
              class="BtScanButton"
              label={scanLabel}
              widthRequest={96}
              onClicked={handleScan}
            />
          </box>
        </box>

        <box class="BtSection" orientation={Gtk.Orientation.VERTICAL} spacing={8}>
          <SectionHeader label="DEVICES" meta={deviceCountMeta} />
          <box class="BtDeviceList" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
            {fixedSlots(MAX_DEVICES).map((i) => (
              <BluetoothDeviceSlot
                index={i}
                devices={devices}
                emptyLabel={emptyLabel}
                onAction={handleDeviceAction}
              />
            ))}
          </box>
        </box>
      </box>
      <label
        class="BtErrorRow"
        label={errorText}
        visible={errorText((value) => value.length > 0)}
        xalign={0}
        maxWidthChars={42}
        ellipsize={3}
      />
    </box>
  )
}

function BluetoothDeviceSlot(props: {
  index: number
  devices: Accessor<BluetoothDeviceSnapshot[]>
  emptyLabel: Accessor<string>
  onAction: (device: BluetoothDeviceSnapshot) => void
}) {
  const device = createMemo(() => props.devices()[props.index] ?? null)
  const hasDevice = createMemo(() => device() != null)
  const rowClass = createMemo(() => {
    const d = device()
    if (!d) return "BtDeviceRow BtDeviceRowEmpty"
    return d.connected ? "BtDeviceRow BtDeviceRowConnected" : "BtDeviceRow"
  })
  const icon = createMemo(() => bluetoothDeviceIcon(device()?.icon))
  const name = createMemo(() => device()?.name ?? "")
  const battery = createMemo(() => batteryLabel(device()))
  const command = createMemo(() => actionLabel(device()))
  const empty = createMemo(() =>
    props.devices().length === 0 && props.index === 0 ? props.emptyLabel() : "",
  )

  return (
    <box class={rowClass} spacing={9} valign={Gtk.Align.CENTER}>
      <Icon
        class="BtDeviceIcon"
        icon={icon}
        visible={hasDevice}
        widthRequest={22}
        valign={Gtk.Align.CENTER}
      />
      <label
        class="BtDeviceEmpty"
        label={empty}
        visible={empty((value) => value.length > 0)}
        hexpand
        halign={Gtk.Align.START}
        xalign={0}
      />
      <label
        class="BtDeviceName"
        label={name}
        visible={hasDevice}
        hexpand
        halign={Gtk.Align.START}
        xalign={0}
        ellipsize={3}
        maxWidthChars={22}
      />
      <label
        class="BtDeviceBattery"
        label={battery}
        visible={hasDevice}
        widthRequest={48}
        halign={Gtk.Align.END}
        xalign={1}
      />
      <CommandButton
        class="BtDeviceCommand"
        label={command}
        visible={hasDevice}
        widthRequest={96}
        onClicked={() => {
          const d = device()
          if (d) props.onAction(d)
        }}
      />
    </box>
  )
}

export default function BluetoothPopup(props: BluetoothPopupProps) {
  return (
    <PopupShell
      name={`bluetooth-popup:${props.monitor}`}
      windowClass="BtPopup"
      gdkmonitor={props.gdkmonitor}
      exclusivity={Astal.Exclusivity.NORMAL}
      keymode={Astal.Keymode.ON_DEMAND}
      layer={Astal.Layer.TOP}
      contentHalign={Gtk.Align.END}
      contentValign={Gtk.Align.START}
      onClose={closeBluetoothPopup}
    >
      <box class="BtPopupPanel UiPanel">
        <BluetoothPopupView
          snapshot={props.snapshot}
          onSetPowered={props.onSetPowered}
          onConnectDevice={props.onConnectDevice}
          onDisconnectDevice={props.onDisconnectDevice}
          onStartDiscovery={props.onStartDiscovery}
          onStopDiscovery={props.onStopDiscovery}
        />
      </box>
    </PopupShell>
  )
}
