import app from "ags/gtk4/app"
import { Gtk } from "ags/gtk4"

export interface PreviewWindowProps {
  title: string
  subtitle: string
  width?: number
  height?: number
  children?: any
}

export default function PreviewWindow(props: PreviewWindowProps) {
  return (
    <window
      application={app}
      class="PreviewWindow"
      visible
      title={props.title}
      defaultWidth={props.width ?? 920}
      defaultHeight={props.height ?? 720}
    >
      <box class="PreviewRoot" orientation={Gtk.Orientation.VERTICAL} spacing={16}>
        <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
          <label class="PreviewTitle" halign={Gtk.Align.START} xalign={0} label={props.title} />
          <label
            class="PreviewSubtitle"
            halign={Gtk.Align.START}
            xalign={0}
            wrap
            label={props.subtitle}
          />
        </box>
        <box class="PreviewBody" orientation={Gtk.Orientation.VERTICAL} spacing={12}>
          {props.children}
        </box>
      </box>
    </window>
  )
}
