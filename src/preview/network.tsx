import { Gtk } from "ags/gtk4"

import { createMockNetworkSource, networkPreviewStates } from "../modules/network/mocks.ts"
import { createNetworkModule } from "../modules/network/service.ts"
import NetworkWidget from "../modules/network/Widget.tsx"
import PreviewWindow from "./PreviewWindow.tsx"
import { startPreviewApp } from "./startPreview.ts"

startPreviewApp({
  instanceName: "ags-preview-network",
  main() {
    const modules = networkPreviewStates.map((state) =>
      createNetworkModule(createMockNetworkSource(state)),
    )

    return (
      <PreviewWindow
        title="Network widget preview"
        subtitle="Connected, tailnet degraded, and offline states for the network module."
        width={720}
        height={640}
      >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={12}>
          {modules.map((module) => (
            <NetworkWidget model={module.viewModel} />
          ))}
        </box>
      </PreviewWindow>
    )
  },
})
