export const ICONS = {
  play: "󰐊",
  pause: "󰏤",
  previous: "󰒮",
  next: "󰒭",
  close: "󰅖",
  check: "󰄬",
  chevronLeft: "󰁍",
  chevronRight: "󰁔",
  appFallback: "󰘔",
  bell: "󰂚",
  bellOff: "󰂛",
  volumeHigh: "󰕾",
  volumeMedium: "󰖀",
  volumeLow: "󰖁",
  volumeMuted: "󰝟",
  wifi: "󰤨",
  wifi4: "󰤨",
  wifi3: "󰤥",
  wifi2: "󰤢",
  wifi1: "󰤟",
  wifiOff: "󰤯",
  wifiDisconnected: "󰤭",
  wired: "󰈁",
  bluetooth: "󰂯",
  btOff: "󰂲",
  btConnected: "󰂱",
  btAudio: "󰋋",
  btMouse: "󰍽",
  btKeyboard: "󰌌",
  btPhone: "󰏲",
  batteryCharging: "󰚥",
  batteryPercent: "󰥉",
  wxSunny: "󰖙",
  wxNight: "󰖔",
  wxPartly: "󰖕",
  wxNightPartly: "󰼱",
  wxCloudy: "󰖐",
  wxFog: "󰖑",
  wxRain: "󰖗",
  wxPouring: "󰖖",
  wxSnow: "󰖘",
  wxSnowHeavy: "󰼶",
  wxSleet: "󰙿",
  wxLightning: "󰖓",
  wxLightningRain: "󰙾",
  wxHail: "󰖒",
  wxWindy: "󰖝",
  mapMarker: "󰍎",
  arrowDown: "󰁅",
  arrowUp: "󰁝",
  mic: "󰍬",
  micOff: "󰍭",
  calendar: "󰃭",
  calendarToday: "󰃰",
  humidity: "󰖎",
  umbrella: "󰕶",
  thermometer: "󰔏",
} as const

export type IconName = keyof typeof ICONS

// WMO weather interpretation codes (Open-Meteo) → グリフ / HUD語彙
export function weatherIcon(code: number, isDay: boolean): string {
  if (code === 0) return isDay ? ICONS.wxSunny : ICONS.wxNight
  if (code <= 2) return isDay ? ICONS.wxPartly : ICONS.wxNightPartly
  if (code === 3) return ICONS.wxCloudy
  if (code === 45 || code === 48) return ICONS.wxFog
  if (code >= 51 && code <= 57) return ICONS.wxRain
  if (code === 65 || code === 82) return ICONS.wxPouring
  if (code === 66 || code === 67) return ICONS.wxSleet
  if (code >= 61 && code <= 64) return ICONS.wxRain
  if (code === 75 || code === 77) return ICONS.wxSnowHeavy
  if (code >= 71 && code <= 79) return ICONS.wxSnow
  if (code >= 80 && code <= 81) return ICONS.wxRain
  if (code === 85 || code === 86) return ICONS.wxSnow
  if (code === 95) return ICONS.wxLightning
  if (code >= 96) return ICONS.wxLightningRain
  return ICONS.wxCloudy
}

export function weatherLabel(code: number): string {
  if (code === 0) return "CLEAR"
  if (code <= 2) return "PT CLOUDY"
  if (code === 3) return "OVERCAST"
  if (code === 45 || code === 48) return "FOG"
  if (code >= 51 && code <= 57) return "DRIZZLE"
  if (code === 65 || code === 82) return "POURING"
  if (code === 66 || code === 67) return "SLEET"
  if (code >= 61 && code <= 64) return "RAIN"
  if (code === 75 || code === 77) return "HEAVY SNOW"
  if (code >= 71 && code <= 79) return "SNOW"
  if (code >= 80 && code <= 81) return "SHOWERS"
  if (code === 85 || code === 86) return "SNOW SHWR"
  if (code >= 95) return "T-STORM"
  return "—"
}

export function bluetoothDeviceIcon(icon: string | null | undefined): string {
  switch (icon) {
    case "audio-headset":
    case "audio-headphones":
      return ICONS.btAudio
    case "input-mouse":
      return ICONS.btMouse
    case "input-keyboard":
      return ICONS.btKeyboard
    case "phone":
      return ICONS.btPhone
    default:
      return ICONS.bluetooth
  }
}
