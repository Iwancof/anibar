import GLib from "gi://GLib?version=2.0"

import app from "ags/gtk4/app"

import style from "../../style.scss"
import { createRuntimeAppModules, barIndicators } from "../modules/index.ts"
import { createSystemStatsSource } from "../runtime/system-stats-source.ts"
import { createWorkspaceSource } from "../runtime/workspace-source.ts"
import { createImeSource } from "../runtime/ime-source.ts"
import { createClock } from "../shared/runtime/clock.ts"
import { createPwsaveSource } from "../runtime/pwsave-source.ts"
import { createLidActionSource } from "../runtime/lid-action-source.ts"
import { createSpectrumSource } from "../runtime/spectrum-source.ts"
import { createPlayerSource } from "../runtime/player-source.ts"
import { createNotificationSource } from "../runtime/notification-source.ts"
import { createWifiSource } from "../runtime/wifi-source.ts"
import { createBandwidthSource } from "../runtime/bandwidth-source.ts"
import { createQualitySource } from "../runtime/quality-source.ts"
import { createDnsSource } from "../runtime/dns-source.ts"
import { createLatencySource } from "../runtime/latency-source.ts"
import { createSessionSource } from "../runtime/session-source.ts"
import { createConnectionsSource } from "../runtime/connections-source.ts"
import { createFlowsSource, createLogSource } from "../runtime/netmon-source.ts"
import Bar from "../surfaces/bar/Bar.tsx"
import WorkspaceWindow from "../surfaces/workspace/WorkspaceWindow.tsx"
import BatteryPopup from "../surfaces/popups/BatteryPopup.tsx"
import NetworkPanel from "../surfaces/network/NetworkPanel.tsx"
import LauncherWindow from "../surfaces/launcher/LauncherWindow.tsx"
import NotificationPopup from "../surfaces/notifications/NotificationPopup.tsx"
import NotificationCenter from "../surfaces/notifications/NotificationCenter.tsx"
import SwipeDashboard from "../surfaces/dashboard/SwipeDashboard.tsx"
import { toggleNotifCenter } from "./notification-controller.ts"
import { toggleDashboardVisibility } from "./dashboard-controller.ts"
import { toggleSwipeDashboard } from "./swipe-dashboard-controller.ts"
import { toggleBatteryPopup } from "./popup-controller.ts"
import { toggleNetworkPopup } from "./network-controller.ts"
import { handleAppRequest } from "./request-handler.ts"

export function startMainApp() {
  const modules = createRuntimeAppModules()
  const systemStats = createSystemStatsSource()
  const workspaceSource = createWorkspaceSource()
  const imeSource = createImeSource()
  const clock = createClock()
  const pwsaveSource = createPwsaveSource()
  const lidActionSource = createLidActionSource()
  const notificationSource = createNotificationSource()
  const wifiSource = createWifiSource()
  const spectrumSource = createSpectrumSource()
  const playerSource = createPlayerSource()
  const bandwidthSource = createBandwidthSource()
  const qualitySource = createQualitySource()
  const dnsSource = createDnsSource()
  const latencySource = createLatencySource()
  const sessionSource = createSessionSource()
  const connectionsSource = createConnectionsSource()
  const flowsSource = createFlowsSource()
  const logSource = createLogSource()
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
          spectrumBars: spectrumSource.bars,
          player: playerSource,
          networkSnapshot: modules.network.snapshot,
          wifiSnapshot: wifiSource.snapshot,
          notifUnreadCount: notificationSource.unreadCount,
          batterySnapshot: modules.battery.snapshot,
          imeSnapshot: imeSource.snapshot,
          workspaceSnapshot: workspaceSource.snapshot,
          onToggleDashboard: toggleDashboardVisibility,
          onToggleBatteryPopup: toggleBatteryPopup,
          onToggleNotifCenter: () => {
            notificationSource.markAllRead()
            toggleNotifCenter()
          },
          onToggleNetworkPopup: toggleNetworkPopup,
        })

        NetworkPanel({
          gdkmonitor,
          monitorIndex,
          clock,
          networkSnapshot: modules.network.snapshot,
          wifiSnapshot: wifiSource.snapshot,
          bandwidthSnapshot: bandwidthSource.snapshot,
          qualitySnapshot: qualitySource.snapshot,
          dnsSnapshot: dnsSource.snapshot,
          latencySnapshot: latencySource.snapshot,
          sessionSnapshot: sessionSource.snapshot,
          connectionsSnapshot: connectionsSource.snapshot,
          flows: flowsSource.flows,
          logs: logSource.logs,
          onConnect: (ssid, password) => { wifiSource.connect(ssid, password) },
          onRescan: () => { wifiSource.rescan() },
        })

        BatteryPopup({
          gdkmonitor,
          monitorIndex,
          snapshot: modules.battery.snapshot,
          systemStats: systemStats.snapshot,
          pwsaveStatus: pwsaveSource.status,
          lidAction: lidActionSource.action,
          onToggleMeasure: pwsaveSource.toggleMeasure,
          onToggleAll: pwsaveSource.toggleAll,
          onSetLidAction: lidActionSource.setAction,
        })

        LauncherWindow({
          gdkmonitor,
          monitorIndex,
        })

        NotificationPopup({
          gdkmonitor,
          monitorIndex,
          notifications: notificationSource,
        })

        NotificationCenter({
          gdkmonitor,
          monitorIndex,
          notifications: notificationSource,
        })

        SwipeDashboard({
          gdkmonitor,
          monitorIndex,
          batterySnapshot: modules.battery.snapshot,
          notifications: notificationSource,
          player: playerSource,
          onClose: () => {
            toggleSwipeDashboard()
          },
        })

        WorkspaceWindow({
          gdkmonitor,
          monitorIndex,
          snapshot: workspaceSource.snapshot,
          onClose: () => {
            void toggleDashboardVisibility()
          },
        })
      })
    },
  })
}
