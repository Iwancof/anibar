import Gio from "gi://Gio?version=2.0"
import GLib from "gi://GLib?version=2.0"

import { createState } from "gnim"

import { parseWorkspacesJson, type WorkspaceSnapshot } from "../modules/workspace/domain.ts"
import { safeExec } from "./command.ts"

// 毎秒 hyprctl×3 のポーリングをやめ、Hyprland の socket2 イベントを購読して
// 変化があったときだけ再読込する。安全網として低頻度ポーリングを残す。
const DEBOUNCE_MS = 100
const SAFETY_POLL_MS = 30_000
const FALLBACK_POLL_MS = 2_000

// ワークスペース/ウィンドウ構成が変わるイベントのみ拾う
// (activewindow はフォーカス移動のたびに発火するが構成は変わらないので除外)
const EVENT_PREFIXES = [
  "workspace>>",
  "workspacev2>>",
  "createworkspace",
  "destroyworkspace",
  "moveworkspace",
  "openwindow>>",
  "closewindow>>",
  "movewindow",
  "focusedmon>>",
  "monitoradded",
  "monitorremoved",
]

async function readSnapshot(): Promise<WorkspaceSnapshot | null> {
  const [wsOut, clientsOut, activeOut] = await Promise.all([
    safeExec(["hyprctl", "workspaces", "-j"]),
    safeExec(["hyprctl", "clients", "-j"]),
    safeExec(["hyprctl", "activeworkspace", "-j"]),
  ])
  return parseWorkspacesJson(wsOut, clientsOut, activeOut)
}

function socket2Path(): string | null {
  const sig = GLib.getenv("HYPRLAND_INSTANCE_SIGNATURE")
  const runtime = GLib.getenv("XDG_RUNTIME_DIR")
  if (!sig || !runtime) return null
  return `${runtime}/hypr/${sig}/.socket2.sock`
}

function attachEventStream(onEvent: (line: string) => void): boolean {
  const path = socket2Path()
  if (!path) return false

  // 注: GJS では GObject の signal connect がメソッド名を隠すため connect_async を使う
  const client = new Gio.SocketClient()
  client.connect_async(Gio.UnixSocketAddress.new(path), null, (c, res) => {
    try {
      const conn = c!.connect_finish(res)
      const stream = new Gio.DataInputStream({
        baseStream: conn.get_input_stream(),
      })

      const readNext = () => {
        stream.read_line_async(GLib.PRIORITY_DEFAULT, null, (s, r) => {
          try {
            const [line] = s!.read_line_finish_utf8(r)
            if (line == null) {
              // EOF (Hyprland 終了時など)。以後は安全網ポーリングのみ。
              console.warn("workspace-source: socket2 EOF, falling back to safety poll")
              return
            }
            onEvent(line)
            readNext()
          } catch (e) {
            console.warn(`workspace-source: socket2 read failed: ${e}`)
          }
        })
      }
      readNext()
    } catch (e) {
      console.warn(`workspace-source: socket2 connect failed: ${e}`)
    }
  })
  return true
}

export function createWorkspaceSource() {
  const [snapshot, setSnapshot] = createState<WorkspaceSnapshot | null>(null)

  const refresh = () => {
    readSnapshot().then(setSnapshot)
  }

  let debounceId = 0
  const scheduleRefresh = () => {
    if (debounceId) return
    debounceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, DEBOUNCE_MS, () => {
      debounceId = 0
      refresh()
      return GLib.SOURCE_REMOVE
    })
  }

  refresh()
  const eventDriven = attachEventStream((line) => {
    if (EVENT_PREFIXES.some((p) => line.startsWith(p))) scheduleRefresh()
  })

  GLib.timeout_add(
    GLib.PRIORITY_DEFAULT,
    eventDriven ? SAFETY_POLL_MS : FALLBACK_POLL_MS,
    () => {
      refresh()
      return GLib.SOURCE_CONTINUE
    },
  )

  return { snapshot }
}

export function switchToWorkspace(id: number): void {
  safeExec(["hyprctl", "dispatch", "workspace", `${id}`])
}

/** フォーカス中のウィンドウを指定 workspace へ移動し、一緒に移る */
export function moveWindowToWorkspace(id: number): void {
  safeExec(["hyprctl", "dispatch", "movetoworkspace", `${id}`])
}
