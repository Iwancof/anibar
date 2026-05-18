export interface DisplayOutput {
  connector: string
  description: string
  enabled: boolean
  mode: string
  availableModes: string[]
  scale: number
  transform: DisplayTransform
  x: number
  y: number
  logicalWidth: number
  logicalHeight: number
  focused: boolean
}

export type DisplayTransform = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface DisplayProfile {
  name: string
  outputs: DisplayOutput[]
}

export interface DisplayProfilesFile {
  profiles: DisplayProfile[]
}

interface HyprMonitor {
  name?: unknown
  description?: unknown
  width?: unknown
  height?: unknown
  refreshRate?: unknown
  x?: unknown
  y?: unknown
  scale?: unknown
  transform?: unknown
  focused?: unknown
  disabled?: unknown
  availableModes?: unknown
}

interface ModeInfo {
  width: number
  height: number
  refresh: string
}

const MODE_RE = /^(\d+)x(\d+)@([\d.]+)(?:Hz)?$/i

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function roundScale(scale: number): number {
  return Number(scale.toFixed(2))
}

function toDisplayTransform(value: unknown): DisplayTransform {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 7
    ? value as DisplayTransform
    : 0
}

function isSidewaysTransform(transform: DisplayTransform): boolean {
  return transform % 2 === 1
}

function trimNumber(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, "")
}

function parseMode(mode: string): ModeInfo | null {
  const match = MODE_RE.exec(mode.trim())
  if (!match) return null
  return {
    width: Number.parseInt(match[1], 10),
    height: Number.parseInt(match[2], 10),
    refresh: trimNumber(Number.parseFloat(match[3])),
  }
}

function formatMode(width: number, height: number, refreshRate: number): string {
  return `${Math.max(1, Math.round(width))}x${Math.max(1, Math.round(height))}@${trimNumber(refreshRate)}Hz`
}

function modeToCommand(mode: string): string {
  return mode.replace(/Hz$/i, "")
}

function withLogicalSize(output: Omit<DisplayOutput, "logicalWidth" | "logicalHeight">): DisplayOutput {
  const mode = parseMode(output.mode)
  const modeWidth = mode?.width ?? 1
  const modeHeight = mode?.height ?? 1
  const width = isSidewaysTransform(output.transform) ? modeHeight : modeWidth
  const height = isSidewaysTransform(output.transform) ? modeWidth : modeHeight
  const scale = output.scale > 0 ? output.scale : 1

  return {
    ...output,
    logicalWidth: Math.max(1, Math.round(width / scale)),
    logicalHeight: Math.max(1, Math.round(height / scale)),
  }
}

function cloneOutput(output: DisplayOutput): DisplayOutput {
  return {
    ...output,
    availableModes: [...output.availableModes],
  }
}

export function cloneProfile(profile: DisplayProfile): DisplayProfile {
  return {
    name: profile.name,
    outputs: profile.outputs.map(cloneOutput),
  }
}

export function createDisplayProfile(name: string, outputs: DisplayOutput[]): DisplayProfile {
  return {
    name,
    outputs: outputs.map(cloneOutput),
  }
}

export function parseHyprMonitorsJson(json: string): DisplayOutput[] {
  if (!json.trim()) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return []
  }

  if (!Array.isArray(parsed)) return []

  return parsed
    .map((item): DisplayOutput | null => {
      const monitor = item as HyprMonitor
      const connector = typeof monitor.name === "string" ? monitor.name.trim() : ""
      if (!connector) return null

      const width = Math.max(1, Math.round(asNumber(monitor.width, 1)))
      const height = Math.max(1, Math.round(asNumber(monitor.height, 1)))
      const refreshRate = asNumber(monitor.refreshRate, 60)
      const mode = formatMode(width, height, refreshRate)
      const availableModes = Array.isArray(monitor.availableModes)
        ? monitor.availableModes.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        : [mode]

      return withLogicalSize({
        connector,
        description: typeof monitor.description === "string" ? monitor.description : "",
        enabled: monitor.disabled !== true,
        mode,
        availableModes: availableModes.length > 0 ? availableModes : [mode],
        scale: roundScale(Math.max(0.25, asNumber(monitor.scale, 1))),
        transform: toDisplayTransform(monitor.transform),
        x: Math.round(asNumber(monitor.x, 0)),
        y: Math.round(asNumber(monitor.y, 0)),
        focused: monitor.focused === true,
      })
    })
    .filter((output): output is DisplayOutput => output != null)
}

export function parseDisplayProfilesFile(text: string): DisplayProfile[] {
  if (!text.trim()) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return []
  }

  const profilesRaw =
    Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" && parsed != null && Array.isArray((parsed as DisplayProfilesFile).profiles)
        ? (parsed as DisplayProfilesFile).profiles
        : []

  const profiles: DisplayProfile[] = []
  for (const profile of profilesRaw) {
    if (typeof profile !== "object" || profile == null) continue
    const name = typeof (profile as DisplayProfile).name === "string" ? (profile as DisplayProfile).name.trim() : ""
    if (!name) continue

    const outputsRaw = Array.isArray((profile as DisplayProfile).outputs) ? (profile as DisplayProfile).outputs : []
    const outputs: DisplayOutput[] = []
    for (const outputRaw of outputsRaw) {
      if (typeof outputRaw !== "object" || outputRaw == null) continue
      const output = outputRaw as Partial<DisplayOutput>
      const connector = typeof output.connector === "string" ? output.connector.trim() : ""
      const mode = typeof output.mode === "string" ? output.mode.trim() : ""
      if (!connector || !mode) continue

      outputs.push(withLogicalSize({
        connector,
        description: typeof output.description === "string" ? output.description : "",
        enabled: output.enabled !== false,
        mode,
        availableModes: Array.isArray(output.availableModes)
          ? output.availableModes.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
          : [mode],
        scale: roundScale(Math.max(0.25, typeof output.scale === "number" ? output.scale : 1)),
        transform: toDisplayTransform(output.transform),
        x: Math.round(typeof output.x === "number" ? output.x : 0),
        y: Math.round(typeof output.y === "number" ? output.y : 0),
        focused: output.focused === true,
      }))
    }

    profiles.push({ name, outputs })
  }

  return profiles
}

export function serializeDisplayProfiles(profiles: DisplayProfile[]): string {
  return JSON.stringify(
    {
      profiles: profiles.map((profile) => ({
        name: profile.name,
        outputs: profile.outputs.map((output) => ({
          connector: output.connector,
          description: output.description,
          enabled: output.enabled,
          mode: output.mode,
          availableModes: output.availableModes,
          scale: output.scale,
          transform: output.transform,
          x: output.x,
          y: output.y,
          focused: output.focused,
        })),
      })),
    },
    null,
    2,
  )
}

export function upsertDisplayProfile(profiles: DisplayProfile[], profile: DisplayProfile): DisplayProfile[] {
  const next = profiles
    .filter((item) => item.name !== profile.name)
    .map(cloneProfile)

  next.push(cloneProfile(profile))
  next.sort((a, b) => a.name.localeCompare(b.name))
  return next
}

export function resolveDisplayLayoutConfigPath(baseDir: string): string {
  const normalized = baseDir.endsWith("/") ? baseDir.slice(0, -1) : baseDir
  return `${normalized}/display-layouts.json`
}

export function hasEnabledOutputs(profile: DisplayProfile): boolean {
  return profile.outputs.some((output) => output.enabled)
}

export function normalizeProfileOrigins(profile: DisplayProfile): DisplayProfile {
  const next = cloneProfile(profile)
  const enabled = next.outputs.filter((output) => output.enabled)
  if (enabled.length === 0) return next

  const minX = Math.min(...enabled.map((output) => output.x))
  const minY = Math.min(...enabled.map((output) => output.y))

  next.outputs = next.outputs.map((output) =>
    output.enabled
      ? { ...output, x: output.x - minX, y: output.y - minY }
      : output,
  )
  return next
}

export function getProfileBounds(profile: DisplayProfile): {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
} {
  if (profile.outputs.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 1, height: 1 }
  }

  const minX = Math.min(...profile.outputs.map((output) => output.x))
  const minY = Math.min(...profile.outputs.map((output) => output.y))
  const maxX = Math.max(...profile.outputs.map((output) => output.x + output.logicalWidth))
  const maxY = Math.max(...profile.outputs.map((output) => output.y + output.logicalHeight))

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  }
}

export function setOutputEnabled(profile: DisplayProfile, connector: string, enabled: boolean): DisplayProfile {
  return {
    ...cloneProfile(profile),
    outputs: profile.outputs.map((output) =>
      output.connector === connector ? { ...cloneOutput(output), enabled } : cloneOutput(output),
    ),
  }
}

export function setOutputPosition(profile: DisplayProfile, connector: string, x: number, y: number): DisplayProfile {
  return {
    ...cloneProfile(profile),
    outputs: profile.outputs.map((output) =>
      output.connector === connector
        ? { ...cloneOutput(output), x: Math.round(x), y: Math.round(y) }
        : cloneOutput(output),
    ),
  }
}

export function setOutputMode(profile: DisplayProfile, connector: string, mode: string): DisplayProfile {
  return {
    ...cloneProfile(profile),
    outputs: profile.outputs.map((output) =>
      output.connector === connector
        ? withLogicalSize({
            ...cloneOutput(output),
            mode,
            availableModes: output.availableModes.includes(mode) ? [...output.availableModes] : [...output.availableModes, mode],
          })
        : cloneOutput(output),
    ),
  }
}

export function setOutputScale(profile: DisplayProfile, connector: string, scale: number): DisplayProfile {
  const nextScale = roundScale(Math.max(0.25, scale))
  return {
    ...cloneProfile(profile),
    outputs: profile.outputs.map((output) =>
      output.connector === connector
        ? withLogicalSize({
            ...cloneOutput(output),
            scale: nextScale,
          })
        : cloneOutput(output),
    ),
  }
}

export function setOutputTransform(profile: DisplayProfile, connector: string, transform: DisplayTransform): DisplayProfile {
  return {
    ...cloneProfile(profile),
    outputs: profile.outputs.map((output) =>
      output.connector === connector
        ? withLogicalSize({
            ...cloneOutput(output),
            transform,
          })
        : cloneOutput(output),
    ),
  }
}

export function applyHorizontalPreset(profile: DisplayProfile): DisplayProfile {
  const next = cloneProfile(profile)
  const enabled = next.outputs
    .filter((output) => output.enabled)
    .sort((a, b) => (a.x - b.x) || (a.y - b.y) || a.connector.localeCompare(b.connector))

  let cursorX = 0
  for (const output of enabled) {
    output.x = cursorX
    output.y = 0
    cursorX += output.logicalWidth
  }

  return normalizeProfileOrigins(next)
}

export function applySwapHorizontalPreset(profile: DisplayProfile): DisplayProfile {
  const next = cloneProfile(profile)
  const enabled = next.outputs
    .filter((output) => output.enabled)
    .sort((a, b) => (a.x - b.x) || (a.y - b.y) || a.connector.localeCompare(b.connector))
    .reverse()

  let cursorX = 0
  for (const output of enabled) {
    output.x = cursorX
    output.y = 0
    cursorX += output.logicalWidth
  }

  return normalizeProfileOrigins(next)
}

export function applySingleOutputPreset(profile: DisplayProfile, connector: string): DisplayProfile {
  const next = cloneProfile(profile)
  next.outputs = next.outputs.map((output) => {
    if (output.connector !== connector) {
      return { ...output, enabled: false }
    }
    return { ...output, enabled: true, x: 0, y: 0 }
  })

  return next
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number, slack: number): boolean {
  return aStart <= bEnd + slack && bStart <= aEnd + slack
}

export function snapOutputPosition(
  profile: DisplayProfile,
  connector: string,
  desiredX: number,
  desiredY: number,
  threshold = 24,
): { x: number; y: number } {
  const moving = profile.outputs.find((output) => output.connector === connector)
  if (!moving) {
    return { x: Math.round(desiredX), y: Math.round(desiredY) }
  }

  let snappedX = Math.round(desiredX)
  let snappedY = Math.round(desiredY)
  let bestDx = threshold + 1
  let bestDy = threshold + 1

  for (const other of profile.outputs) {
    if (other.connector === connector || !other.enabled) continue

    const verticalOverlap = rangesOverlap(
      desiredY,
      desiredY + moving.logicalHeight,
      other.y,
      other.y + other.logicalHeight,
      threshold * 2,
    )
    if (verticalOverlap) {
      const xCandidates = [
        other.x,
        other.x + other.logicalWidth,
        other.x - moving.logicalWidth,
        other.x + other.logicalWidth - moving.logicalWidth,
      ]
      for (const candidate of xCandidates) {
        const delta = Math.abs(candidate - desiredX)
        if (delta <= threshold && delta < bestDx) {
          bestDx = delta
          snappedX = Math.round(candidate)
        }
      }
    }

    const horizontalOverlap = rangesOverlap(
      desiredX,
      desiredX + moving.logicalWidth,
      other.x,
      other.x + other.logicalWidth,
      threshold * 2,
    )
    if (horizontalOverlap) {
      const yCandidates = [
        other.y,
        other.y + other.logicalHeight,
        other.y - moving.logicalHeight,
        other.y + other.logicalHeight - moving.logicalHeight,
      ]
      for (const candidate of yCandidates) {
        const delta = Math.abs(candidate - desiredY)
        if (delta <= threshold && delta < bestDy) {
          bestDy = delta
          snappedY = Math.round(candidate)
        }
      }
    }
  }

  return { x: snappedX, y: snappedY }
}

export function buildApplyCommands(profile: DisplayProfile): string[][] {
  if (!hasEnabledOutputs(profile)) {
    throw new Error("display-layout: at least one output must remain enabled")
  }

  const normalized = normalizeProfileOrigins(profile)
  const enabled = normalized.outputs.filter((output) => output.enabled)
  const disabled = normalized.outputs.filter((output) => !output.enabled)
  const ordered = [...enabled, ...disabled]

  return ordered.map((output) => {
    if (!output.enabled) {
      return ["hyprctl", "keyword", "monitor", `${output.connector},disable`]
    }

    const mode = output.mode.trim().length > 0 ? modeToCommand(output.mode) : "preferred"
    return [
      "hyprctl",
      "keyword",
      "monitor",
      `${output.connector},${mode},${Math.round(output.x)}x${Math.round(output.y)},${trimNumber(output.scale)},transform,${output.transform}`,
    ]
  })
}
