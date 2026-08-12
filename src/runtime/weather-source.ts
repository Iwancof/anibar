import GLib from "gi://GLib?version=2.0"
import { createState, type Accessor } from "gnim"
import { execAsync } from "ags/process"

// 位置は周辺WiFiのBSSID→BeaconDB (MLS後継、キー不要)。APが未収録ならIPフォールバック。
// 天気はOpen-Meteo、地名はNominatim (移動時のみ照会)。全てキー不要の無料API。
const WEATHER_POLL_MS = 15 * 60_000
const RETRY_MS = 2 * 60_000
const GEOCODE_MOVE_KM = 5
const CURL_TIMEOUT = "10"

export interface WeatherHour {
  hour: string // "06"
  temp: number
  code: number
  precipProb: number
  isDay: boolean
}

export interface WeatherDay {
  code: number
  tMax: number
  tMin: number
  precipProb: number
}

export interface WeatherSnapshot {
  place: string | null
  lat: number
  lng: number
  accuracyKm: number
  locSource: "wifi" | "ip"
  temp: number
  feels: number
  humidity: number
  wind: number
  code: number
  isDay: boolean
  hours: WeatherHour[]
  tomorrow: WeatherDay
  updatedAt: number // epoch sec
}

interface GeoResult {
  lat: number
  lng: number
  accuracyKm: number
  locSource: "wifi" | "ip"
}

async function curlJson(args: string[]): Promise<unknown> {
  const raw = await execAsync(["curl", "-sS", "-m", CURL_TIMEOUT, ...args])
  return JSON.parse(raw)
}

async function scanAccessPoints(): Promise<Array<{ macAddress: string; signalStrength: number }>> {
  // --rescan no: NetworkManager のキャッシュ済みスキャン結果を使う (電波を掴み直さない)
  const raw = await execAsync(["nmcli", "--rescan", "no", "-t", "-f", "BSSID,SIGNAL", "device", "wifi", "list"])
  const aps: Array<{ macAddress: string; signalStrength: number }> = []
  for (const line of raw.split("\n")) {
    const m = line.match(/^((?:[0-9A-Fa-f]{2}\\:){5}[0-9A-Fa-f]{2}):(\d+)/)
    if (!m) continue
    aps.push({
      macAddress: m[1].replace(/\\:/g, ":"),
      // nmcli SIGNAL は 0-100 → dBm 近似 (beacondb は dBm 前提)
      signalStrength: Math.round(Number(m[2]) / 2 - 100),
    })
  }
  return aps
}

async function geolocate(): Promise<GeoResult> {
  const aps = await scanAccessPoints().catch(() => [])
  const body = JSON.stringify({ wifiAccessPoints: aps })
  const res = (await curlJson([
    "-H", "Content-Type: application/json",
    "-d", body,
    "https://api.beacondb.net/v1/geolocate",
  ])) as { location: { lat: number; lng: number }; accuracy: number; fallback?: string }
  return {
    lat: res.location.lat,
    lng: res.location.lng,
    accuracyKm: Math.round(res.accuracy / 1000),
    locSource: res.fallback === "ipf" ? "ip" : "wifi",
  }
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * 111
  const dLng = (lng2 - lng1) * 111 * Math.cos((lat1 * Math.PI) / 180)
  return Math.sqrt(dLat * dLat + dLng * dLng)
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const res = (await curlJson([
    "-H", "User-Agent: ags-weather-widget/1.0 (personal desktop)",
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&zoom=10&accept-language=ja`,
  ])) as { name?: string; address?: Record<string, string> }
  return res.name || res.address?.city || res.address?.town || res.address?.village || null
}

interface OpenMeteoResponse {
  current: {
    temperature_2m: number
    relative_humidity_2m: number
    apparent_temperature: number
    weather_code: number
    wind_speed_10m: number
    is_day: number
  }
  hourly: {
    time: string[]
    temperature_2m: number[]
    weather_code: number[]
    precipitation_probability: number[]
    is_day: number[]
  }
  daily: {
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_probability_max: number[]
  }
}

async function fetchForecast(lat: number, lng: number): Promise<OpenMeteoResponse> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day" +
    "&hourly=temperature_2m,weather_code,precipitation_probability,is_day" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
    "&timezone=auto&forecast_days=2&forecast_hours=9"
  return (await curlJson([url])) as OpenMeteoResponse
}

export interface WeatherSource {
  snapshot: Accessor<WeatherSnapshot | null>
}

export function createWeatherSource(): WeatherSource {
  const [snapshot, setSnapshot] = createState<WeatherSnapshot | null>(null)
  let lastGeocode: { lat: number; lng: number; place: string | null } | null = null

  function schedule(ms: number): void {
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
      void refresh()
      return GLib.SOURCE_REMOVE
    })
  }

  async function refresh(): Promise<void> {
    try {
      const geo = await geolocate()

      if (!lastGeocode || distanceKm(geo.lat, geo.lng, lastGeocode.lat, lastGeocode.lng) > GEOCODE_MOVE_KM) {
        const place = await reverseGeocode(geo.lat, geo.lng).catch(() => lastGeocode?.place ?? null)
        lastGeocode = { lat: geo.lat, lng: geo.lng, place }
      }

      const wx = await fetchForecast(geo.lat, geo.lng)
      const hours: WeatherHour[] = wx.hourly.time.slice(1, 9).map((t, i) => ({
        hour: t.slice(11, 13),
        temp: wx.hourly.temperature_2m[i + 1],
        code: wx.hourly.weather_code[i + 1],
        precipProb: wx.hourly.precipitation_probability[i + 1] ?? 0,
        isDay: wx.hourly.is_day[i + 1] === 1,
      }))

      setSnapshot({
        place: lastGeocode.place,
        lat: geo.lat,
        lng: geo.lng,
        accuracyKm: geo.accuracyKm,
        locSource: geo.locSource,
        temp: wx.current.temperature_2m,
        feels: wx.current.apparent_temperature,
        humidity: wx.current.relative_humidity_2m,
        wind: wx.current.wind_speed_10m,
        code: wx.current.weather_code,
        isDay: wx.current.is_day === 1,
        hours,
        tomorrow: {
          code: wx.daily.weather_code[1],
          tMax: wx.daily.temperature_2m_max[1],
          tMin: wx.daily.temperature_2m_min[1],
          precipProb: wx.daily.precipitation_probability_max[1] ?? 0,
        },
        updatedAt: Math.floor(Date.now() / 1000),
      })
      schedule(WEATHER_POLL_MS)
    } catch (e) {
      console.warn(`[weather] refresh failed: ${e}`)
      schedule(RETRY_MS)
    }
  }

  void refresh()
  return { snapshot }
}
