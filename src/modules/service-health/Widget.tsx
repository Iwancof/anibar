import { Gtk } from "ags/gtk4"

import ModuleCard from "../../shared/ui/ModuleCard.tsx"

import type { Accessor } from "gnim"

import type { ServiceHealthViewModel } from "./view-model.ts"

export interface ServiceHealthWidgetProps {
  model: Accessor<ServiceHealthViewModel>
}

export default function ServiceHealthWidget(props: ServiceHealthWidgetProps) {
  return (
    <ModuleCard
      title={props.model((viewModel) => viewModel.title)}
      headline={props.model((viewModel) => viewModel.headline)}
      detail={props.model((viewModel) => viewModel.detail)}
      meta={props.model((viewModel) => viewModel.meta)}
      footer={props.model((viewModel) => viewModel.footer)}
      tone={props.model((viewModel) => viewModel.tone)}
    >
      <box class="ServiceRows" orientation={Gtk.Orientation.VERTICAL} spacing={6}>
        {props.model((viewModel) =>
          viewModel.rows.map((row) => (
            <centerbox class="ServiceRow">
              <label $type="start" xalign={0} label={row.label} />
              <label $type="end" xalign={1} label={row.state} />
            </centerbox>
          )),
        )}
      </box>
    </ModuleCard>
  )
}
