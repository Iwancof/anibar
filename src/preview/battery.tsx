import { Gtk } from "ags/gtk4"

import { createBatteryModule } from "../modules/battery/service.ts"
import BatteryWidget from "../modules/battery/Widget.tsx"
import {
  batteryPreviewStates,
  createMockBatterySource,
} from "../modules/battery/mocks.ts"
import PreviewWindow from "./PreviewWindow.tsx"
import { startPreviewApp } from "./startPreview.ts"

startPreviewApp({
  instanceName: "ags-preview-battery",
  main() {
    const modules = batteryPreviewStates.map((state) =>
      createBatteryModule(createMockBatterySource(state)),
    )

    return (
      <PreviewWindow
        title="Battery widget preview"
        subtitle="Three representative states for the battery module."
        width={720}
        height={640}
      >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={12}>
          {modules.map((module) => (
            <BatteryWidget model={module.viewModel} />
          ))}
        </box>
      </PreviewWindow>
    )
  },
})
