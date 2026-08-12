import { Astal, Gdk, Gtk } from "ags/gtk4"

import { onCleanup, type Accessor } from "gnim"

import type { WeatherSnapshot } from "../../runtime/weather-source.ts"
import { COLORS } from "../../shared/theme-tokens.ts"
import { closeWeatherPopup } from "../../app/controllers.ts"
import PopupShell from "../../shared/ui/PopupShell.tsx"
import PanelHeader from "../../shared/ui/PanelHeader.tsx"
import SectionHeader from "../../shared/ui/SectionHeader.tsx"
import StatTile from "../../shared/ui/StatTile.tsx"
import Icon from "../../shared/ui/Icon.tsx"
import { ICONS, weatherIcon, weatherLabel } from "../../shared/ui/icons.ts"

export interface WeatherPopupProps {
  gdkmonitor: Gdk.Monitor
  monitor: string
  snapshot: Accessor<WeatherSnapshot | null>
}

const HOUR_SLOTS = 8

// ── 降水確率の棒グラフ (0-100% 固定スケール、Cairo一括描画) ──
const CHART_H = 34
const C_RAIN = COLORS.rgb["hud-blue"]
const C_DIM = COLORS.rgb["chart-dim"]

function RainChart(props: { snapshot: Accessor<WeatherSnapshot | null> }) {
  let area: Gtk.DrawingArea | null = null
  onCleanup(props.snapshot.subscribe(() => area?.queue_draw()))

  return (
    <Gtk.DrawingArea
      cssClasses={["WxRainChart"]}
      heightRequest={CHART_H}
      hexpand
      onRealize={(self: Gtk.DrawingArea) => {
        area = self
        self.set_draw_func((_a: any, cr: any, w: number, h: number) => {
          const v = props.snapshot()
          const slotW = w / HOUR_SLOTS
          for (let i = 0; i < HOUR_SLOTS; i++) {
            const p = v?.hours[i]?.precipProb ?? 0
            const x = i * slotW + slotW * 0.25
            const bw = slotW * 0.5
            // 空スロットも薄いベースラインで見せる (固定スロット感)
            cr.setSourceRGBA(C_DIM[0], C_DIM[1], C_DIM[2], 0.3)
            cr.rectangle(x, h - 2, bw, 2)
            cr.fill()
            if (p <= 0) continue
            const bh = Math.max(2, (p / 100) * (h - 4))
            cr.setSourceRGBA(C_RAIN[0], C_RAIN[1], C_RAIN[2], 0.35 + 0.55 * (p / 100))
            cr.rectangle(x, h - bh, bw, bh)
            cr.fill()
          }
        })
      }}
    />
  )
}

function heroTone(code: number, isDay: boolean): string {
  if (code === 0 || code <= 2) return isDay ? "WxHeroSun" : "WxHeroNight"
  if (code === 3 || code === 45 || code === 48) return "WxHeroCloud"
  if (code >= 95) return "WxHeroStorm"
  if (code >= 71 && code <= 86 && code !== 80 && code !== 81 && code !== 82) return "WxHeroSnow"
  return "WxHeroRain"
}

function fmtTemp(value: number | undefined): string {
  return value == null ? "—" : `${Math.round(value)}°`
}

export default function WeatherPopup(props: WeatherPopupProps) {
  const s = props.snapshot

  return (
    <PopupShell
      name={`weather-popup:${props.monitor}`}
      windowClass="WxPopup"
      gdkmonitor={props.gdkmonitor}
      exclusivity={Astal.Exclusivity.NORMAL}
      keymode={Astal.Keymode.ON_DEMAND}
      layer={Astal.Layer.TOP}
      contentHalign={Gtk.Align.END}
      contentValign={Gtk.Align.START}
      onClose={closeWeatherPopup}
    >
      <box class="WxPopupPanel UiPanel" orientation={Gtk.Orientation.VERTICAL}>
        <PanelHeader
          title="WX::LOCAL"
          meta={s((v) => (v?.place ? `${ICONS.mapMarker} ${v.place}` : "GEO::SCAN"))}
        />

        <box class="WxBody" orientation={Gtk.Orientation.VERTICAL} spacing={12}>
          {/* Hero: 現況 */}
          <box class="WxHero" spacing={16}>
            <Icon
              class={s((v) => `WxHeroIcon ${v ? heroTone(v.code, v.isDay) : "WxHeroCloud"}`)}
              icon={s((v) => (v ? weatherIcon(v.code, v.isDay) : ICONS.wxCloudy))}
              valign={Gtk.Align.CENTER}
            />
            <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
              <box spacing={4}>
                <label
                  class={s((v) => `WxHeroTemp WxAtomic ${v ? heroTone(v.code, v.isDay) : ""}`)}
                  label={s((v) => (v ? `${v.temp.toFixed(1)}` : "—"))}
                />
                <label class="WxHeroUnit WxAtomic" label="°C" valign={Gtk.Align.END} />
              </box>
              <label
                class="WxCond"
                label={s((v) => (v ? weatherLabel(v.code) : "WX::—"))}
                halign={Gtk.Align.START}
              />
            </box>
            <box hexpand />
            <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER} halign={Gtk.Align.END}>
              <label
                class="WxFeels"
                label={s((v) => (v ? `FEELS::${v.feels.toFixed(1)}°` : "FEELS::—"))}
                halign={Gtk.Align.END}
              />
              <label
                class="WxFeels"
                label={s((v) => (v ? `RAIN::${v.hours[0]?.precipProb ?? 0}%` : "RAIN::—"))}
                halign={Gtk.Align.END}
              />
            </box>
          </box>

          {/* Stat tiles */}
          <box spacing={8}>
            <StatTile label="HUMIDITY" value={s((v) => (v ? `${v.humidity}` : "—"))} unit="%" tone="info" />
            <StatTile label="WIND" value={s((v) => (v ? `${Math.round(v.wind)}` : "—"))} unit="km/h" tone="normal" />
            <StatTile
              label="RAIN MAX 8H"
              value={s((v) => (v ? `${Math.max(0, ...v.hours.map((h) => h.precipProb))}` : "—"))}
              unit="%"
              tone={s((v) => {
                const p = v ? Math.max(0, ...v.hours.map((h) => h.precipProb)) : 0
                return p >= 50 ? "warn" : "info"
              })}
            />
          </box>

          {/* 時間別 */}
          <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
            <SectionHeader label="NEXT::8H" meta={s((v) => {
              if (!v) return ""
              const d = new Date(v.updatedAt * 1000)
              const hh = `${d.getHours()}`.padStart(2, "0")
              const mm = `${d.getMinutes()}`.padStart(2, "0")
              return `UPD::${hh}:${mm}`
            })} />
            <box class="WxHourStrip" spacing={0} homogeneous>
              {Array.from({ length: HOUR_SLOTS }).map((_, i) => (
                <box class="WxHourCol" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                  <label class="WxHourTime" label={s((v) => v?.hours[i]?.hour ?? "—")} />
                  <Icon
                    class="WxHourIcon"
                    icon={s((v) => {
                      const h = v?.hours[i]
                      return h ? weatherIcon(h.code, h.isDay) : ICONS.wxCloudy
                    })}
                    halign={Gtk.Align.CENTER}
                  />
                  <label class="WxHourTemp WxAtomic" label={s((v) => fmtTemp(v?.hours[i]?.temp))} />
                  <label
                    class="WxHourRain"
                    label={s((v) => {
                      const p = v?.hours[i]?.precipProb ?? 0
                      return p > 0 ? `${p}%` : ""
                    })}
                  />
                </box>
              ))}
            </box>
            <RainChart snapshot={s} />
          </box>

          {/* 明日 */}
          <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
            <SectionHeader label="DAY::TOMORROW" />
            <box class="WxTomorrowRow" spacing={12}>
              <Icon
                class="WxTomorrowIcon"
                icon={s((v) => (v ? weatherIcon(v.tomorrow.code, true) : ICONS.wxCloudy))}
                valign={Gtk.Align.CENTER}
              />
              <label class="WxTomorrowCond" label={s((v) => (v ? weatherLabel(v.tomorrow.code) : "—"))} />
              <box hexpand />
              <label
                class="WxTomorrowTemp WxAtomic"
                label={s((v) => (v ? `${fmtTemp(v.tomorrow.tMax)} / ${fmtTemp(v.tomorrow.tMin)}` : "— / —"))}
              />
              <Icon class="WxTomorrowRainIcon" icon={ICONS.umbrella} valign={Gtk.Align.CENTER} />
              <label class="WxTomorrowRain WxAtomic" label={s((v) => (v ? `${v.tomorrow.precipProb}%` : "—"))} />
            </box>
          </box>

          {/* Footer: 測位の実データ */}
          <label
            class="WxFooter"
            halign={Gtk.Align.START}
            label={s((v) => {
              if (!v) return "GEO::SCAN · SRC::—"
              const src = v.locSource === "wifi" ? "BEACONDB" : "IP-FALLBACK"
              return `POS::${v.lat.toFixed(3)},${v.lng.toFixed(3)} ±${v.accuracyKm}KM · SRC::${src}`
            })}
          />
        </box>
      </box>
    </PopupShell>
  )
}
