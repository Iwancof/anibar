import Gio from "gi://Gio?version=2.0"
import GLib from "gi://GLib?version=2.0"

import { createState, type Accessor } from "gnim"

export interface ImeSnapshot {
  method: string   // "mozc", "keyboard-us", etc.
  active: boolean  // true = IME on, false = direct input
}

// fcitx5-remote を 500ms ごとに 2 プロセス fork していたのを、
// 同等の D-Bus メソッド呼び出し (fork なし) に置換。
const FCITX_BUS_NAME = "org.fcitx.Fcitx5"
const FCITX_PATH = "/controller"
const FCITX_INTERFACE = "org.fcitx.Fcitx.Controller1"

const POLL_MS = 500

function callFcitx<T>(bus: Gio.DBusConnection, method: string): Promise<T> {
  return new Promise((resolve, reject) => {
    bus.call(
      FCITX_BUS_NAME,
      FCITX_PATH,
      FCITX_INTERFACE,
      method,
      null,
      null,
      Gio.DBusCallFlags.NONE,
      -1,
      null,
      (connection, result) => {
        try {
          const reply = connection.call_finish(result)
          const [value] = reply.recursiveUnpack<[T]>()
          resolve(value)
        } catch (e) {
          reject(e)
        }
      },
    )
  })
}

export function createImeSource() {
  const bus = Gio.DBus.session
  const [snapshot, setSnapshot] = createState<ImeSnapshot | null>(null)

  const refresh = async () => {
    try {
      const [method, state] = await Promise.all([
        callFcitx<string>(bus, "CurrentInputMethod"),
        callFcitx<number>(bus, "State"),
      ])
      setSnapshot({
        method: method || "unknown",
        active: state === 2,
      })
    } catch {
      setSnapshot(null)
    }
  }

  refresh()
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, POLL_MS, () => {
    refresh()
    return GLib.SOURCE_CONTINUE
  })

  return { snapshot: snapshot as Accessor<ImeSnapshot | null> }
}
