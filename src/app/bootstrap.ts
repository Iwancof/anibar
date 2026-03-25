import GLib from "gi://GLib?version=2.0"

import app from "ags/gtk4/app"

import style from "../../style.scss"
import { createRuntimeAppModules, barIndicators } from "../modules/index.ts"
import { createClock } from "../shared/runtime/clock.ts"
import Bar from "../surfaces/bar/Bar.tsx"
import DashboardWindow from "../surfaces/dashboard/DashboardWindow.tsx"
import BatteryPopup from "../surfaces/popups/BatteryPopup.tsx"
import { toggleDashboardVisibility } from "./dashboard-controller.ts"
import { toggleBatteryPopup } from "./popup-controller.ts"
import { handleAppRequest } from "./request-handler.ts"

export function startMainApp() {
  const modules = createRuntimeAppModules()
  const clock = createClock()
  const hostname = GLib.get_host_name() ?? "unknown-host"
  const indicators = barIndicators(modules)

  app.start({
    css: style,
    requestHandler(args, respond) {
      respond(handleAppRequest(args))
    },
    main() {
      app.get_monitors().forEach((gdkmonitor, monitorIndex) => {
        Bar({
          gdkmonitor,
          monitorIndex,
          clock,
          indicators,
          batterySnapshot: modules.battery.snapshot,
          onToggleDashboard: toggleDashboardVisibility,
          onToggleBatteryPopup: toggleBatteryPopup,
        })

        BatteryPopup({
          gdkmonitor,
          monitorIndex,
          snapshot: modules.battery.snapshot,
        })

        DashboardWindow({
          gdkmonitor,
          monitorIndex,
          modules,
          clock,
          hostname,
          onClose: () => {
            void toggleDashboardVisibility()
          },
        })
      })
    },
  })
}
