import ModuleCard from "../../shared/ui/ModuleCard.tsx"

import type { Accessor } from "gnim"

import type { BatteryViewModel } from "./view-model.ts"

export interface BatteryWidgetProps {
  model: Accessor<BatteryViewModel>
}

export default function BatteryWidget(props: BatteryWidgetProps) {
  return (
    <ModuleCard
      title={props.model((viewModel) => viewModel.title)}
      headline={props.model((viewModel) => viewModel.headline)}
      detail={props.model((viewModel) => viewModel.detail)}
      meta={props.model((viewModel) => viewModel.meta)}
      footer={props.model((viewModel) => viewModel.footer)}
      tone={props.model((viewModel) => viewModel.tone)}
    />
  )
}
