#!/usr/bin/env python3
"""Google カレンダーの秘密ICS URLから今後7日の予定をJSONで出す。

URL は ~/.local/state/ags/gcal-ics.url (1行、git外) から読む。
繰り返し予定の展開は recurring_ical_events に任せる。
出力: {"status": "ok", "events": [{uid, title, start, end, allDay}]}
      status は ok | no-feed | fetch-error | parse-error
"""
import json
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

URL_FILE = Path.home() / ".local/state/ags/gcal-ics.url"
DAYS = 30


def out(status, events=None):
    print(json.dumps({"status": status, "events": events or []}, ensure_ascii=False))
    sys.exit(0)


def main():
    if not URL_FILE.exists():
        out("no-feed")
    url = URL_FILE.read_text().strip()
    if not url:
        out("no-feed")

    try:
        ics = subprocess.run(
            ["curl", "-sS", "-m", "20", url],
            capture_output=True, check=True,
        ).stdout
    except subprocess.CalledProcessError:
        out("fetch-error")

    try:
        import icalendar
        import recurring_ical_events

        cal = icalendar.Calendar.from_ical(ics)
        now = datetime.now(timezone.utc)
        window = (now - timedelta(hours=12), now + timedelta(days=DAYS))
        occurrences = recurring_ical_events.of(cal).between(*window)

        events = []
        for ev in occurrences:
            start = ev["DTSTART"].dt
            end = ev.get("DTEND", ev["DTSTART"]).dt
            all_day = not isinstance(start, datetime)
            if all_day:
                start_dt = datetime(start.year, start.month, start.day).astimezone()
                end_dt = datetime(end.year, end.month, end.day).astimezone()
            else:
                start_dt = start.astimezone()
                end_dt = end.astimezone()
            events.append({
                "uid": str(ev.get("UID", "")),
                "title": str(ev.get("SUMMARY", "(no title)")),
                "start": int(start_dt.timestamp()),
                "end": int(end_dt.timestamp()),
                "allDay": all_day,
            })
        events.sort(key=lambda e: e["start"])
        out("ok", events)
    except Exception:
        out("parse-error")


if __name__ == "__main__":
    main()
