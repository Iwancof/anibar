import { Gtk } from "ags/gtk4"

import type { Accessor } from "gnim"

import type { AppModules } from "../../modules/index.ts"
import BatteryWidget from "../../modules/battery/Widget.tsx"
import NetworkWidget from "../../modules/network/Widget.tsx"
import ServiceHealthWidget from "../../modules/service-health/Widget.tsx"
import VolumeWidget from "../../modules/volume/Widget.tsx"

export interface DashboardViewProps {
  modules: AppModules
  clock: Accessor<string>
  hostname: string
  onClose?: () => void
}

export default function DashboardView(props: DashboardViewProps) {
  return (
    <box class="DashboardShell" orientation={Gtk.Orientation.HORIZONTAL} hexpand vexpand>
      <box hexpand vexpand />
      <box class="DashboardPanel" orientation={Gtk.Orientation.VERTICAL} spacing={16}>
        <centerbox class="DashboardHeader">
          <box $type="start" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
            <label class="DashboardEyebrow" xalign={0} label="AGS Overlay Dashboard" />
            <label class="DashboardTitle" xalign={0} label={props.clock} />
            <label class="DashboardSubtitle" xalign={0} label={`host ${props.hostname}`} />
          </box>
          {props.onClose ? (
            <button $type="end" class="DashboardClose" onClicked={props.onClose}>
              <label label="Close" />
            </button>
          ) : null}
        </centerbox>

        <label
          class="DashboardHint"
          halign={Gtk.Align.START}
          xalign={0}
          wrap
          label="Overlay first, modules second. Every card is backed by a swappable runtime adapter and a pure view-model."
        />

        <box class="DashboardCards" orientation={Gtk.Orientation.VERTICAL} spacing={12}>
          <VolumeWidget model={props.modules.volume.viewModel} />
          <BatteryWidget model={props.modules.battery.viewModel} />
          <NetworkWidget model={props.modules.network.viewModel} />
          <ServiceHealthWidget model={props.modules.serviceHealth.viewModel} />
        </box>
      </box>
    </box>
  )
}
