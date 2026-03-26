export interface WifiNetwork {
  ssid: string
  signal: number
  security: string
  bssid: string
  inUse: boolean
}

export interface GlobalIpInfo {
  ip: string
  city: string | null
  country: string | null
  org: string | null
}

export interface WifiSnapshot {
  connected: WifiNetwork | null
  networks: WifiNetwork[]
  localIp: string | null
  gateway: string | null
  globalIp: GlobalIpInfo | null
}

/**
 * Map signal 0–100 to discrete level 0–4.
 */
export function signalLevel(signal: number): 0 | 1 | 2 | 3 | 4 {
  if (signal >= 75) return 4
  if (signal >= 50) return 3
  if (signal >= 25) return 2
  if (signal > 0) return 1
  return 0
}

// BSSID pattern: escaped colons in nmcli -t output e.g. "DE\:AD\:BE\:EF\:00\:01"
const BSSID_RE = /([0-9A-Fa-f]{2}\\:[0-9A-Fa-f]{2}\\:[0-9A-Fa-f]{2}\\:[0-9A-Fa-f]{2}\\:[0-9A-Fa-f]{2}\\:[0-9A-Fa-f]{2})$/

/**
 * Parse `nmcli -t -f SSID,SIGNAL,SECURITY,BSSID,IN-USE device wifi list` output.
 *
 * BSSID contains escaped colons (`\:`), which collide with nmcli's `:` delimiter.
 * Strategy: extract BSSID from line end via regex, then split the remainder.
 */
export function parseWifiList(output: string): WifiNetwork[] {
  if (!output.trim()) return []

  const seen = new Set<string>()

  return output
    .split("\n")
    .filter(Boolean)
    .map((line): WifiNetwork | null => {
      // Extract IN-USE (last field after BSSID): either "*" or " "
      // Line format: SSID:SIGNAL:SECURITY:BSSID:IN-USE
      // But BSSID has escaped colons, so we first strip IN-USE from end

      // IN-USE is the last field: ":" followed by "*" or "" at EOL
      const inUseMatch = line.match(/:(\*?)$/)
      if (!inUseMatch) return null
      const inUse = inUseMatch[1] === "*"
      const withoutInUse = line.slice(0, line.length - inUseMatch[0].length)

      // Extract BSSID from end of remaining string
      const bssidMatch = withoutInUse.match(BSSID_RE)
      if (!bssidMatch) return null
      const bssidRaw = bssidMatch[1]
      const bssid = bssidRaw.replace(/\\\:/g, ":")
      const withoutBssid = withoutInUse.slice(0, withoutInUse.length - bssidMatch[0].length)

      // Remove trailing colon separator before BSSID
      const rest = withoutBssid.endsWith(":") ? withoutBssid.slice(0, -1) : withoutBssid

      // rest = SSID:SIGNAL:SECURITY — split from end
      const parts = rest.split(":")
      if (parts.length < 3) return null

      const security = parts.pop()!.trim()
      const signalStr = parts.pop()!.trim()
      const ssid = parts.join(":").trim()

      if (!ssid) return null

      const signal = parseInt(signalStr, 10) || 0

      return { ssid, signal, security, bssid, inUse }
    })
    .filter((ap): ap is WifiNetwork => {
      if (!ap) return false
      // Deduplicate by SSID, keep strongest signal
      if (seen.has(ap.ssid)) return false
      seen.add(ap.ssid)
      return true
    })
    .sort((a, b) => {
      if (a.inUse !== b.inUse) return a.inUse ? -1 : 1
      return b.signal - a.signal
    })
}

/**
 * Parse `nmcli -t -f IP4.ADDRESS,IP4.GATEWAY device show <iface>` output.
 */
export function parseNmcliIpInfo(output: string): { localIp: string | null; gateway: string | null } {
  let localIp: string | null = null
  let gateway: string | null = null

  for (const line of output.split("\n")) {
    if (line.startsWith("IP4.ADDRESS")) {
      const val = line.split(":").slice(1).join(":").trim()
      // Strip CIDR prefix: "192.168.1.10/24" -> "192.168.1.10"
      localIp = val.split("/")[0] || null
    } else if (line.startsWith("IP4.GATEWAY")) {
      const val = line.split(":").slice(1).join(":").trim()
      gateway = val || null
    }
  }

  return { localIp, gateway }
}

/**
 * Parse ipinfo.io/json response.
 */
export function parseIpInfoJson(json: string): GlobalIpInfo | null {
  try {
    const data = JSON.parse(json)
    if (!data.ip) return null
    return {
      ip: data.ip,
      city: data.city ?? null,
      country: data.country ?? null,
      org: data.org ?? null,
    }
  } catch {
    return null
  }
}
