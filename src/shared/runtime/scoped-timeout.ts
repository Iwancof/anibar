import GLib from "gi://GLib?version=2.0"

import { onCleanup } from "gnim"

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
