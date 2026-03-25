import { Gtk } from "ags/gtk4"

import ServiceHealthWidget from "../modules/service-health/Widget.tsx"
import {
  createMockServiceHealthSource,
  serviceHealthPreviewStates,
} from "../modules/service-health/mocks.ts"
import { createServiceHealthModule } from "../modules/service-health/service.ts"
import PreviewWindow from "./PreviewWindow.tsx"
import { startPreviewApp } from "./startPreview.ts"

startPreviewApp({
  instanceName: "ags-preview-service-health",
  main() {
    const modules = serviceHealthPreviewStates.map((state) =>
      createServiceHealthModule(createMockServiceHealthSource(state)),
    )

    return (
      <PreviewWindow
        title="Service health preview"
        subtitle="Healthy, failed, and degraded system service states."
        width={760}
        height={760}
      >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={12}>
          {modules.map((module) => (
            <ServiceHealthWidget model={module.viewModel} />
          ))}
        </box>
      </PreviewWindow>
    )
  },
})
