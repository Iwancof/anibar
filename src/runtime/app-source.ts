import Gio from "gi://Gio?version=2.0"
import GioUnix from "gi://GioUnix?version=2.0"
import GLib from "gi://GLib?version=2.0"

import type { AppEntry } from "../modules/launcher/domain.ts"

const MAX_RECENT = 20
const RECENT_FILE = GLib.get_user_cache_dir() + "/ags-launcher-recent.json"
const ACTION_ID_PREFIX = "desktop-action:"
const PRIVATE_WINDOW_ACTION = "new-private-window"
const DETACHED_LAUNCH_ENV_KEYS = [
  "DBUS_SESSION_BUS_ADDRESS",
  "DESKTOP_STARTUP_ID",
  "DISPLAY",
  "GDK_BACKEND",
  "HYPRLAND_INSTANCE_SIGNATURE",
  "QT_QPA_PLATFORM",
  "QT_QPA_PLATFORMTHEME",
  "SDL_VIDEODRIVER",
  "WAYLAND_DISPLAY",
  "XAUTHORITY",
  "XCURSOR_SIZE",
  "XCURSOR_THEME",
  "XDG_CURRENT_DESKTOP",
  "XDG_RUNTIME_DIR",
] as const
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

function getDetachedLaunchPrefix(description: string): string[] {
  const prefix = [
    "systemd-run",
    "--user",
    "--collect",
    "--quiet",
    "--same-dir",
    "--service-type=exec",
    "-p",
    "ExitType=cgroup",
    `--description=${description}`,
  ]

  for (const key of DETACHED_LAUNCH_ENV_KEYS) {
    const value = GLib.getenv(key)
    if (value != null && value.length > 0) {
      prefix.push(`--setenv=${key}=${value}`)
    }
  }

  prefix.push("--")
  return prefix
}

function spawnDetached(command: string[], description: string): boolean {
  try {
    GLib.spawn_async(
      null,
      [...getDetachedLaunchPrefix(description), ...command],
      null,
      GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.STDOUT_TO_DEV_NULL | GLib.SpawnFlags.STDERR_TO_DEV_NULL,
      null,
    )
    return true
  } catch (e) {
    console.error(`Failed to spawn detached command (${description}):`, e)
    return false
  }
}

function getDesktopFilename(appInfo: Gio.DesktopAppInfo): string | null {
  return ((appInfo as any).get_filename?.() as string | null | undefined) ?? null
}

function normalizeDesktopExec(execLine: string): string {
  return execLine
    .replace(/%%/g, "\u0000")
    .replace(/%[fFuUdDnNickvm]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\u0000/g, "%")
}

function getDesktopActionCommand(appInfo: Gio.DesktopAppInfo, action: string): string[] | null {
  const filename = getDesktopFilename(appInfo)
  if (!filename) return null

  try {
    const keyFile = new GLib.KeyFile()
    keyFile.load_from_file(filename, GLib.KeyFileFlags.NONE)

    const execLine = keyFile.get_string(`Desktop Action ${action}`, "Exec")
    if (!execLine) return null

    const [, argv] = GLib.shell_parse_argv(normalizeDesktopExec(execLine))
    return argv
  } catch (e) {
    console.error(`Failed to resolve desktop action ${action}:`, e)
    return null
  }
}

function launchDesktopAppDetached(id: string, appInfo: Gio.DesktopAppInfo): boolean {
  const filename = getDesktopFilename(appInfo)
  if (!filename) {
    console.error(`Desktop file path is unavailable for ${id}`)
    return false
  }

  return spawnDetached(["gio", "launch", filename], `AGS launcher: ${id}`)
}

function launchDesktopActionDetached(
  id: string,
  appInfo: Gio.DesktopAppInfo,
  action: string,
): boolean {
  const argv = getDesktopActionCommand(appInfo, action)
  if (!argv || argv.length === 0) {
    console.error(`Desktop action command is unavailable for ${id}:${action}`)
    return false
  }

  return spawnDetached(argv, `AGS launcher action: ${id}:${action}`)
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
    const appInfo = GioUnix.DesktopAppInfo.new(actionTarget.desktopId)
    if (!appInfo) return false

    if (launchDesktopActionDetached(actionTarget.desktopId, appInfo, actionTarget.action)) {
      recordLaunch(id)
      return true
    }

    return false
  }

  const appInfo = GioUnix.DesktopAppInfo.new(id)
  if (!appInfo) return false

  if (launchDesktopAppDetached(id, appInfo)) {
    recordLaunch(id)
    return true
  }

  return false
}
