import { Astal, Gdk, Gtk } from "ags/gtk4"

import { createMemo, createState, type Accessor } from "gnim"

import type { GcalSnapshot } from "../../runtime/gcal-source.ts"
import { upcomingEvents } from "../../runtime/gcal-source.ts"
import { closeCalendarPopup } from "../../app/controllers.ts"
import PopupShell from "../../shared/ui/PopupShell.tsx"
import PanelHeader from "../../shared/ui/PanelHeader.tsx"
import SectionHeader from "../../shared/ui/SectionHeader.tsx"
import Icon from "../../shared/ui/Icon.tsx"
import { ICONS } from "../../shared/ui/icons.ts"

export interface CalendarPopupProps {
  gdkmonitor: Gdk.Monitor
  monitor: string
  gcal: Accessor<GcalSnapshot | null>
}

const GRID_SLOTS = 42 // 6週 × 7日 固定スロット
const AGENDA_SLOTS = 5
const DOW = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"]

// 表示中の月 (今月からのオフセット)。開くたびに今月へ戻す
const [viewOffset, setViewOffset] = createState(0)
export function resetCalendarView(): void {
  setViewOffset(0)
}

interface DayCell {
  label: string
  cls: string
}

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function eventDayKeys(snap: GcalSnapshot | null): Set<string> {
  const keys = new Set<string>()
  if (!snap) return keys
  for (const ev of snap.events) {
    const d = new Date(ev.start * 1000)
    const end = ev.end * 1000
    // 複数日イベントは通過日を全てマーク (安全上限60日)
    for (let i = 0; i < 60; i++) {
      keys.add(localDayKey(d))
      d.setDate(d.getDate() + 1)
      d.setHours(0, 0, 0, 0)
      if (d.getTime() >= end) break
    }
  }
  return keys
}

export default function CalendarPopup(props: CalendarPopupProps) {
  const grid = createMemo<{ title: string; cells: DayCell[] }>(() => {
    const offset = viewOffset()
    const evDays = eventDayKeys(props.gcal())

    const today = new Date()
    const view = new Date(today.getFullYear(), today.getMonth() + offset, 1)
    // 月曜始まり
    const lead = (view.getDay() + 6) % 7
    const cursor = new Date(view)
    cursor.setDate(1 - lead)

    const todayKey = localDayKey(today)
    const cells: DayCell[] = []
    for (let i = 0; i < GRID_SLOTS; i++) {
      const inMonth = cursor.getMonth() === view.getMonth()
      const key = localDayKey(cursor)
      let cls = "CalDay"
      if (!inMonth) cls += " CalDayDim"
      if (key === todayKey) cls += " CalDayToday"
      if (evDays.has(key)) cls += " CalDayHasEvent"
      cells.push({ label: `${cursor.getDate()}`, cls })
      cursor.setDate(cursor.getDate() + 1)
    }

    const mm = `${view.getMonth() + 1}`.padStart(2, "0")
    return { title: `${view.getFullYear()}.${mm}`, cells }
  })

  const agenda = createMemo(() => upcomingEvents(props.gcal(), AGENDA_SLOTS))

  // 出所の色分け: 1本目 (個人) = cyan、2本目以降 (仕事等) = amber
  function agendaWhenClass(i: number): Accessor<string> {
    return agenda((list) => {
      const src = list[i]?.src ?? 0
      return src === 0 ? "CalAgendaWhen WxAtomic" : "CalAgendaWhen CalAgendaWhenAlt WxAtomic"
    })
  }

  function agendaLabel(i: number, part: "when" | "title"): Accessor<string> {
    return agenda((list) => {
      const ev = list[i]
      if (!ev) return part === "when" ? "" : ""
      if (part === "title") return ev.title
      const d = new Date(ev.start * 1000)
      const md = `${`${d.getMonth() + 1}`.padStart(2, "0")}/${`${d.getDate()}`.padStart(2, "0")}`
      if (ev.allDay) return `${md} ALL-DAY`
      return `${md} ${`${d.getHours()}`.padStart(2, "0")}:${`${d.getMinutes()}`.padStart(2, "0")}`
    })
  }

  const statusLine = props.gcal((s) => {
    if (!s) return "FEED::LOADING"
    switch (s.status) {
      case "ok": {
        const d = new Date(s.updatedAt * 1000)
        const feeds = s.feeds > 1 ? ` ${s.okFeeds}/${s.feeds}` : ""
        return `FEED::GCAL${feeds} · UPD::${`${d.getHours()}`.padStart(2, "0")}:${`${d.getMinutes()}`.padStart(2, "0")}`
      }
      case "no-feed": return "FEED::NONE (gcal-ics.url 未設定)"
      case "fetch-error": return "FEED::FETCH-ERROR"
      case "parse-error": return "FEED::PARSE-ERROR"
    }
  })

  return (
    <PopupShell
      name={`calendar-popup:${props.monitor}`}
      windowClass="CalPopup"
      gdkmonitor={props.gdkmonitor}
      exclusivity={Astal.Exclusivity.NORMAL}
      keymode={Astal.Keymode.ON_DEMAND}
      layer={Astal.Layer.TOP}
      contentHalign={Gtk.Align.CENTER}
      contentValign={Gtk.Align.START}
      onClose={closeCalendarPopup}
    >
      <box class="CalPopupPanel UiPanel" orientation={Gtk.Orientation.VERTICAL}>
        <PanelHeader title="CAL::MONTH" meta={grid((g) => g.title)} />

        <box class="CalBody" orientation={Gtk.Orientation.VERTICAL} spacing={8}>
          {/* 月ナビ */}
          <box spacing={4}>
            <button class="CalNavBtn" onClicked={() => setViewOffset(viewOffset() - 1)}>
              <Icon icon={ICONS.chevronLeft} />
            </button>
            <button class="CalNavBtn" onClicked={() => resetCalendarView()}>
              <label label="TODAY" />
            </button>
            <button class="CalNavBtn" onClicked={() => setViewOffset(viewOffset() + 1)}>
              <Icon icon={ICONS.chevronRight} />
            </button>
            <box hexpand />
            <Icon class="CalHeaderIcon" icon={ICONS.calendar} valign={Gtk.Align.CENTER} />
          </box>

          {/* 曜日ヘッダ + 6x7 グリッド */}
          <box class="CalDowRow" homogeneous>
            {DOW.map((d) => (
              <label class="CalDow" label={d} />
            ))}
          </box>
          <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
            {Array.from({ length: 6 }).map((_, row) => (
              <box class="CalWeekRow" homogeneous>
                {Array.from({ length: 7 }).map((_, col) => {
                  const idx = row * 7 + col
                  return (
                    <label
                      class={grid((g) => g.cells[idx]?.cls ?? "CalDay")}
                      label={grid((g) => g.cells[idx]?.label ?? "")}
                    />
                  )
                })}
              </box>
            ))}
          </box>

          {/* 次の予定 */}
          <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
            <SectionHeader label="AGENDA::NEXT" />
            {Array.from({ length: AGENDA_SLOTS }).map((_, i) => (
              <box
                class="CalAgendaRow"
                spacing={8}
                visible={agenda((list) => list[i] != null)}
              >
                <label class={agendaWhenClass(i)} label={agendaLabel(i, "when")} />
                <label class="CalAgendaTitle" label={agendaLabel(i, "title")} hexpand halign={Gtk.Align.START} />
              </box>
            ))}
            <label
              class="CalAgendaEmpty"
              label="NO EVENTS::30D"
              visible={agenda((list) => list.length === 0)}
              halign={Gtk.Align.START}
            />
          </box>

          <label class="CalFooter" label={statusLine} halign={Gtk.Align.START} />
        </box>
      </box>
    </PopupShell>
  )
}
