import GLib from "gi://GLib?version=2.0"
import { createState, type Accessor } from "gnim"
import { execAsync } from "ags/process"

// Google カレンダーの秘密ICS URL (OAuth不要) を scripts/gcal-agenda.py で
// 7日分に展開して取り込む。5分毎。開始10分前に notify-send で通知する。
const POLL_MS = 5 * 60_000
const REMIND_CHECK_MS = 60_000
const REMIND_BEFORE_SEC = 10 * 60

export type GcalStatus = "ok" | "no-feed" | "fetch-error" | "parse-error"

export interface GcalEvent {
  uid: string
  title: string
  start: number // epoch sec (local tz 換算済み)
  end: number
  allDay: boolean
}

export interface GcalSnapshot {
  status: GcalStatus
  events: GcalEvent[]
  updatedAt: number
}

const SCRIPT = `${GLib.getenv("HOME")}/.config/ags/scripts/gcal-agenda.py`

export interface GcalSource {
  snapshot: Accessor<GcalSnapshot | null>
  /** 現在時刻以降に始まる予定 (終日除く) の先頭 */
  refresh(): void
}

export function upcomingEvents(snap: GcalSnapshot | null, limit: number): GcalEvent[] {
  if (!snap) return []
  const now = Math.floor(Date.now() / 1000)
  return snap.events.filter((e) => e.end > now).slice(0, limit)
}

export function createGcalSource(): GcalSource {
  const [snapshot, setSnapshot] = createState<GcalSnapshot | null>(null)
  // AGS再起動でリセットされ再通知しうるが、10分窓なので実害は小さい
  const notified = new Set<string>()

  async function fetchAgenda(): Promise<void> {
    try {
      const raw = await execAsync(["python3", SCRIPT])
      const parsed = JSON.parse(raw) as { status: GcalStatus; events: GcalEvent[] }
      setSnapshot({
        status: parsed.status,
        events: parsed.events,
        updatedAt: Math.floor(Date.now() / 1000),
      })
    } catch (e) {
      console.warn(`[gcal] agenda fetch failed: ${e}`)
      setSnapshot({ status: "fetch-error", events: [], updatedAt: Math.floor(Date.now() / 1000) })
    }
  }

  function checkReminders(): void {
    const snap = snapshot()
    if (!snap || snap.status !== "ok") return
    const now = Math.floor(Date.now() / 1000)
    for (const ev of snap.events) {
      if (ev.allDay) continue
      const key = `${ev.uid}:${ev.start}`
      const lead = ev.start - now
      if (lead <= REMIND_BEFORE_SEC && lead > 0 && !notified.has(key)) {
        notified.add(key)
        const t = new Date(ev.start * 1000)
        const hh = `${t.getHours()}`.padStart(2, "0")
        const mm = `${t.getMinutes()}`.padStart(2, "0")
        void execAsync([
          "notify-send", "-a", "calendar", "-u", "normal",
          `EVENT::${hh}:${mm}`, ev.title,
        ]).catch(() => {})
      }
    }
  }

  void fetchAgenda()
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, POLL_MS, () => {
    void fetchAgenda()
    return GLib.SOURCE_CONTINUE
  })
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, REMIND_CHECK_MS, () => {
    checkReminders()
    return GLib.SOURCE_CONTINUE
  })

  return { snapshot, refresh: () => void fetchAgenda() }
}
