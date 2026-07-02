import { Gtk } from "ags/gtk4"
import { For, createEffect, createMemo, createState, onCleanup } from "gnim"
import type { Accessor } from "gnim"

import type { DisplayProfile, DisplayOutput, DisplayTransform } from "../../modules/display-layout/domain.ts"
import {
  applyHorizontalPreset,
  applySingleOutputPreset,
  applySwapHorizontalPreset,
  cloneProfile,
  getProfileBounds,
  hasEnabledOutputs,
  setOutputEnabled,
  setOutputMode,
  setOutputPosition,
  setOutputScale,
  setOutputTransform,
  snapOutputPosition,
} from "../../modules/display-layout/domain.ts"
import Icon from "../../shared/ui/Icon.tsx"
import SectionHeader from "../../shared/ui/SectionHeader.tsx"
import { ICONS } from "../../shared/ui/icons.ts"

const SCALE_OPTIONS = [0.75, 1, 1.25, 1.5, 2]
const ROTATION_OPTIONS: DisplayTransform[] = [0, 1, 2, 3]
const CANVAS_WIDTH = 560
const CANVAS_HEIGHT = 340
const CANVAS_PADDING = 18

interface DisplayLayoutViewProps {
  currentProfile: Accessor<DisplayProfile | null>
  savedProfiles: Accessor<DisplayProfile[]>
  onApply: (profile: DisplayProfile) => Promise<{ ok: boolean; error?: string }>
  onSave: (name: string, profile: DisplayProfile) => Promise<{ ok: boolean; error?: string }>
  onRefresh: () => Promise<void>
}

function selectConnector(profile: DisplayProfile, preferred: string): string {
  if (preferred && profile.outputs.some((output) => output.connector === preferred)) {
    return preferred
  }

  const focused = profile.outputs.find((output) => output.focused)
  if (focused) return focused.connector

  return profile.outputs[0]?.connector ?? ""
}

function formatScale(scale: number): string {
  return `${scale.toFixed(2).replace(/\.?0+$/, "")}x`
}

function formatRotation(transform: DisplayTransform): string {
  if (transform === 0) return "0 DEG"
  if (transform === 1) return "90 DEG"
  if (transform === 2) return "180 DEG"
  if (transform === 3) return "270 DEG"
  if (transform === 4) return "FLIPPED"
  if (transform === 5) return "FLIP 90"
  if (transform === 6) return "FLIP 180"
  return "FLIP 270"
}

function cycleMode(output: DisplayOutput, delta: number): string {
  if (output.availableModes.length === 0) return output.mode
  const currentIndex = Math.max(0, output.availableModes.indexOf(output.mode))
  const nextIndex = (currentIndex + delta + output.availableModes.length) % output.availableModes.length
  return output.availableModes[nextIndex]
}

function nextScaleOptions(currentScale: number): number[] {
  if (SCALE_OPTIONS.includes(currentScale)) return SCALE_OPTIONS
  return [...SCALE_OPTIONS, currentScale].sort((a, b) => a - b)
}

export default function DisplayLayoutView(props: DisplayLayoutViewProps) {
  const [draft, setDraft] = createState<DisplayProfile | null>(null)
  const [selectedConnector, setSelectedConnector] = createState("")
  const [saveName, setSaveName] = createState("")
  const [dirty, setDirty] = createState(false)
  const [busy, setBusy] = createState(false)
  const [status, setStatus] = createState("LAYOUT::READY")

  function resetDraft(profile: DisplayProfile, nextDirty: boolean): void {
    const cloned = cloneProfile(profile)
    setDraft(cloned)
    setSelectedConnector(selectConnector(cloned, selectedConnector()))
    setDirty(nextDirty)
  }

  createEffect(() => {
    const current = props.currentProfile()
    if (!current || dirty()) return
    resetDraft(current, false)
  }, { immediate: true })

  const selectedOutput = createMemo(() => {
    const profile = draft()
    if (!profile) return null
    return profile.outputs.find((output) => output.connector === selectedConnector()) ?? null
  })

  const canvasLayout = createMemo(() => {
    const profile = draft()
    if (!profile) {
      return {
        minX: 0,
        minY: 0,
        scale: 1,
        offsetX: CANVAS_PADDING,
        offsetY: CANVAS_PADDING,
      }
    }

    const bounds = getProfileBounds(profile)
    const innerWidth = CANVAS_WIDTH - CANVAS_PADDING * 2
    const innerHeight = CANVAS_HEIGHT - CANVAS_PADDING * 2
    const scale = Math.min(innerWidth / bounds.width, innerHeight / bounds.height, 1)
    const offsetX = CANVAS_PADDING + Math.max(0, (innerWidth - bounds.width * scale) / 2)
    const offsetY = CANVAS_PADDING + Math.max(0, (innerHeight - bounds.height * scale) / 2)

    return {
      minX: bounds.minX,
      minY: bounds.minY,
      scale,
      offsetX,
      offsetY,
    }
  })

  const canApply = createMemo(() => {
    const profile = draft()
    return !busy() && profile != null && hasEnabledOutputs(profile)
  })
  const canSave = createMemo(() => !busy() && draft() != null && saveName().trim().length > 0)
  const rotationOptions = createMemo(() => ROTATION_OPTIONS)
  const dirtyLabel = dirty((value) => value ? "DIRTY" : "CURRENT")
  const outputCountLabel = createMemo(() => {
    const count = draft()?.outputs.length ?? 0
    return count === 1 ? "1 OUTPUT" : `${count} OUTPUTS`
  })

  function updateDraft(updater: (profile: DisplayProfile) => DisplayProfile, message?: string): void {
    const currentDraft = draft()
    if (!currentDraft) return
    const next = updater(currentDraft)
    setDraft(next)
    setSelectedConnector(selectConnector(next, selectedConnector()))
    setDirty(true)
    if (message) {
      setStatus(message)
    }
  }

  function loadSavedProfile(profile: DisplayProfile): void {
    const cloned = cloneProfile(profile)
    setDraft(cloned)
    setSelectedConnector(selectConnector(cloned, selectedConnector()))
    setSaveName(profile.name)
    setDirty(true)
    setStatus(`PROFILE::LOADED ${profile.name}`)
  }

  async function handleApply(): Promise<void> {
    const currentDraft = draft()
    if (!currentDraft || busy()) return

    setBusy(true)
    const result = await props.onApply(currentDraft)
    setBusy(false)

    if (result.ok) {
      setDirty(false)
      setStatus("APPLY::OK")
    } else {
      setStatus(result.error ? `APPLY::FAIL ${result.error}` : "APPLY::FAIL")
    }
  }

  async function handleSave(): Promise<void> {
    const currentDraft = draft()
    const name = saveName().trim()
    if (!currentDraft || !name || busy()) return

    setBusy(true)
    const result = await props.onSave(name, currentDraft)
    setBusy(false)

    if (result.ok) {
      setStatus(`SAVE::OK ${name}`)
    } else {
      setStatus(result.error ? `SAVE::FAIL ${result.error}` : "SAVE::FAIL")
    }
  }

  async function handleRefresh(): Promise<void> {
    if (busy()) return
    setBusy(true)
    await props.onRefresh()
    setBusy(false)
    setStatus("REFRESH::OK")
  }

  const profileCountLabel = props.savedProfiles((profiles) =>
    profiles.length > 0 ? `${profiles.length} SAVED` : "NO PROFILES",
  )

  return (
    <box class="DisplayLayoutRoot" spacing={16} hexpand>
      <box class="DisplaySidebar" orientation={Gtk.Orientation.VERTICAL} spacing={10} widthRequest={220}>
        <SectionHeader label="PROFILES" />
        <label class="DisplaySidebarMeta" label={profileCountLabel} halign={Gtk.Align.START} />

        <box class="DisplayPresetGroup" orientation={Gtk.Orientation.VERTICAL} spacing={6}>
          <button
            class="DisplayPresetButton"
            onClicked={() => {
              const current = props.currentProfile()
              if (!current) return
              resetDraft(current, false)
              setStatus("RESET::CURRENT")
            }}
          >
            <label label="CURRENT" halign={Gtk.Align.START} xalign={0} />
          </button>
          <button
            class="DisplayPresetButton"
            onClicked={() => updateDraft(applyHorizontalPreset, "PRESET::HORIZONTAL")}
          >
            <label label="HORIZONTAL" halign={Gtk.Align.START} xalign={0} />
          </button>
          <button
            class="DisplayPresetButton"
            onClicked={() => updateDraft(applySwapHorizontalPreset, "PRESET::SWAP")}
          >
            <label label="SWAP" halign={Gtk.Align.START} xalign={0} />
          </button>
          <button
            class="DisplayPresetButton"
            onClicked={() => {
              const output = selectedOutput()
              if (!output) return
              updateDraft(
                (profile) => applySingleOutputPreset(profile, output.connector),
                `ONLY::${output.connector}`,
              )
            }}
          >
            <label label="SINGLE" halign={Gtk.Align.START} xalign={0} />
          </button>
        </box>

        <SectionHeader label="SAVED" />
        <Gtk.ScrolledWindow
          class="DisplayProfilesScroll"
          hscrollbarPolicy={Gtk.PolicyType.NEVER}
          vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
          vexpand
        >
          <box orientation={Gtk.Orientation.VERTICAL} spacing={6}>
            <For each={props.savedProfiles} id={(profile) => profile.name}>
              {(profile) => (
                <button class="DisplayProfileButton" onClicked={() => loadSavedProfile(profile)}>
                  <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                    <label class="DisplayProfileName" label={profile.name} halign={Gtk.Align.START} xalign={0} />
                    <label
                      class="DisplayProfileMeta"
                      label={`${profile.outputs.filter((output) => output.enabled).length} ACTIVE`}
                      halign={Gtk.Align.START}
                      xalign={0}
                    />
                  </box>
                </button>
              )}
            </For>
          </box>
        </Gtk.ScrolledWindow>
      </box>

      <box class="DisplayCenter" orientation={Gtk.Orientation.VERTICAL} spacing={12} hexpand>
        <box class="DisplayCanvasHeader" spacing={10}>
          <label class="DisplayCanvasTitle" label="LAYOUT" halign={Gtk.Align.START} hexpand />
          <label class="DisplayCanvasHint" label={outputCountLabel} halign={Gtk.Align.END} />
          <label class="DisplayCanvasHint" label={dirtyLabel} halign={Gtk.Align.END} />
        </box>

        <overlay class="DisplayCanvas">
          <box class="DisplayCanvasBase" widthRequest={CANVAS_WIDTH} heightRequest={CANVAS_HEIGHT} />
          <DisplayCanvasFixed
            profile={draft}
            layout={canvasLayout}
            selectedConnector={selectedConnector}
            onSelect={(connector) => setSelectedConnector(connector)}
            onMove={(connector, x, y) => {
              updateDraft((profile) => setOutputPosition(profile, connector, x, y))
            }}
          />
        </overlay>

        <box class="DisplayActions" spacing={8}>
          <button class="DisplayActionButton" onClicked={handleRefresh}>
            <label label="REFRESH" />
          </button>
          <button
            class="DisplayActionButton"
            sensitive={createMemo(() => props.currentProfile() != null && !busy())}
            onClicked={() => {
              const current = props.currentProfile()
              if (!current) return
              resetDraft(current, false)
              setStatus("REVERT::CURRENT")
            }}
          >
            <label label="REVERT" />
          </button>
          <button class="DisplayActionButton DisplayActionButtonPrimary" sensitive={canApply} onClicked={handleApply}>
            <label label={busy((value) => value ? "APPLYING" : "APPLY")} />
          </button>
          <entry
            class="DisplaySaveEntry"
            hexpand
            text={saveName}
            placeholder_text="PROFILE NAME"
            onChanged={(self: any) => setSaveName(self.text ?? "")}
            onActivate={() => {
              void handleSave()
            }}
          />
          <button class="DisplayActionButton" sensitive={canSave} onClicked={handleSave}>
            <label label="SAVE" />
          </button>
        </box>

        <label class="DisplayStatus" label={status} halign={Gtk.Align.START} xalign={0} />
      </box>

      <box class="DisplayInspector" orientation={Gtk.Orientation.VERTICAL} spacing={10} widthRequest={240}>
        <label class="DisplayInspectorTitle" label="INSPECTOR" halign={Gtk.Align.START} />
        <label
          class="DisplayInspectorConnector"
          label={selectedOutput((output) => output?.connector || "NO OUTPUT")}
          halign={Gtk.Align.START}
          xalign={0}
        />
        <label
          class="DisplayInspectorMeta"
          label={selectedOutput((output) => output?.description || "SELECT OUTPUT")}
          halign={Gtk.Align.START}
          xalign={0}
          wrap
        />

        <togglebutton
          class="DisplayEnabledToggle"
          sensitive={selectedOutput((output) => output != null)}
          active={selectedOutput((output) => output?.enabled ?? false)}
          onClicked={() => {
            const output = selectedOutput()
            if (!output) return
            updateDraft(
              (profile) => setOutputEnabled(profile, output.connector, !output.enabled),
              `${output.connector}::${output.enabled ? "DISABLED" : "ENABLED"}`,
            )
          }}
        >
          <label label={selectedOutput((output) => output?.enabled ? "ENABLED" : "DISABLED")} />
        </togglebutton>

        <box class="DisplayModePicker" orientation={Gtk.Orientation.VERTICAL} spacing={6}>
          <label class="DisplayFieldLabel" label="MODE" halign={Gtk.Align.START} />
          <box spacing={6}>
            <button
              class="DisplayCycleButton"
              sensitive={selectedOutput((output) => output != null && output.availableModes.length > 1)}
              onClicked={() => {
                const output = selectedOutput()
                if (!output) return
                updateDraft(
                  (profile) => setOutputMode(profile, output.connector, cycleMode(output, -1)),
                  `${output.connector}::MODE`,
                )
              }}
            >
              <Icon icon={ICONS.chevronLeft} />
            </button>
            <label
              class="DisplayModeLabel"
              label={selectedOutput((output) => output?.mode || "—")}
              hexpand
              halign={Gtk.Align.FILL}
              xalign={0}
            />
            <button
              class="DisplayCycleButton"
              sensitive={selectedOutput((output) => output != null && output.availableModes.length > 1)}
              onClicked={() => {
                const output = selectedOutput()
                if (!output) return
                updateDraft(
                  (profile) => setOutputMode(profile, output.connector, cycleMode(output, 1)),
                  `${output.connector}::MODE`,
                )
              }}
            >
              <Icon icon={ICONS.chevronRight} />
            </button>
          </box>
        </box>

        <box class="DisplayScalePicker" orientation={Gtk.Orientation.VERTICAL} spacing={6}>
          <label class="DisplayFieldLabel" label="SCALE" halign={Gtk.Align.START} />
          <box spacing={6}>
            <For each={createMemo(() => nextScaleOptions(selectedOutput()?.scale ?? 1))}>
              {(scale) => {
                const scaleValue = scale as number
                return (
                <button
                  class={createMemo(() =>
                    selectedOutput()?.scale === scaleValue
                      ? "DisplayScaleButton DisplayScaleButtonActive"
                      : "DisplayScaleButton",
                  )}
                  sensitive={selectedOutput((output) => output != null)}
                  onClicked={() => {
                    const output = selectedOutput()
                    if (!output) return
                    updateDraft(
                      (profile) => setOutputScale(profile, output.connector, scaleValue),
                      `${output.connector}::SCALE`,
                    )
                  }}
                >
                  <label label={formatScale(scaleValue)} />
                </button>
                )
              }}
            </For>
          </box>
        </box>

        <box class="DisplayRotationPicker" orientation={Gtk.Orientation.VERTICAL} spacing={6}>
          <label class="DisplayFieldLabel" label="ROTATION" halign={Gtk.Align.START} />
          <box spacing={6}>
            <For each={rotationOptions}>
              {(transform) => {
                const transformValue = transform as DisplayTransform
                return (
                <button
                  class={createMemo(() =>
                    selectedOutput()?.transform === transformValue
                      ? "DisplayRotationButton DisplayRotationButtonActive"
                      : "DisplayRotationButton",
                  )}
                  sensitive={selectedOutput((output) => output != null)}
                  onClicked={() => {
                    const output = selectedOutput()
                    if (!output) return
                    updateDraft(
                      (profile) => setOutputTransform(profile, output.connector, transformValue),
                      `${output.connector}::ROTATION`,
                    )
                  }}
                >
                  <label label={formatRotation(transformValue)} />
                </button>
                )
              }}
            </For>
          </box>
        </box>

        <box class="DisplayPositionInfo" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
          <label class="DisplayFieldLabel" label="POSITION" halign={Gtk.Align.START} />
          <label
            class="DisplayInspectorMeta"
            label={selectedOutput((output) =>
              output ? `X=${output.x}, Y=${output.y}` : "DRAG CARD"
            )}
            halign={Gtk.Align.START}
            xalign={0}
          />
          <label
            class="DisplayInspectorMeta"
            label={selectedOutput((output) =>
              output ? `${output.logicalWidth} x ${output.logicalHeight} LOGICAL PX` : ""
            )}
            halign={Gtk.Align.START}
            xalign={0}
          />
        </box>
      </box>
    </box>
  )
}

interface DisplayCanvasFixedProps {
  profile: Accessor<DisplayProfile | null>
  layout: Accessor<{ minX: number; minY: number; scale: number; offsetX: number; offsetY: number }>
  selectedConnector: Accessor<string>
  onSelect: (connector: string) => void
  onMove: (connector: string, x: number, y: number) => void
}

function DisplayCanvasFixed(props: DisplayCanvasFixedProps) {
  const fixed = new Gtk.Fixed({
    widthRequest: CANVAS_WIDTH,
    heightRequest: CANVAS_HEIGHT,
    halign: Gtk.Align.START,
    valign: Gtk.Align.START,
  })
  fixed.cssClasses = ["DisplayCanvasFixed"]

  const cards = new Map<string, {
    button: Gtk.Button
    connectorLabel: Gtk.Label
    metaLabel: Gtk.Label
  }>()

  function ensureCard(connector: string) {
    const existing = cards.get(connector)
    if (existing) return existing

    const connectorLabel = new Gtk.Label({
      halign: Gtk.Align.START,
      xalign: 0,
      maxWidthChars: 16,
      ellipsize: 3,
    })
    connectorLabel.cssClasses = ["DisplayCanvasConnector"]

    const metaLabel = new Gtk.Label({
      halign: Gtk.Align.START,
      xalign: 0,
      maxWidthChars: 18,
      ellipsize: 3,
    })
    metaLabel.cssClasses = ["DisplayCanvasMeta"]

    const content = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      spacing: 2,
    })
    content.append(connectorLabel)
    content.append(metaLabel)

    const button = new Gtk.Button({
      halign: Gtk.Align.START,
      valign: Gtk.Align.START,
      child: content,
    })
    button.cssClasses = ["DisplayCanvasCard"]
    button.connect("clicked", () => props.onSelect(connector))

    const drag = new Gtk.GestureDrag()
    let startX = 0
    let startY = 0

    drag.connect("drag-begin", () => {
      const output = props.profile()?.outputs.find((item) => item.connector === connector)
      if (!output) return
      startX = output.x
      startY = output.y
      props.onSelect(connector)
    })

    drag.connect("drag-update", (_gesture: unknown, offsetX: number, offsetY: number) => {
      const profile = props.profile()
      if (!profile) return

      const scale = Math.max(props.layout().scale, 0.001)
      const desiredX = startX + offsetX / scale
      const desiredY = startY + offsetY / scale
      const snapped = snapOutputPosition(profile, connector, desiredX, desiredY)
      props.onMove(connector, snapped.x, snapped.y)
    })

    button.add_controller(drag)
    fixed.put(button, 0, 0)

    const refs = { button, connectorLabel, metaLabel }
    cards.set(connector, refs)
    return refs
  }

  createEffect(() => {
    const profile = props.profile()
    const layout = props.layout()
    const selected = props.selectedConnector()
    const outputs = profile?.outputs ?? []
    const seen = new Set<string>()

    for (const output of outputs) {
      seen.add(output.connector)
      const refs = ensureCard(output.connector)

      refs.connectorLabel.label = output.connector
      refs.metaLabel.label = output.enabled ? `${output.mode} / ${formatRotation(output.transform)}` : "DISABLED"
      refs.button.widthRequest = Math.max(84, Math.round(output.logicalWidth * layout.scale))
      refs.button.heightRequest = Math.max(54, Math.round(output.logicalHeight * layout.scale))
      refs.button.cssClasses = [
        "DisplayCanvasCard",
        ...(selected === output.connector ? ["DisplayCanvasCardSelected"] : []),
        ...(!output.enabled ? ["DisplayCanvasCardDisabled"] : []),
        ...(output.focused ? ["DisplayCanvasCardFocused"] : []),
      ]

      fixed.move(
        refs.button,
        Math.round(layout.offsetX + (output.x - layout.minX) * layout.scale),
        Math.round(layout.offsetY + (output.y - layout.minY) * layout.scale),
      )
    }

    for (const [connector, refs] of cards.entries()) {
      if (seen.has(connector)) continue
      fixed.remove(refs.button)
      cards.delete(connector)
    }
  }, { immediate: true })

  onCleanup(() => {
    for (const refs of cards.values()) {
      fixed.remove(refs.button)
    }
    cards.clear()
  })

  return fixed
}
