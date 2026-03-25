import ModuleCard from "../../shared/ui/ModuleCard.tsx"

import type { Accessor } from "gnim"

import type { VolumeViewModel } from "./view-model.ts"

export interface VolumeWidgetProps {
  model: Accessor<VolumeViewModel>
}

export default function VolumeWidget(props: VolumeWidgetProps) {
  return (
    <ModuleCard
      title={props.model((vm) => vm.title)}
      headline={props.model((vm) => vm.headline)}
      detail={props.model((vm) => vm.detail)}
      meta={props.model((vm) => vm.meta ?? "")}
      footer={props.model((vm) => vm.footer ?? "")}
      tone={props.model((vm) => vm.tone)}
    />
  )
}
