import { Gtk } from "ags/gtk4"
import { For, createEffect, createMemo, createState } from "gnim"
import type { Accessor } from "gnim"

import type { DisplayProfile, DisplayOutput } from "../../modules/display-layout/domain.ts"
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
  snapOutputPosition,
} from "../../modules/display-layout/domain.ts"

const SCALE_OPTIONS = [0.75, 1, 1.25, 1.5, 2]
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

const EMPTY_OUTPUT: DisplayOutput = {
  connector: "",
  description: "",
  enabled: false,
  mode: "",
  availableModes: [],
  scale: 1,
  x: 0,
  y: 0,
  logicalWidth: 1,
  logicalHeight: 1,
  focused: false,
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
  const [status, setStatus] = createState("Drag outputs to rearrange them, then apply or save the draft.")

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

  const outputIds = createMemo(() => draft()?.outputs.map((output) => output.connector) ?? [])
  const canApply = createMemo(() => {
    const profile = draft()
    return !busy() && profile != null && hasEnabledOutputs(profile)
  })
  const canSave = createMemo(() => !busy() && draft() != null && saveName().trim().length > 0)
  const dirtyLabel = dirty((value) => value ? "Draft has unapplied changes." : "Draft matches current outputs.")

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
    setStatus(`Loaded profile: ${profile.name}`)
  }

  async function handleApply(): Promise<void> {
    const currentDraft = draft()
    if (!currentDraft || busy()) return

    setBusy(true)
    const result = await props.onApply(currentDraft)
    setBusy(false)

    if (result.ok) {
      setDirty(false)
      setStatus("Applied display layout.")
    } else {
      setStatus(result.error ?? "Failed to apply display layout.")
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
      setStatus(`Saved profile: ${name}`)
    } else {
      setStatus(result.error ?? "Failed to save display profile.")
    }
  }

  async function handleRefresh(): Promise<void> {
    if (busy()) return
    setBusy(true)
    await props.onRefresh()
    setBusy(false)
    setStatus("Refreshed current monitor state.")
  }

  const profileCountLabel = props.savedProfiles((profiles) =>
    profiles.length > 0 ? `${profiles.length} saved` : "No saved profiles",
  )

  return (
    <box class="DisplayLayoutRoot" spacing={16} hexpand>
      <box class="DisplaySidebar" orientation={Gtk.Orientation.VERTICAL} spacing={10} widthRequest={220}>
        <label class="DisplaySidebarTitle" label="PROFILES" halign={Gtk.Align.START} />
        <label class="DisplaySidebarMeta" label={profileCountLabel} halign={Gtk.Align.START} />

        <box class="DisplayPresetGroup" orientation={Gtk.Orientation.VERTICAL} spacing={6}>
          <button
            class="DisplayPresetButton"
            onClicked={() => {
              const current = props.currentProfile()
              if (!current) return
              resetDraft(current, false)
              setStatus("Reset draft to current layout.")
            }}
          >
            <label label="Current" halign={Gtk.Align.START} xalign={0} />
          </button>
          <button
            class="DisplayPresetButton"
            onClicked={() => updateDraft(applyHorizontalPreset, "Applied horizontal preset to draft.")}
          >
            <label label="Horizontal" halign={Gtk.Align.START} xalign={0} />
          </button>
          <button
            class="DisplayPresetButton"
            onClicked={() => updateDraft(applySwapHorizontalPreset, "Swapped the draft's horizontal order.")}
          >
            <label label="Swap Left/Right" halign={Gtk.Align.START} xalign={0} />
          </button>
          <button
            class="DisplayPresetButton"
            onClicked={() => {
              const output = selectedOutput()
              if (!output) return
              updateDraft(
                (profile) => applySingleOutputPreset(profile, output.connector),
                `Kept only ${output.connector} enabled in the draft.`,
              )
            }}
          >
            <label label="Single Output" halign={Gtk.Align.START} xalign={0} />
          </button>
        </box>

        <label class="DisplaySidebarTitle" label="SAVED" halign={Gtk.Align.START} />
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
                      label={`${profile.outputs.filter((output) => output.enabled).length} active outputs`}
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
          <label class="DisplayCanvasHint" label={dirtyLabel} halign={Gtk.Align.END} />
        </box>

        <overlay class="DisplayCanvas">
          <box class="DisplayCanvasBase" widthRequest={CANVAS_WIDTH} heightRequest={CANVAS_HEIGHT} />
          <For each={outputIds} id={(connector) => connector}>
            {(connector) => {
              const output = createMemo(() =>
                draft()?.outputs.find((item) => item.connector === connector) ?? EMPTY_OUTPUT,
              )

              return (
                <DisplayCanvasCard
                  output={output}
                  layout={canvasLayout}
                  profile={draft}
                  selected={createMemo(() => selectedConnector() === connector)}
                  onSelect={() => setSelectedConnector(connector)}
                  onMove={(x, y) => {
                    updateDraft((profile) => setOutputPosition(profile, connector, x, y))
                  }}
                />
              )
            }}
          </For>
        </overlay>

        <box class="DisplayActions" spacing={8}>
          <button class="DisplayActionButton" onClicked={handleRefresh}>
            <label label="Refresh" />
          </button>
          <button
            class="DisplayActionButton"
            sensitive={createMemo(() => props.currentProfile() != null && !busy())}
            onClicked={() => {
              const current = props.currentProfile()
              if (!current) return
              resetDraft(current, false)
              setStatus("Reverted draft to current layout.")
            }}
          >
            <label label="Revert" />
          </button>
          <button class="DisplayActionButton DisplayActionButtonPrimary" sensitive={canApply} onClicked={handleApply}>
            <label label={busy((value) => value ? "Applying..." : "Apply")} />
          </button>
          <entry
            class="DisplaySaveEntry"
            hexpand
            text={saveName}
            placeholder_text="Profile name"
            onChanged={(self: any) => setSaveName(self.text ?? "")}
            onActivate={() => {
              void handleSave()
            }}
          />
          <button class="DisplayActionButton" sensitive={canSave} onClicked={handleSave}>
            <label label="Save" />
          </button>
        </box>

        <label class="DisplayStatus" label={status} halign={Gtk.Align.START} xalign={0} />
      </box>

      <box class="DisplayInspector" orientation={Gtk.Orientation.VERTICAL} spacing={10} widthRequest={240}>
        <label class="DisplayInspectorTitle" label="INSPECTOR" halign={Gtk.Align.START} />
        <label
          class="DisplayInspectorConnector"
          label={selectedOutput((output) => output?.connector || "No output selected")}
          halign={Gtk.Align.START}
          xalign={0}
        />
        <label
          class="DisplayInspectorMeta"
          label={selectedOutput((output) => output?.description || "Select an output on the canvas or from a saved profile.")}
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
              `${output.connector} ${output.enabled ? "disabled" : "enabled"} in the draft.`,
            )
          }}
        >
          <label label={selectedOutput((output) => output?.enabled ? "Enabled" : "Disabled")} />
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
                  `Changed ${output.connector} mode.`,
                )
              }}
            >
              <label label="‹" />
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
                  `Changed ${output.connector} mode.`,
                )
              }}
            >
              <label label="›" />
            </button>
          </box>
        </box>

        <box class="DisplayScalePicker" orientation={Gtk.Orientation.VERTICAL} spacing={6}>
          <label class="DisplayFieldLabel" label="SCALE" halign={Gtk.Align.START} />
          <box spacing={6}>
            <For each={createMemo(() => nextScaleOptions(selectedOutput()?.scale ?? 1))}>
              {(scale) => (
                <button
                  class={createMemo(() =>
                    selectedOutput()?.scale === scale
                      ? "DisplayScaleButton DisplayScaleButtonActive"
                      : "DisplayScaleButton",
                  )}
                  sensitive={selectedOutput((output) => output != null)}
                  onClicked={() => {
                    const output = selectedOutput()
                    if (!output) return
                    updateDraft(
                      (profile) => setOutputScale(profile, output.connector, scale),
                      `Changed ${output.connector} scale.`,
                    )
                  }}
                >
                  <label label={formatScale(scale)} />
                </button>
              )}
            </For>
          </box>
        </box>

        <box class="DisplayPositionInfo" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
          <label class="DisplayFieldLabel" label="POSITION" halign={Gtk.Align.START} />
          <label
            class="DisplayInspectorMeta"
            label={selectedOutput((output) =>
              output ? `x=${output.x}, y=${output.y}` : "Drag a card to move it"
            )}
            halign={Gtk.Align.START}
            xalign={0}
          />
          <label
            class="DisplayInspectorMeta"
            label={selectedOutput((output) =>
              output ? `${output.logicalWidth} × ${output.logicalHeight} logical px` : ""
            )}
            halign={Gtk.Align.START}
            xalign={0}
          />
        </box>
      </box>
    </box>
  )
}

interface DisplayCanvasCardProps {
  output: Accessor<DisplayOutput>
  layout: Accessor<{ minX: number; minY: number; scale: number; offsetX: number; offsetY: number }>
  profile: Accessor<DisplayProfile | null>
  selected: Accessor<boolean>
  onSelect: () => void
  onMove: (x: number, y: number) => void
}

function DisplayCanvasCard(props: DisplayCanvasCardProps) {
  const className = createMemo(() => {
    const output = props.output()
    let cls = "DisplayCanvasCard"
    if (props.selected()) cls += " DisplayCanvasCardSelected"
    if (!output.enabled) cls += " DisplayCanvasCardDisabled"
    if (output.focused) cls += " DisplayCanvasCardFocused"
    return cls
  })

  const marginStart = createMemo(() => {
    const output = props.output()
    const layout = props.layout()
    return Math.round(layout.offsetX + (output.x - layout.minX) * layout.scale)
  })

  const marginTop = createMemo(() => {
    const output = props.output()
    const layout = props.layout()
    return Math.round(layout.offsetY + (output.y - layout.minY) * layout.scale)
  })

  const widthRequest = createMemo(() => {
    const output = props.output()
    const layout = props.layout()
    return Math.max(84, Math.round(output.logicalWidth * layout.scale))
  })

  const heightRequest = createMemo(() => {
    const output = props.output()
    const layout = props.layout()
    return Math.max(54, Math.round(output.logicalHeight * layout.scale))
  })

  return (
    <button
      class={className}
      halign={Gtk.Align.START}
      valign={Gtk.Align.START}
      marginStart={marginStart}
      marginTop={marginTop}
      widthRequest={widthRequest}
      heightRequest={heightRequest}
      onClicked={props.onSelect}
      onRealize={(self: any) => {
        const drag = new Gtk.GestureDrag()
        let startX = 0
        let startY = 0

        drag.connect("drag-begin", () => {
          const output = props.output()
          startX = output.x
          startY = output.y
          props.onSelect()
        })

        drag.connect("drag-update", (_gesture: unknown, offsetX: number, offsetY: number) => {
          const profile = props.profile()
          const output = props.output()
          if (!profile) return

          const scale = Math.max(props.layout().scale, 0.001)
          const desiredX = startX + offsetX / scale
          const desiredY = startY + offsetY / scale
          const snapped = snapOutputPosition(profile, output.connector, desiredX, desiredY)
          props.onMove(snapped.x, snapped.y)
        })

        self.add_controller(drag)
      }}
    >
      <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
        <label class="DisplayCanvasConnector" label={props.output((output) => output.connector)} />
        <label
          class="DisplayCanvasMeta"
          label={props.output((output) => output.enabled ? output.mode : "disabled")}
          maxWidthChars={18}
          ellipsize={3}
        />
      </box>
    </button>
  )
}
