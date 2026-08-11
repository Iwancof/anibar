import GLib from "gi://GLib?version=2.0"

import { Gtk } from "ags/gtk4"
import type { Accessor } from "gnim"

export interface PanelHeaderProps {
  title: string | Accessor<string>
  meta?: string | Accessor<string>
  dotClass?: string | Accessor<string>
}

// タイプライター表示: パネルが開くたびにタイトルを左から打ち出す。
// パネル展開 (450ms) と重ねてゆっくり見せる ~650ms の一発アニメ
const TYPE_INTERVAL_MS = 40
const TYPE_STEPS = 16
const CURSOR = "_"

function attachTypewriter(label: Gtk.Label, text: string): void {
  let sourceId = 0

  const stop = () => {
    if (sourceId) {
      GLib.source_remove(sourceId)
      sourceId = 0
    }
  }

  const start = () => {
    stop()
    const len = text.length
    if (len === 0) return
    // 幅を先に確保してヘッダのレイアウトが踊らないようにする
    label.set_width_chars(len + 1)
    const step = Math.max(1, Math.ceil(len / TYPE_STEPS))
    let shown = 0
    label.label = CURSOR
    sourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, TYPE_INTERVAL_MS, () => {
      shown = Math.min(len, shown + step)
      label.label = shown >= len ? text : text.slice(0, shown) + CURSOR
      if (shown >= len) {
        sourceId = 0
        return GLib.SOURCE_REMOVE
      }
      return GLib.SOURCE_CONTINUE
    })
  }

  label.connect("map", start)
  label.connect("unmap", stop)
}

export default function PanelHeader(props: PanelHeaderProps) {
  const dotClass = props.dotClass ?? "UiPanelHeaderDot UiPanelHeaderDotAccent"
  const staticTitle = typeof props.title === "string" ? props.title : null

  return (
    <box class="UiPanelHeader" spacing={8}>
      <box class={dotClass} widthRequest={7} heightRequest={7} valign={Gtk.Align.CENTER} />
      <label
        class="UiPanelHeaderTitle"
        label={staticTitle == null ? props.title : ""}
        halign={Gtk.Align.START}
        xalign={0}
        hexpand
        onRealize={(self: Gtk.Label) => {
          // Accessor タイトルは動的更新があるためタイプライターは静的文字列のみ
          if (staticTitle != null) attachTypewriter(self, staticTitle)
        }}
      />
      <label
        class="UiPanelHeaderMeta"
        label={props.meta ?? ""}
        visible={props.meta ? true : false}
        halign={Gtk.Align.END}
      />
    </box>
  )
}
