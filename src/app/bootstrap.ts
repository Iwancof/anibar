import GLib from "gi://GLib?version=2.0"

import app from "ags/gtk4/app"
import { Gdk, Gtk } from "ags/gtk4"

import style from "../../style.scss"
import { createBluetoothModule } from "../modules/bluetooth/service.ts"
import { createRuntimeAppModules } from "../modules/index.ts"
import { createSystemStatsSource } from "../runtime/system-stats-source.ts"
import { createWorkspaceSource } from "../runtime/workspace-source.ts"
import { createImeSource } from "../runtime/ime-source.ts"
import { createBarClock, createClock } from "../shared/runtime/clock.ts"
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
import { createBluetoothSource } from "../runtime/bluetooth-source.ts"
import { createWeatherSource } from "../runtime/weather-source.ts"
import { createGcalSource } from "../runtime/gcal-source.ts"
import Bar from "../surfaces/bar/Bar.tsx"
import WorkspaceWindow from "../surfaces/workspace/WorkspaceWindow.tsx"
import WsGotoWindow from "../surfaces/workspace/WsGotoWindow.tsx"
import BatteryPopup from "../surfaces/popups/BatteryPopup.tsx"
import WeatherPopup from "../surfaces/popups/WeatherPopup.tsx"
import CalendarPopup, { resetCalendarView } from "../surfaces/popups/CalendarPopup.tsx"
import BluetoothPopup from "../surfaces/popups/BluetoothPopup.tsx"
import NetworkPanel from "../surfaces/network/NetworkPanel.tsx"
import LauncherWindow from "../surfaces/launcher/LauncherWindow.tsx"
import NotificationPopup from "../surfaces/notifications/NotificationPopup.tsx"
import NotificationCenter from "../surfaces/notifications/NotificationCenter.tsx"
import SwipeDashboard from "../surfaces/dashboard/SwipeDashboard.tsx"
import DashboardMode from "../surfaces/dashboard-mode/DashboardMode.tsx"
import {
  batteryPopupVisible,
  closeSwipeDashboard,
  dashboardModeVisible,
  networkPopupVisible,
  toggleBatteryPopup,
  toggleBluetoothPopup,
  toggleCalendarPopup,
  toggleNetworkPopup,
  toggleNotifCenter,
  toggleWeatherPopup,
  toggleWorkspaceVisibility,
} from "./controllers.ts"
import { orAccessors } from "../runtime/visibility-gate.ts"
import { handleAppRequest } from "./request-handler.ts"
import { createMonitorRegistry, getMonitorsListModel, setActiveRegistry } from "./monitor-registry.ts"

const MONITOR_SAFETY_POLL_MS = 5000

export function startMainApp() {
  const modules = createRuntimeAppModules()
  const bluetoothModule = createBluetoothModule(createBluetoothSource())

  // fork を伴う重いポーラーは、それを表示するパネルが開いている間だけ回す
  const networkPanelActive = orAccessors(networkPopupVisible, dashboardModeVisible)
  const statsActive = orAccessors(batteryPopupVisible, dashboardModeVisible)

  const systemStats = createSystemStatsSource(statsActive)
  const workspaceSource = createWorkspaceSource()
  const imeSource = createImeSource()
  const clock = createClock()
  const barClock = createBarClock()
  const pwsaveSource = createPwsaveSource()
  const lidActionSource = createLidActionSource()
  const notificationSource = createNotificationSource()
  const wifiSource = createWifiSource()
  const spectrumSource = createSpectrumSource()
  const playerSource = createPlayerSource()
  const bandwidthSource = createBandwidthSource()
  const qualitySource = createQualitySource(networkPanelActive)
  const dnsSource = createDnsSource(networkPanelActive)
  const latencySource = createLatencySource(networkPanelActive)
  const sessionSource = createSessionSource(networkPanelActive)
  const connectionsSource = createConnectionsSource(networkPanelActive)
  const flowsSource = createFlowsSource(networkPanelActive)
  const logSource = createLogSource()
  const weatherSource = createWeatherSource()
  const gcalSource = createGcalSource()

  function createMonitorWindows(
    gdkmonitor: Gdk.Monitor,
    monitor: string,
    monitorIndex: number,
  ): Gtk.Window[] {
    return [
      Bar({
        gdkmonitor,
        monitor,
        clock: barClock,
        volumeSnapshot: modules.volume.snapshot,
        spectrumBars: spectrumSource.bars,
        player: playerSource,
        networkSnapshot: modules.network.snapshot,
        wifiSnapshot: wifiSource.snapshot,
        bluetoothSnapshot: bluetoothModule.snapshot,
        notifUnreadCount: notificationSource.unreadCount,
        batterySnapshot: modules.battery.snapshot,
        imeSnapshot: imeSource.snapshot,
        workspaceSnapshot: workspaceSource.snapshot,
        weatherSnapshot: weatherSource.snapshot,
        bandwidthSnapshot: bandwidthSource.snapshot,
        onToggleDashboard: toggleWorkspaceVisibility,
        onToggleCalendarPopup: () => {
          resetCalendarView()
          toggleCalendarPopup()
        },
        onToggleBatteryPopup: toggleBatteryPopup,
        onToggleBluetoothPopup: toggleBluetoothPopup,
        onToggleNotifCenter: () => {
          notificationSource.markAllRead()
          toggleNotifCenter()
        },
        onToggleNetworkPopup: toggleNetworkPopup,
        onToggleWeatherPopup: toggleWeatherPopup,
      }),

      WeatherPopup({
        gdkmonitor,
        monitor,
        snapshot: weatherSource.snapshot,
      }),

      CalendarPopup({
        gdkmonitor,
        monitor,
        gcal: gcalSource.snapshot,
      }),

      NetworkPanel({
        gdkmonitor,
        monitor,
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
      }),

      BatteryPopup({
        gdkmonitor,
        monitor,
        snapshot: modules.battery.snapshot,
        systemStats: systemStats.snapshot,
        pwsaveStatus: pwsaveSource.status,
        lidAction: lidActionSource.action,
        onToggleMeasure: pwsaveSource.toggleMeasure,
        onToggleAll: pwsaveSource.toggleAll,
        onSetLidAction: lidActionSource.setAction,
      }),

      BluetoothPopup({
        gdkmonitor,
        monitor,
        snapshot: bluetoothModule.snapshot,
        onSetPowered: bluetoothModule.setPowered,
        onConnectDevice: bluetoothModule.connectDevice,
        onDisconnectDevice: bluetoothModule.disconnectDevice,
        onStartDiscovery: bluetoothModule.startDiscovery,
        onStopDiscovery: bluetoothModule.stopDiscovery,
      }),

      LauncherWindow({
        gdkmonitor,
        monitor,
      }),

      WsGotoWindow({
        gdkmonitor,
        monitor,
      }),

      NotificationPopup({
        gdkmonitor,
        monitor,
        notifications: notificationSource,
      }),

      NotificationCenter({
        gdkmonitor,
        monitor,
        notifications: notificationSource,
      }),

      SwipeDashboard({
        gdkmonitor,
        monitor,
        batterySnapshot: modules.battery.snapshot,
        notifications: notificationSource,
        player: playerSource,
        pwsaveAllEnabled: pwsaveSource.allEnabled,
        onToggleAllPowerSave: pwsaveSource.toggleAll,
        onClose: () => {
          closeSwipeDashboard()
        },
      }),

      DashboardMode({
        gdkmonitor,
        monitor,
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
        batterySnapshot: modules.battery.snapshot,
        systemStats: systemStats.snapshot,
        pwsaveStatus: pwsaveSource.status,
        lidAction: lidActionSource.action,
        onToggleMeasure: pwsaveSource.toggleMeasure,
        onToggleAll: pwsaveSource.toggleAll,
        onSetLidAction: lidActionSource.setAction,
        player: playerSource,
        spectrumBars: spectrumSource.bars,
      }),

      WorkspaceWindow({
        gdkmonitor,
        monitor,
        snapshot: workspaceSource.snapshot,
        onClose: () => {
          void toggleWorkspaceVisibility()
        },
      }),
    ]
  }

  app.start({
    css: style,
    requestHandler(args, respond) {
      respond(handleAppRequest(args))
    },
    main() {
      const bootT = GLib.get_monotonic_time() / 1000
      console.log(`[bootstrap] ${bootT.toFixed(1)}ms main() start`)

      const reg = createMonitorRegistry((monitor, connector, index) =>
        createMonitorWindows(monitor, connector, index),
      )
      setActiveRegistry(reg)

      const monitorsModel = getMonitorsListModel()
      let reconcilePending = false
      const scheduleReconcile = (source: string) => {
        const t = GLib.get_monotonic_time() / 1000
        if (reconcilePending) {
          console.log(`[bootstrap] ${t.toFixed(1)}ms scheduleReconcile(${source}) — already pending, skip`)
          return
        }
        reconcilePending = true
        console.log(`[bootstrap] ${t.toFixed(1)}ms scheduleReconcile(${source}) → idle`)
        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
          const t2 = GLib.get_monotonic_time() / 1000
          console.log(`[bootstrap] ${t2.toFixed(1)}ms reconcile idle fire (source=${source})`)
          reconcilePending = false
          reg.reconcile()
          return GLib.SOURCE_REMOVE
        })
      }
      const itemsChangedId = monitorsModel.connect(
        "items-changed",
        (_model: unknown, position: number, removed: number, added: number) => {
          const t = GLib.get_monotonic_time() / 1000
          console.log(`[bootstrap] ${t.toFixed(1)}ms items-changed pos=${position} removed=${removed} added=${added}`)
          scheduleReconcile("items-changed")
        },
      )

      const safetyPollId = GLib.timeout_add(
        GLib.PRIORITY_DEFAULT,
        MONITOR_SAFETY_POLL_MS,
        () => {
          scheduleReconcile("safety-poll")
          return GLib.SOURCE_CONTINUE
        },
      )

      app.connect("shutdown", () => {
        const t = GLib.get_monotonic_time() / 1000
        console.log(`[bootstrap] ${t.toFixed(1)}ms shutdown`)
        try {
          monitorsModel.disconnect(itemsChangedId)
        } catch (e) {
          console.warn(`bootstrap: disconnect items-changed failed: ${e}`)
        }
        GLib.source_remove(safetyPollId)
        reg.disposeAll()
        setActiveRegistry(null)
      })

      reg.reconcile()
      const bootT2 = GLib.get_monotonic_time() / 1000
      console.log(`[bootstrap] ${bootT2.toFixed(1)}ms main() initial reconcile done (registry size=${reg.registry.size})`)
    },
  })
}
