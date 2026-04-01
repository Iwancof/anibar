import Gio from "gi://Gio?version=2.0"
import GLib from "gi://GLib?version=2.0"

import type { AppEntry } from "../modules/launcher/domain.ts"

const MAX_RECENT = 20
const RECENT_FILE = GLib.get_user_cache_dir() + "/ags-launcher-recent.json"
const ACTION_ID_PREFIX = "desktop-action:"
const PRIVATE_WINDOW_ACTION = "new-private-window"
const PRIVATE_WINDOW_KEYWORDS = [
  "incognito",
  "private",
  "private browsing",
  "chrome --incognito",
  "google-chrome --incognito",
]

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

function addSearchVariants(target: Set<string>, value: string | null | undefined): void {
  const trimmed = value?.trim()
  if (!trimmed) return

  target.add(trimmed)

  const withoutDesktopSuffix = trimmed.replace(/\.desktop$/i, "")
  if (withoutDesktopSuffix && withoutDesktopSuffix !== trimmed) {
    target.add(withoutDesktopSuffix)
  }

  const normalized = withoutDesktopSuffix.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim()
  if (normalized && normalized !== trimmed) {
    target.add(normalized)
  }
}

function buildKeywords(appInfo: Gio.AppInfo, id: string): string[] {
  const keywords = new Set<string>()

  if ("get_keywords" in appInfo) {
    for (const keyword of ((appInfo as any).get_keywords() ?? []) as string[]) {
      addSearchVariants(keywords, keyword)
    }
  }

  addSearchVariants(keywords, id)

  const executable = appInfo.get_executable?.() ?? ""
  addSearchVariants(keywords, executable)
  if (executable) {
    addSearchVariants(keywords, GLib.path_get_basename(executable))
  }

  if ("get_string" in appInfo) {
    addSearchVariants(keywords, (appInfo as any).get_string("Exec") ?? "")
  }

  return [...keywords]
}

function encodeActionId(id: string, action: string): string {
  return `${ACTION_ID_PREFIX}${id}:${action}`
}

function decodeActionId(id: string): { desktopId: string; action: string } | null {
  if (!id.startsWith(ACTION_ID_PREFIX)) return null

  const encoded = id.slice(ACTION_ID_PREFIX.length)
  const separatorIndex = encoded.lastIndexOf(":")
  if (separatorIndex <= 0 || separatorIndex >= encoded.length - 1) return null

  return {
    desktopId: encoded.slice(0, separatorIndex),
    action: encoded.slice(separatorIndex + 1),
  }
}

function isChromeApp(appInfo: Gio.AppInfo, id: string): boolean {
  if (id.toLowerCase().includes("chrome")) return true

  const executable = appInfo.get_executable?.() ?? ""
  return executable.toLowerCase().includes("chrome")
}

function pushPrivateWindowEntry(entries: AppEntry[], appInfo: Gio.AppInfo, baseEntry: AppEntry): void {
  if (!isChromeApp(appInfo, baseEntry.id)) return
  if (!("list_actions" in appInfo) || !("get_action_name" in appInfo)) return

  const actions = ((appInfo as any).list_actions?.() ?? []) as string[]
  if (!actions.includes(PRIVATE_WINDOW_ACTION)) return

  const actionName =
    ((appInfo as any).get_action_name?.(PRIVATE_WINDOW_ACTION) as string | null) ??
    "New Incognito Window"

  entries.push({
    id: encodeActionId(baseEntry.id, PRIVATE_WINDOW_ACTION),
    name: `${baseEntry.name} Incognito`,
    description: `chrome --incognito · ${actionName}`,
    keywords: [...baseEntry.keywords, ...PRIVATE_WINDOW_KEYWORDS],
    icon: baseEntry.icon,
  })
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
    const keywords = buildKeywords(appInfo, id)

    const entry = { id, name, description, keywords, icon: iconName }
    entries.push(entry)
    pushPrivateWindowEntry(entries, appInfo, entry)
  }

  return entries.sort((a, b) => a.name.localeCompare(b.name))
}

export function launchApp(id: string): boolean {
  const actionTarget = decodeActionId(id)
  if (actionTarget) {
    const appInfo = Gio.DesktopAppInfo.new(actionTarget.desktopId)
    if (!appInfo || !("launch_action" in appInfo)) return false
    try {
      ;(appInfo as any).launch_action(actionTarget.action, null)
      recordLaunch(id)
      return true
    } catch (e) {
      console.error(`Failed to launch action ${actionTarget.action}:`, e)
      return false
    }
  }

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
