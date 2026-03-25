import GLib from "gi://GLib?version=2.0"

import { createPoll } from "ags/time"

export function createClock(format = "%a %H:%M:%S") {
  return createPoll("", 1000, () => {
    const now = GLib.DateTime.new_now_local()
    return now?.format(format) ?? ""
  })
}
