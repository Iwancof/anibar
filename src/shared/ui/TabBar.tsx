import type { Accessor } from "gnim"

export interface TabBarItem<T extends string = string> {
  id: T
  label: string
}

export interface TabBarProps<T extends string = string> {
  tabs: TabBarItem<T>[]
  active: Accessor<T>
  onSelect: (id: T) => void
  variant?: "underline" | "filled"
  class?: string
}

export default function TabBar<T extends string>(props: TabBarProps<T>) {
  const variant = props.variant ?? "underline"
  const rootClass = props.class ? `UiTabBar UiTabBar${capitalize(variant)} ${props.class}` : `UiTabBar UiTabBar${capitalize(variant)}`

  return (
    <box class={rootClass} spacing={0}>
      {props.tabs.map((tab) => (
        <button
          class={props.active((active) =>
            active === tab.id ? "UiTabButton UiTabButtonActive" : "UiTabButton",
          )}
          onClicked={() => props.onSelect(tab.id)}
        >
          <label label={tab.label.toUpperCase()} />
        </button>
      ))}
    </box>
  )
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
