import { createState } from "gnim"

import { createBatteryModule } from "../modules/battery/service.ts"
import { batteryPreviewStates, createMockBatterySource } from "../modules/battery/mocks.ts"
import { createMockNetworkSource, networkPreviewStates } from "../modules/network/mocks.ts"
import { createNetworkModule } from "../modules/network/service.ts"
import {
  createMockServiceHealthSource,
  serviceHealthPreviewStates,
} from "../modules/service-health/mocks.ts"
import { createServiceHealthModule } from "../modules/service-health/service.ts"
import type { DashboardModules } from "../modules/index.ts"
import PreviewWindow from "./PreviewWindow.tsx"
import { startPreviewApp } from "./startPreview.ts"
import DashboardView from "../surfaces/dashboard/DashboardView.tsx"

startPreviewApp({
  instanceName: "ags-preview-dashboard",
  main() {
    const [clock] = createState("Tue 21:14:33")

    const modules: DashboardModules = {
      battery: createBatteryModule(createMockBatterySource(batteryPreviewStates[1])),
      network: createNetworkModule(createMockNetworkSource(networkPreviewStates[0])),
      serviceHealth: createServiceHealthModule(
        createMockServiceHealthSource(serviceHealthPreviewStates[1]),
      ),
    }

    return (
      <PreviewWindow
        title="Overlay dashboard preview"
        subtitle="This uses the real dashboard view with mock adapters instead of live system data."
        width={1100}
        height={760}
      >
        <box class="DashboardPreviewFrame">
          <DashboardView modules={modules} clock={clock} hostname="preview-host" />
        </box>
      </PreviewWindow>
    )
  },
})
