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
} as const

export type IconName = keyof typeof ICONS

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
