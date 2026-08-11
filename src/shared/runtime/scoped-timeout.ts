import GLib from "gi://GLib?version=2.0"

import { onCleanup } from "gnim"
import type { Accessor } from "gnim"

const LOG_TAG = "[scoped-timeout]"
const DEBUG = false
let counter = 0
const active = new Map<number, string>()

function now(): string {
  return `${(GLib.get_monotonic_time() / 1000).toFixed(1)}ms`
}

export function scopedTimeoutAdd(
  priority: number,
  intervalMs: number,
  callback: () => boolean,
  label?: string,
): number {
  const myId = ++counter
  const tag = label ?? `timeout#${myId}`

  let disposed = false

  const wrapped = (): boolean => {
    if (disposed) {
      if (DEBUG) console.warn(`${LOG_TAG} ${now()} ${tag} WARN: fired after dispose (id=${myId}) — returning SOURCE_REMOVE`)
      return GLib.SOURCE_REMOVE
    }
    return callback()
  }

  const sourceId = GLib.timeout_add(priority, intervalMs, wrapped)
  active.set(myId, tag)
  if (DEBUG) console.log(`${LOG_TAG} ${now()} register ${tag} (id=${myId}, sourceId=${sourceId}, interval=${intervalMs}ms, active=${active.size})`)

  onCleanup(() => {
    disposed = true
    active.delete(myId)
    if (DEBUG) console.log(`${LOG_TAG} ${now()} onCleanup ${tag} (id=${myId}, active=${active.size})`)
    try {
      GLib.source_remove(sourceId)
    } catch (e) {
      console.warn(`${LOG_TAG} ${now()} source_remove failed for ${tag}: ${e}`)
    }
  })

  return sourceId
}

// active が true の間だけ回るタイマー。非表示のウィンドウ・アニメ不要時に
// 高頻度 tick を止めて CPU を食わないようにするためのゲート。
export function scopedTimeoutWhile(
  priority: number,
  intervalMs: number,
  active: Accessor<boolean>,
  callback: () => void,
  label?: string,
): void {
  const tag = label ?? "timeout-while"
  let sourceId: number | null = null

  const stop = () => {
    if (sourceId != null) {
      try {
        GLib.source_remove(sourceId)
      } catch (e) {
        console.warn(`${LOG_TAG} ${now()} source_remove failed for ${tag}: ${e}`)
      }
      sourceId = null
    }
  }

  const sync = () => {
    if (active()) {
      if (sourceId == null) {
        sourceId = GLib.timeout_add(priority, intervalMs, () => {
          callback()
          return GLib.SOURCE_CONTINUE
        })
      }
    } else {
      stop()
    }
  }

  const unsubscribe = active.subscribe(sync)
  sync()

  onCleanup(() => {
    unsubscribe()
    stop()
  })
}
