import Gio from "gi://Gio?version=2.0"

import type { AppEntry } from "../modules/launcher/domain.ts"

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
    return true
  } catch (e) {
    console.error(`Failed to launch ${id}:`, e)
    return false
  }
}
