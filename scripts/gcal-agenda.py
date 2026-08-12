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
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

URL_FILE = Path.home() / ".local/state/ags/gcal-ics.url"
# Workspace 側 (非公開URLが管理者無効) は Calendar API + OAuth refresh token で読む
OAUTH_FILE = Path.home() / ".local/state/ags/gcal-oauth.json"
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


def load_api_feed(src):
    cfg = json.loads(OAUTH_FILE.read_text())
    body = urllib.parse.urlencode({
        "client_id": cfg["client_id"],
        "client_secret": cfg["client_secret"],
        "refresh_token": cfg["refresh_token"],
        "grant_type": "refresh_token",
    }).encode()
    token = json.loads(urllib.request.urlopen(
        "https://oauth2.googleapis.com/token", body, timeout=20).read())["access_token"]

    now = datetime.now(timezone.utc)
    params = urllib.parse.urlencode({
        "timeMin": (now - timedelta(hours=12)).isoformat().replace("+00:00", "Z"),
        "timeMax": (now + timedelta(days=DAYS)).isoformat().replace("+00:00", "Z"),
        "singleEvents": "true",  # API 側で繰り返し予定を展開してもらう
        "orderBy": "startTime",
        "maxResults": "250",
    })
    req = urllib.request.Request(
        f"https://www.googleapis.com/calendar/v3/calendars/primary/events?{params}",
        headers={"Authorization": f"Bearer {token}"},
    )
    data = json.loads(urllib.request.urlopen(req, timeout=20).read())

    events = []
    for it in data.get("items", []):
        if it.get("status") == "cancelled":
            continue
        s, e = it["start"], it["end"]
        all_day = "date" in s
        if all_day:
            start_dt = datetime.fromisoformat(s["date"]).astimezone()
            end_dt = datetime.fromisoformat(e["date"]).astimezone()
        else:
            start_dt = datetime.fromisoformat(s["dateTime"])
            end_dt = datetime.fromisoformat(e["dateTime"])
        events.append({
            "uid": str(it.get("iCalUID") or it.get("id", "")),
            "title": it.get("summary", "(no title)"),
            "start": int(start_dt.timestamp()),
            "end": int(end_dt.timestamp()),
            "allDay": all_day,
            "src": src,
        })
    return events


def main():
    urls = []
    if URL_FILE.exists():
        urls = [line.strip() for line in URL_FILE.read_text().splitlines() if line.strip()]

    has_api = False
    if OAUTH_FILE.exists():
        try:
            has_api = "refresh_token" in json.loads(OAUTH_FILE.read_text())
        except Exception:
            has_api = False

    if not urls and not has_api:
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

    n_feeds = len(urls)
    if has_api:
        n_feeds += 1
        try:
            events.extend(load_api_feed(len(urls)))
            ok += 1
        except Exception:
            errors.append("fetch-error")

    if ok == 0:
        emit(errors[0] if errors else "no-feed", feeds=n_feeds)

    # 招待などで両カレンダーに載る予定は (uid, start) で一本化する
    seen = set()
    unique = []
    for ev in sorted(events, key=lambda e: (e["start"], e["src"])):
        key = (ev["uid"], ev["start"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(ev)

    emit("ok", feeds=n_feeds, ok_feeds=ok, events=unique)


if __name__ == "__main__":
    main()
