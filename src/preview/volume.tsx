import { Gtk } from "ags/gtk4"

import { createVolumeModule } from "../modules/volume/service.ts"
import VolumeWidget from "../modules/volume/Widget.tsx"
import {
  volumePreviewStates,
  createMockVolumeSource,
} from "../modules/volume/mocks.ts"
import PreviewWindow from "./PreviewWindow.tsx"
import { startPreviewApp } from "./startPreview.ts"

startPreviewApp({
  instanceName: "ags-preview-volume",
  main() {
    const modules = volumePreviewStates.map((state) =>
      createVolumeModule(createMockVolumeSource(state)),
    )

    return (
      <PreviewWindow
        title="Volume widget preview"
        subtitle="Three representative states for the volume module."
        width={720}
        height={640}
      >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={12}>
          {modules.map((module) => (
            <VolumeWidget model={module.viewModel} />
          ))}
        </box>
      </PreviewWindow>
    )
  },
})
