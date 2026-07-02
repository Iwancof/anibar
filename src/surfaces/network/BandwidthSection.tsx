import GLib from "gi://GLib?version=2.0"
import { Gtk } from "ags/gtk4"
import { createMemo } from "gnim"
import type { Accessor } from "gnim"
import type { BandwidthSnapshot } from "../../runtime/bandwidth-source.ts"
import { scopedTimeoutAdd } from "../../shared/runtime/scoped-timeout.ts"
import { COLORS } from "../../shared/theme-tokens.ts"

export interface BandwidthSectionProps {
  bandwidthSnapshot: Accessor<BandwidthSnapshot>
}

function formatSpeed(bps: number): string {
  if (bps < 1024) return `${bps.toFixed(0)} B/s`
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`
  if (bps < 1024 * 1024 * 1024) return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`
  return `${(bps / (1024 * 1024 * 1024)).toFixed(2)} GB/s`
}

const CYAN = COLORS.rgb["np-cyan"]
const MAGENTA = COLORS.rgb["np-magenta"]

export default function BandwidthSection(props: BandwidthSectionProps) {
  const txLabel = createMemo(() => `TX ${formatSpeed(props.bandwidthSnapshot().currentTx)}`)
  const rxLabel = createMemo(() => `RX ${formatSpeed(props.bandwidthSnapshot().currentRx)}`)

  let drawingArea: any = null

  scopedTimeoutAdd(GLib.PRIORITY_DEFAULT, 500, () => {
    if (drawingArea) drawingArea.queue_draw()
    return GLib.SOURCE_CONTINUE
  }, "BandwidthSection")

  function drawSparkline(cr: any, w: number, h: number) {
    const snap = props.bandwidthSnapshot()
    const history = snap.history
    if (history.length < 2) return

    // Find max for scaling
    let maxVal = 0
    for (const s of history) {
      if (s.txBps > maxVal) maxVal = s.txBps
      if (s.rxBps > maxVal) maxVal = s.rxBps
    }
    if (maxVal === 0) maxVal = 1024 // minimum scale 1KB/s

    const padding = 2
    const graphW = w - padding * 2
    const graphH = h - padding * 2
    const stepX = graphW / (80 - 1)

    // Draw filled areas + lines for TX and RX
    const drawSeries = (
      getData: (s: { txBps: number; rxBps: number }) => number,
      color: readonly [number, number, number],
    ) => {
      const len = history.length
      const startX = padding + (80 - len) * stepX

      // Filled area
      cr.save()
      cr.moveTo(startX, padding + graphH)
      for (let i = 0; i < len; i++) {
        const x = startX + i * stepX
        const val = getData(history[i])
        const y = padding + graphH - (val / maxVal) * graphH
        cr.lineTo(x, y)
      }
      cr.lineTo(startX + (len - 1) * stepX, padding + graphH)
      cr.closePath()
      cr.setSourceRGBA(color[0], color[1], color[2], 0.1)
      cr.fill()
      cr.restore()

      // Line
      cr.save()
      cr.setLineWidth(1.5)
      cr.setSourceRGBA(color[0], color[1], color[2], 0.8)
      cr.moveTo(startX, padding + graphH - (getData(history[0]) / maxVal) * graphH)
      for (let i = 1; i < len; i++) {
        const x = startX + i * stepX
        const val = getData(history[i])
        const y = padding + graphH - (val / maxVal) * graphH
        cr.lineTo(x, y)
      }
      cr.stroke()
      cr.restore()

      // Glow dot at latest point
      if (len > 0) {
        const lastVal = getData(history[len - 1])
        const lastX = startX + (len - 1) * stepX
        const lastY = padding + graphH - (lastVal / maxVal) * graphH

        // Outer glow
        cr.save()
        cr.arc(lastX, lastY, 4, 0, 2 * Math.PI)
        cr.setSourceRGBA(color[0], color[1], color[2], 0.3)
        cr.fill()
        cr.restore()

        // Inner dot
        cr.save()
        cr.arc(lastX, lastY, 2, 0, 2 * Math.PI)
        cr.setSourceRGBA(color[0], color[1], color[2], 1)
        cr.fill()
        cr.restore()
      }
    }

    drawSeries((s) => s.txBps, CYAN)
    drawSeries((s) => s.rxBps, MAGENTA)
  }

  return (
    <box class="NpSection" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
      <box class="NpSectionHeader" spacing={6}>
        <label class="NpSectionLabel" label="BANDWIDTH" />
        <box class="NpSectionLine" hexpand valign={Gtk.Align.CENTER} />
      </box>
      <Gtk.DrawingArea
        class="NpSparkline"
        widthRequest={380}
        heightRequest={36}
        onRealize={(self: any) => {
          drawingArea = self
          self.set_draw_func((_area: any, cr: any, w: number, h: number) => {
            drawSparkline(cr, w, h)
          })
        }}
      />
      <box class="NpBwLabels" spacing={0}>
        <label class="NpBwTx" label={txLabel} xalign={0} widthRequest={140} />
        <label class="NpBwRx" label={rxLabel} xalign={0} widthRequest={140} />
      </box>
    </box>
  )
}
