import { Gtk, Gdk } from "ags/gtk4"
import { createState, createMemo } from "gnim"
import type { Accessor } from "gnim"

import { searchApps, type AppEntry } from "../../modules/launcher/domain.ts"
import { loadAllApps, launchApp, loadRecentIds } from "../../runtime/app-source.ts"
import { closeLauncher } from "../../app/launcher-controller.ts"
import Icon from "../../shared/ui/Icon.tsx"
import { ICONS } from "../../shared/ui/icons.ts"

const MAX_RESULTS = 8

const EMPTY_ENTRY: AppEntry = { id: "", name: "", description: "", keywords: [], icon: null }

export default function LauncherView() {
  const allApps = loadAllApps()
  const [query, setQuery] = createState("")
  const [selectedIndex, setSelectedIndex] = createState(0)
  const [recentIds, setRecentIds] = createState<string[]>(loadRecentIds())

  const results = createMemo(() =>
    searchApps(allApps, query(), MAX_RESULTS, recentIds()),
  )

  function getResult(i: number): Accessor<AppEntry> {
    return createMemo(() => results()[i] ?? EMPTY_ENTRY)
  }

  function isVisible(i: number): Accessor<boolean> {
    return createMemo(() => i < results().length)
  }

  let entryRef: any = null

  function onActivateIndex(i: number) {
    const r = results()
    if (i < r.length) {
      launchApp(r[i].id)
      closeLauncher()
      // 履歴を更新
      setRecentIds(loadRecentIds())
    }
  }

  function onQueryChanged(self: any) {
    setQuery(self.text ?? "")
    setSelectedIndex(0)
  }

  function onKeyNav(_self: any, keyval: number): boolean {
    const r = results()
    if (keyval === Gdk.KEY_Down || keyval === Gdk.KEY_Tab) {
      if (r.length > 0) setSelectedIndex(Math.min(selectedIndex() + 1, r.length - 1))
      return true
    }
    if (keyval === Gdk.KEY_Up) {
      setSelectedIndex(Math.max(selectedIndex() - 1, 0))
      return true
    }
    if (keyval === Gdk.KEY_Return) {
      onActivateIndex(selectedIndex())
      return true
    }
    return false
  }

  return (
    <box
      class="LauncherPanel"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={0}
      widthRequest={560}
      onRealize={(self: any) => {
        const keyCtrl = new Gtk.EventControllerKey()
        keyCtrl.connect("key-pressed", (_ctrl: any, keyval: number) => onKeyNav(self, keyval))
        self.add_controller(keyCtrl)

        // ランチャーが表示されるたびに entry の text で query を同期
        self.connect("map", () => {
          if (entryRef) {
            setQuery(entryRef.text ?? "")
            setSelectedIndex(0)
            setRecentIds(loadRecentIds())
            entryRef.grab_focus()
          }
        })
      }}
    >
      <box class="LauncherSearch" spacing={10}>
        <label class="LauncherSearchIcon" label="/" />
        <entry
          class="LauncherEntry"
          hexpand
          placeholder_text="Search applications..."
          onChanged={onQueryChanged}
          onActivate={() => onActivateIndex(selectedIndex())}
          onRealize={(self: any) => {
            entryRef = self
            self.grab_focus()
          }}
        />
      </box>

      <box class="LauncherResults" orientation={Gtk.Orientation.VERTICAL} spacing={0}>
        {Array.from({ length: MAX_RESULTS }).map((_, i) => (
          <ResultRow
            entry={getResult(i)}
            visible={isVisible(i)}
            selected={createMemo(() => selectedIndex() === i)}
            onActivate={() => onActivateIndex(i)}
          />
        ))}
      </box>
    </box>
  )
}

interface ResultRowProps {
  entry: Accessor<AppEntry>
  visible: Accessor<boolean>
  selected: Accessor<boolean>
  onActivate: () => void
}

function ResultRow(props: ResultRowProps) {
  const itemClass = props.selected((sel) =>
    sel ? "LauncherItem LauncherItemSelected" : "LauncherItem",
  )

  const name = props.entry((e) => e.name || " ")
  const desc = props.entry((e) => e.description || " ")
  const iconName = props.entry((e) => e.icon)
  const hasIcon = props.entry((e) => e.icon != null && e.icon.length > 0)

  return (
    <button
      class={itemClass}
      visible={props.visible}
      onClicked={props.onActivate}
    >
      <box spacing={12}>
        <image
          class="LauncherItemIcon"
          iconName={iconName}
          pixelSize={24}
          visible={hasIcon}
        />
        <Icon
          class="LauncherItemIconFallback"
          icon={ICONS.appFallback}
          widthRequest={24}
          visible={hasIcon((v) => !v)}
        />
        <box orientation={Gtk.Orientation.VERTICAL} spacing={2} hexpand>
          <label class="LauncherItemName" label={name} halign={Gtk.Align.START} xalign={0} />
          <label class="LauncherItemDesc" label={desc} halign={Gtk.Align.START} xalign={0} ellipsize={3} />
        </box>
      </box>
    </button>
  )
}
