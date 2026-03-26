import Gio from "gi://Gio?version=2.0"
import GLib from "gi://GLib?version=2.0"

import type { AppEntry } from "../modules/launcher/domain.ts"

const MAX_RECENT = 20
const RECENT_FILE = GLib.get_user_cache_dir() + "/ags-launcher-recent.json"

export function loadRecentIds(): string[] {
  try {
    const [ok, contents] = GLib.file_get_contents(RECENT_FILE)
    if (ok && contents) {
      const decoder = new TextDecoder()
      return JSON.parse(decoder.decode(contents))
    }
  } catch {}
  return []
}

function saveRecentIds(ids: string[]): void {
  try {
    GLib.file_set_contents(RECENT_FILE, JSON.stringify(ids))
  } catch (e) {
    console.error("Failed to save recent apps:", e)
  }
}

export function recordLaunch(id: string): void {
  const ids = loadRecentIds().filter((i) => i !== id)
  ids.unshift(id)
  saveRecentIds(ids.slice(0, MAX_RECENT))
}

export function loadAllApps(): AppEntry[] {
  const allApps = Gio.AppInfo.get_all()
  const entries: AppEntry[] = []

  for (const appInfo of allApps) {
    if (!appInfo.should_show()) continue

    const id = appInfo.get_id() ?? ""
    const name = appInfo.get_display_name() ?? appInfo.get_name() ?? ""
    if (!name) continue

    const description = appInfo.get_description() ?? ""
    const icon = appInfo.get_icon()
    const iconName = icon?.to_string() ?? null

    // Keywords from .desktop (GDesktopAppInfo specific)
    let keywords: string[] = []
    if ("get_keywords" in appInfo) {
      keywords = (appInfo as any).get_keywords() ?? []
    }

    entries.push({ id, name, description, keywords, icon: iconName })
  }

  return entries.sort((a, b) => a.name.localeCompare(b.name))
}

export function launchApp(id: string): boolean {
  const appInfo = Gio.DesktopAppInfo.new(id)
  if (!appInfo) return false
  try {
    appInfo.launch([], null)
    recordLaunch(id)
    return true
  } catch (e) {
    console.error(`Failed to launch ${id}:`, e)
    return false
  }
}
