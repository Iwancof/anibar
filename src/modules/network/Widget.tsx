import ModuleCard from "../../shared/ui/ModuleCard.tsx"

import type { Accessor } from "gnim"

import type { NetworkViewModel } from "./view-model.ts"

export interface NetworkWidgetProps {
  model: Accessor<NetworkViewModel>
}

export default function NetworkWidget(props: NetworkWidgetProps) {
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
