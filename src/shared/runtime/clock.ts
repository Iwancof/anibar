import GLib from "gi://GLib?version=2.0"

import { createPoll } from "ags/time"

export function createClock(format = "%a %H:%M:%S") {
  return createPoll("", 1000, () => {
    const now = GLib.DateTime.new_now_local()
    return now?.format(format) ?? ""
  })
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

const WEEKDAY_NAMES = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
]

function pad2(value: number): string {
  return `${value}`.padStart(2, "0")
}

function formatBarClock(now: GLib.DateTime): string {
  const year = now.get_year()
  const month = MONTH_NAMES[now.get_month() - 1] ?? pad2(now.get_month())
  const day = pad2(now.get_day_of_month())
  const weekday = WEEKDAY_NAMES[now.get_day_of_week() - 1] ?? ""
  const time = now.format("%H:%M:%S") ?? ""

  return `${year} ${month} ${day} ${weekday} ${time}`.trim()
}

export function createBarClock() {
  return createPoll("", 1000, () => {
    const now = GLib.DateTime.new_now_local()
    if (!now) return ""
    return formatBarClock(now)
  })
}
