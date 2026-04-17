import GLib from "gi://GLib?version=2.0"

import { execAsync } from "ags/process"
import { createState, type Accessor } from "gnim"

import {
  buildApplyCommands,
  createDisplayProfile,
  parseDisplayProfilesFile,
  parseHyprMonitorsJson,
  resolveDisplayLayoutConfigPath,
  serializeDisplayProfiles,
  upsertDisplayProfile,
  type DisplayProfile,
} from "../modules/display-layout/domain.ts"

const POLL_MS = 2_500
const CONFIG_DIR = `${GLib.get_user_config_dir()}/ags`
const CONFIG_FILE = resolveDisplayLayoutConfigPath(CONFIG_DIR)

export interface DisplayLayoutSource {
  current: Accessor<DisplayProfile | null>
  savedProfiles: Accessor<DisplayProfile[]>
  refresh: () => Promise<void>
  applyProfile: (profile: DisplayProfile) => Promise<{ ok: boolean; error?: string }>
  saveProfile: (name: string, profile: DisplayProfile) => Promise<{ ok: boolean; error?: string }>
  dispose: () => void
}

async function execChecked(command: string[]): Promise<string> {
  try {
    return (await execAsync(command)).trim()
  } catch (error) {
    throw new Error(`${command.join(" ")} failed: ${error}`)
  }
}

async function readCurrentProfile(): Promise<DisplayProfile | null> {
  const json = await execChecked(["hyprctl", "monitors", "all", "-j"])
  const outputs = parseHyprMonitorsJson(json)
  return outputs.length > 0 ? createDisplayProfile("Current", outputs) : null
}

function loadStoredProfiles(): DisplayProfile[] {
  try {
    const [ok, contents] = GLib.file_get_contents(CONFIG_FILE)
    if (!ok || !contents) return []
    const decoder = new TextDecoder()
    return parseDisplayProfilesFile(decoder.decode(contents))
  } catch {
    return []
  }
}

function saveStoredProfiles(profiles: DisplayProfile[]): void {
  GLib.mkdir_with_parents(CONFIG_DIR, 0o755)
  GLib.file_set_contents(CONFIG_FILE, serializeDisplayProfiles(profiles))
}

export function createDisplayLayoutSource(): DisplayLayoutSource {
  const [current, setCurrent] = createState<DisplayProfile | null>(null)
  const [savedProfiles, setSavedProfiles] = createState<DisplayProfile[]>(loadStoredProfiles())

  let disposed = false
  let refreshInFlight = false

  async function refresh(): Promise<void> {
    if (disposed || refreshInFlight) return
    refreshInFlight = true

    try {
      setCurrent(await readCurrentProfile())
      setSavedProfiles(loadStoredProfiles())
    } catch (error) {
      console.warn(`display-layout: refresh failed: ${error}`)
    } finally {
      refreshInFlight = false
    }
  }

  async function applyProfile(profile: DisplayProfile): Promise<{ ok: boolean; error?: string }> {
    try {
      for (const command of buildApplyCommands(profile)) {
        await execChecked(command)
      }
      await refresh()
      return { ok: true }
    } catch (error) {
      return { ok: false, error: `${error}` }
    }
  }

  async function saveProfile(name: string, profile: DisplayProfile): Promise<{ ok: boolean; error?: string }> {
    const trimmed = name.trim()
    if (!trimmed) {
      return { ok: false, error: "display-layout: profile name is required" }
    }

    try {
      const next = upsertDisplayProfile(loadStoredProfiles(), {
        ...profile,
        name: trimmed,
      })
      saveStoredProfiles(next)
      setSavedProfiles(next)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: `${error}` }
    }
  }

  void refresh()

  const pollId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, POLL_MS, () => {
    void refresh()
    return GLib.SOURCE_CONTINUE
  })

  return {
    current,
    savedProfiles,
    refresh,
    applyProfile,
    saveProfile,
    dispose() {
      if (disposed) return
      disposed = true
      GLib.source_remove(pollId)
    },
  }
}

let displayLayoutSourceSingleton: DisplayLayoutSource | null = null

export function getDisplayLayoutSource(): DisplayLayoutSource {
  if (!displayLayoutSourceSingleton) {
    displayLayoutSourceSingleton = createDisplayLayoutSource()
  }

  return displayLayoutSourceSingleton
}
