import GLib from "gi://GLib?version=2.0"
import Pango from "gi://Pango?version=1.0"
import PangoCairo from "gi://PangoCairo?version=1.0"

import { Gtk } from "ags/gtk4"
import { createMemo } from "gnim"

import type { PlayerSource } from "../../runtime/player-source.ts"
import { scopedTimeoutAdd } from "../../shared/runtime/scoped-timeout.ts"
import { COLORS } from "../../shared/theme-tokens.ts"

const VISIBLE_WIDTH = 200
const VISIBLE_HEIGHT = 20
const SCROLL_SPEED_PX = 0.75
const SCROLL_INTERVAL_MS = 30
const PAUSE_MS = 2000
const PAUSE_TICKS = Math.ceil(PAUSE_MS / SCROLL_INTERVAL_MS)
const MUTED_RGB = COLORS.rgb["colors-muted"]

export interface PlayerWidgetProps {
  player: PlayerSource
}

export default function PlayerWidget(props: PlayerWidgetProps) {
  const { player } = props

  const visible = createMemo(() => player.snapshot() != null)
  const playIcon = player.isPlaying((p) => (p ? "\u23F8" : "\u25B6"))

  let textWidth = 0
  let lastText = ""
  let offsetPx = 0
  let direction = 1 // 1 = right scroll (text moves left), -1 = reverse
  let pauseTicks = PAUSE_TICKS // start paused
  let drawingArea: Gtk.DrawingArea | null = null

  scopedTimeoutAdd(GLib.PRIORITY_DEFAULT, SCROLL_INTERVAL_MS, () => {
    const text = player.label()
    if (text !== lastText) {
      lastText = text
      offsetPx = 0
      direction = 1
      pauseTicks = PAUSE_TICKS
      textWidth = 0
    }

    const maxOffset = textWidth - VISIBLE_WIDTH
    if (maxOffset > 0) {
      if (pauseTicks > 0) {
        pauseTicks--
      } else {
        offsetPx += SCROLL_SPEED_PX * direction
        if (offsetPx >= maxOffset) {
          offsetPx = maxOffset
          direction = -1
          pauseTicks = PAUSE_TICKS
        } else if (offsetPx <= 0) {
          offsetPx = 0
          direction = 1
          pauseTicks = PAUSE_TICKS
        }
      }
    }

    if (drawingArea) drawingArea.queue_draw()
    return GLib.SOURCE_CONTINUE
  }, "PlayerWidget")

  return (
    <box class="Player" spacing={6} valign={Gtk.Align.CENTER} visible={visible}>
      <Gtk.DrawingArea
        widthRequest={VISIBLE_WIDTH}
        heightRequest={VISIBLE_HEIGHT}
        hexpand={false}
        valign={Gtk.Align.CENTER}
        onRealize={(self: Gtk.DrawingArea) => {
          drawingArea = self
          self.set_draw_func((_area, cr, _w, _h) => {
            const text = player.label()
            if (!text) return

            const layout = PangoCairo.create_layout(cr)
            const fontDesc = Pango.FontDescription.from_string(
              "Noto Sans Mono CJK JP 12",
            )
            layout.set_font_description(fontDesc)
            layout.set_text(text, -1)

            const [tw, th] = layout.get_pixel_size()
            textWidth = tw

            cr.setSourceRGBA(MUTED_RGB[0], MUTED_RGB[1], MUTED_RGB[2], 1)
            const y = (VISIBLE_HEIGHT - th) / 2
            cr.moveTo(-offsetPx, y)
            PangoCairo.show_layout(cr, layout)
          })
        }}
      />
      <button class="PlayerBtn" valign={Gtk.Align.CENTER} onClicked={() => player.previous()}>
        <label label={"\u23EE"} class="PlayerBtnIcon" />
      </button>
      <button class="PlayerBtn" valign={Gtk.Align.CENTER} onClicked={() => player.playPause()}>
        <label label={playIcon} class="PlayerBtnIcon" />
      </button>
      <button class="PlayerBtn" valign={Gtk.Align.CENTER} onClicked={() => player.next()}>
        <label label={"\u23ED"} class="PlayerBtnIcon" />
      </button>
    </box>
  )
}
