import { Gtk } from "ags/gtk4"
import type { Accessor } from "gnim"

export type NotificationCardVariant = "popup" | "history" | "mini"

export interface NotificationCardProps {
  variant: NotificationCardVariant
  urgency: number | Accessor<number>
  appName: string | Accessor<string>
  time: string | Accessor<string>
  summary: string | Accessor<string>
  body?: string | Accessor<string>
  bodyVisible?: boolean | Accessor<boolean>
  iconName?: string | Accessor<string>
  iconVisible?: boolean | Accessor<boolean>
  widthRequest?: number
  timerHeight?: number
  onTimerRealize?: (self: Gtk.DrawingArea) => void
  onClicked?: () => void
  visible?: boolean | Accessor<boolean>
}

function urgencyClass(urgency: number): string {
  if (urgency === 2) return "UiNotificationCardToneCritical"
  if (urgency === 0) return "UiNotificationCardToneLow"
  return "UiNotificationCardToneNormal"
}

function cardClass(props: NotificationCardProps): string | Accessor<string> {
  const prefix = `UiNotificationCard UiNotificationCard${capitalize(props.variant)}`
  if (typeof props.urgency === "function") {
    return props.urgency((value) => `${prefix} ${urgencyClass(value)}`)
  }
  return `${prefix} ${urgencyClass(props.urgency)}`
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export default function NotificationCard(props: NotificationCardProps) {
  const hasIcon = props.iconVisible ?? false
  const hasBody = props.bodyVisible ?? false
  const showTimer = props.variant === "popup" && props.onTimerRealize != null

  return (
    <button
      class={cardClass(props)}
      visible={props.visible ?? true}
      onClicked={props.onClicked ?? (() => {})}
    >
      <box orientation={Gtk.Orientation.VERTICAL} spacing={4} widthRequest={props.widthRequest}>
        <box spacing={10}>
          <image
            class="UiNotificationIcon"
            iconName={props.iconName ?? ""}
            pixelSize={24}
            visible={hasIcon}
            valign={Gtk.Align.START}
          />
          <box orientation={Gtk.Orientation.VERTICAL} spacing={2} hexpand>
            <box spacing={8}>
              <label class="UiNotificationApp" label={props.appName} hexpand halign={Gtk.Align.START} />
              <label class="UiNotificationTime" label={props.time} halign={Gtk.Align.END} />
            </box>
            <label
              class="UiNotificationSummary"
              label={props.summary}
              halign={Gtk.Align.START}
              maxWidthChars={props.variant === "history" ? 45 : 36}
              ellipsize={3}
            />
            <label
              class="UiNotificationBody"
              label={props.body ?? ""}
              visible={hasBody}
              halign={Gtk.Align.START}
              maxWidthChars={props.variant === "history" ? 45 : 36}
              ellipsize={3}
              wrap={props.variant === "popup"}
            />
          </box>
        </box>
        <Gtk.DrawingArea
          heightRequest={props.timerHeight ?? 3}
          hexpand
          visible={showTimer}
          onRealize={(self: Gtk.DrawingArea) => props.onTimerRealize?.(self)}
        />
      </box>
    </button>
  )
}
