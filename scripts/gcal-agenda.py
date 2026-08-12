#!/usr/bin/env python3
"""Google カレンダーの秘密ICS URLから今後30日の予定をJSONで出す。

URL は ~/.local/state/ags/gcal-ics.url (1行1URL、複数可、git外) から読む。
繰り返し予定の展開は recurring_ical_events に任せる。
出力: {"status", "feeds", "okFeeds", "events": [{uid,title,start,end,allDay,src}]}
  status: ok (1本でも読めた) | no-feed | fetch-error | parse-error
  src: URLファイル内の行番号 (0始まり)。UIの出所色分けに使う
"""
import json
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

URL_FILE = Path.home() / ".local/state/ags/gcal-ics.url"
DAYS = 30


def emit(status, feeds=0, ok_feeds=0, events=None):
    print(json.dumps(
        {"status": status, "feeds": feeds, "okFeeds": ok_feeds, "events": events or []},
        ensure_ascii=False,
    ))
    sys.exit(0)


def load_feed(url, src):
    ics = subprocess.run(
        ["curl", "-sS", "-m", "20", url],
        capture_output=True, check=True,
    ).stdout

    import icalendar
    import recurring_ical_events

    cal = icalendar.Calendar.from_ical(ics)
    now = datetime.now(timezone.utc)
    window = (now - timedelta(hours=12), now + timedelta(days=DAYS))

    events = []
    for ev in recurring_ical_events.of(cal).between(*window):
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
            "src": src,
        })
    return events


def main():
    if not URL_FILE.exists():
        emit("no-feed")
    urls = [line.strip() for line in URL_FILE.read_text().splitlines() if line.strip()]
    if not urls:
        emit("no-feed")

    events = []
    errors = []
    ok = 0
    for i, url in enumerate(urls):
        try:
            events.extend(load_feed(url, i))
            ok += 1
        except subprocess.CalledProcessError:
            errors.append("fetch-error")
        except Exception:
            errors.append("parse-error")

    if ok == 0:
        emit(errors[0] if errors else "no-feed", feeds=len(urls))

    # 招待などで両カレンダーに載る予定は (uid, start) で一本化する
    seen = set()
    unique = []
    for ev in sorted(events, key=lambda e: (e["start"], e["src"])):
        key = (ev["uid"], ev["start"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(ev)

    emit("ok", feeds=len(urls), ok_feeds=ok, events=unique)


if __name__ == "__main__":
    main()
