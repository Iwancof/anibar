import { Gtk, Gdk } from "ags/gtk4"
import { createState } from "gnim"

import { searchApps, type AppEntry } from "../../modules/launcher/domain.ts"
import { loadAllApps, launchApp } from "../../runtime/app-source.ts"
import { closeLauncher } from "../../app/launcher-controller.ts"

const MAX_RESULTS = 8

export default function LauncherView() {
  const allApps = loadAllApps()
  const [query, setQuery] = createState("")
  const [selectedIndex, setSelectedIndex] = createState(0)

  const results = query((q) => searchApps(allApps, q, MAX_RESULTS))
  const hasResults = results((r) => r.length > 0)

  function onActivate(app: AppEntry) {
    launchApp(app.id)
    closeLauncher()
    setQuery("")
    setSelectedIndex(0)
  }

  function onQueryChanged(self: any) {
    setQuery(self.text ?? "")
    setSelectedIndex(0)
  }

  function onKeyNav(self: any, keyval: number) {
    const r = results()
    if (r.length === 0) return false

    if (keyval === Gdk.KEY_Down || keyval === Gdk.KEY_Tab) {
      setSelectedIndex(Math.min(selectedIndex() + 1, r.length - 1))
      return true
    }
    if (keyval === Gdk.KEY_Up) {
      setSelectedIndex(Math.max(selectedIndex() - 1, 0))
      return true
    }
    if (keyval === Gdk.KEY_Return) {
      const idx = selectedIndex()
      if (idx < r.length) onActivate(r[idx])
      return true
    }
    return false
  }

  return (
    <box
      class="LauncherPanel"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={0}
      onRealize={(self: any) => {
        // Key navigation on the panel
        const keyCtrl = new Gtk.EventControllerKey()
        keyCtrl.connect("key-pressed", (_ctrl: any, keyval: number) => onKeyNav(self, keyval))
        self.add_controller(keyCtrl)
      }}
    >
      {/* Search field */}
      <box class="LauncherSearch" spacing={10}>
        <label class="LauncherSearchIcon" label="/" />
        <entry
          class="LauncherEntry"
          hexpand
          placeholder_text="Search applications..."
          onChanged={onQueryChanged}
          onRealize={(self: any) => {
            // Auto focus on realize
            self.grab_focus()
          }}
        />
      </box>

      {/* Results */}
      <box
        class="LauncherResults"
        orientation={Gtk.Orientation.VERTICAL}
        spacing={0}
        visible={hasResults}
      >
        {results((list: AppEntry[]) =>
          list.map((app, i) => (
            <button
              class={selectedIndex((sel) =>
                i === sel ? "LauncherItem LauncherItemSelected" : "LauncherItem",
              )}
              onClicked={() => onActivate(app)}
            >
              <box spacing={12}>
                {app.icon ? (
                  <image class="LauncherItemIcon" iconName={app.icon} pixelSize={24} />
                ) : (
                  <label class="LauncherItemIconFallback" label="●" widthRequest={24} />
                )}
                <box orientation={Gtk.Orientation.VERTICAL} spacing={2} hexpand>
                  <label class="LauncherItemName" label={app.name} halign={Gtk.Align.START} xalign={0} />
                  {app.description ? (
                    <label
                      class="LauncherItemDesc"
                      label={app.description}
                      halign={Gtk.Align.START}
                      xalign={0}
                      ellipsize={3}
                    />
                  ) : null}
                </box>
              </box>
            </button>
          )),
        )}
      </box>
    </box>
  )
}
