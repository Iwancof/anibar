import GLib from "gi://GLib?version=2.0"

import app from "ags/gtk4/app"
import { Astal, Gdk, Gtk } from "ags/gtk4"

export interface PopupShellProps {
  name: string
  windowClass: string
  gdkmonitor: Gdk.Monitor
  onClose: () => void
  anchor?: number
  layer?: number
  keymode?: number
  exclusivity?: number
  contentClass?: string
  contentHalign?: Gtk.Align
  contentValign?: Gtk.Align
  contentOrientation?: Gtk.Orientation
  contentSpacing?: number
  contentHexpand?: boolean
  contentVexpand?: boolean
  /** タイプライタースイープの開始遅延 (dashboard 等、パネル到着が遅い面で使う) */
  typeSweepDelayMs?: number
  children?: unknown
}

// ── 全ラベル タイプライタースイープ ──
// マップ時にウィンドウ内の全 Gtk.Label を集め、ツリー順 (≈左上→右下) に
// 時間差で1文字ずつ打ち出す。開時のみの一発アニメ。
// 動的バインドの更新はスイープ中は上書きされるが、完了/中断時に確定文字列を
// 復元するので、次のバインド更新 (数秒周期) までのごく短い stale で済む。
const SWEEP_TICK_MS = 25
const SWEEP_SPREAD_MS = 700 // 最初のラベルと最後のラベルの開始時刻差
const LABEL_TYPE_MS = 220   // 1ラベルの打ち出し時間

interface SweepEntry {
  label: Gtk.Label
  text: string
  startMs: number
  /** 現在表示しているべきスライス (notify 監視の自己書き込み判定に使う) */
  expected: string
  notifyId: number
  /** true = 1文字ずつでなく出番で全体を一度に出す (数値の誤読防止) */
  atomic: boolean
}

// 部分表示だと別の値に誤読される数値ラベルは一括表示する
const ATOMIC_CLASSES = ["HudPercent", "HudPercentUnit", "WxAtomic"]

// Nerd Font グリフ (U+F0000 超) は UTF-16 サロゲートペアなので、コード単位の
// slice だと途中スライスが不正なサロゲート片になり GTK が U+FFFD に置換 →
// notify 監視がそれを新値として採用し「�」で確定してしまう。
// 必ずコードポイント境界で切る
function sliceByCodePoint(text: string, frac: number): string {
  const cps = Array.from(text)
  return cps.slice(0, Math.ceil(frac * cps.length)).join("")
}

function collectLabels(root: Gtk.Widget, out: Gtk.Label[]): void {
  for (let c = root.get_first_child(); c != null; c = c.get_next_sibling()) {
    if (c instanceof Gtk.Label) out.push(c)
    collectLabels(c, out)
  }
}

function attachTypeSweep(win: Gtk.Window, baseDelayMs: number): void {
  let sourceId = 0
  let entries: SweepEntry[] = []

  const finish = () => {
    if (sourceId) {
      GLib.source_remove(sourceId)
      sourceId = 0
    }
    // 中断でも完了でも確定文字列に戻す (部分表示のまま残さない)。
    // notify 監視は復元前に外す
    for (const e of entries) {
      e.label.disconnect(e.notifyId)
      e.label.label = e.text
    }
    entries = []
  }

  const start = () => {
    finish()
    const labels: Gtk.Label[] = []
    collectLabels(win, labels)
    const targets = labels.filter(
      (l) =>
        l.label.length > 0 &&
        // PanelHeader タイトルは専用のカーソル付きタイプライター、
        // DmClock は letter-spacing 凝縮アニメを持つため除外
        !l.cssClasses.includes("UiPanelHeaderTitle") &&
        !l.cssClasses.includes("DmClock"),
    )
    const n = Math.max(1, targets.length - 1)
    entries = targets.map((label, i) => {
      const e: SweepEntry = {
        label,
        text: label.label,
        startMs: baseDelayMs + (i / n) * SWEEP_SPREAD_MS,
        expected: "",
        notifyId: 0,
        atomic: ATOMIC_CLASSES.some((c) => label.cssClasses.includes(c)),
      }
      // スイープ中にバインディングが新しい値を書き込んでも、同フレーム内で
      // 現在のスライスへ戻す (開いた直後の可視ゲートポーラー由来のフラッシュ防止)。
      // 新しい値はスイープの残りで打ち出す対象として採用する
      e.notifyId = label.connect("notify::label", () => {
        const current = e.label.label
        if (current !== e.expected) {
          e.text = current
          e.label.label = e.expected
        }
      })
      return e
    })
    for (const e of entries) {
      e.expected = ""
      e.label.label = ""
    }

    let elapsed = 0
    sourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, SWEEP_TICK_MS, () => {
      elapsed += SWEEP_TICK_MS
      let allDone = true
      for (const e of entries) {
        if (elapsed < e.startMs) {
          allDone = false
          continue
        }
        const frac = Math.min(1, (elapsed - e.startMs) / LABEL_TYPE_MS)
        const slice = e.atomic ? e.text : sliceByCodePoint(e.text, frac)
        if (e.expected !== slice) {
          e.expected = slice
          e.label.label = slice
        }
        if (frac < 1 && !e.atomic) allDone = false
      }
      if (allDone) {
        for (const e of entries) e.label.disconnect(e.notifyId)
        for (const e of entries) e.label.label = e.text
        entries = []
        sourceId = 0
        return GLib.SOURCE_REMOVE
      }
      return GLib.SOURCE_CONTINUE
    })
  }

  win.connect("map", start)
  win.connect("unmap", finish)
}

export default function PopupShell(props: PopupShellProps) {
  const { TOP, LEFT, RIGHT, BOTTOM } = Astal.WindowAnchor

  return (
    <window
      name={props.name}
      class={props.windowClass}
      visible={false}
      application={app}
      gdkmonitor={props.gdkmonitor}
      anchor={props.anchor ?? (TOP | LEFT | RIGHT | BOTTOM)}
      exclusivity={props.exclusivity ?? Astal.Exclusivity.NORMAL}
      keymode={props.keymode ?? Astal.Keymode.ON_DEMAND}
      layer={props.layer ?? Astal.Layer.TOP}
      onRealize={(self: Gtk.Window) => {
        const keyCtrl = new Gtk.EventControllerKey()
        keyCtrl.connect("key-pressed", (_ctrl: Gtk.EventControllerKey, keyval: number) => {
          if (keyval === Gdk.KEY_Escape) {
            props.onClose()
            return true
          }
          return false
        })
        self.add_controller(keyCtrl)

        // Hyprland はパネルのマップ直後、カーソルが動くまでポインタフォーカスを
        // このパネル面に残す。その間バー上でクリックすると press は領域外の
        // 負座標でここへ届く (バーには届かない)。領域外 press は「外側クリック」
        // として閉じる — 開いたボタンを動かさず再クリックで閉じられるようにする。
        const outsidePress = new Gtk.GestureClick()
        outsidePress.set_propagation_phase(Gtk.PropagationPhase.CAPTURE)
        outsidePress.connect("pressed", (_g: Gtk.GestureClick, _n: number, x: number, y: number) => {
          const w = self.get_width()
          const h = self.get_height()
          if (x < 0 || y < 0 || x >= w || y >= h) {
            console.log(`[click] ${props.name} outside press (${x.toFixed(0)},${y.toFixed(0)}) -> close`)
            props.onClose()
          }
        })
        self.add_controller(outsidePress)

        attachTypeSweep(self, props.typeSweepDelayMs ?? 150)
      }}
    >
      <overlay>
        <button class="UiBackdrop" hexpand vexpand onClicked={props.onClose} />
        <box
          $type="overlay"
          class={props.contentClass ?? ""}
          halign={props.contentHalign ?? Gtk.Align.CENTER}
          valign={props.contentValign ?? Gtk.Align.CENTER}
          orientation={props.contentOrientation ?? Gtk.Orientation.HORIZONTAL}
          spacing={props.contentSpacing ?? 0}
          hexpand={props.contentHexpand ?? false}
          vexpand={props.contentVexpand ?? false}
        >
          {props.children}
        </box>
      </overlay>
    </window>
  )
}
