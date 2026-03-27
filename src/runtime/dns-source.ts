import GLib from "gi://GLib?version=2.0"
import { createState, type Accessor } from "gnim"
import { safeExec } from "./command.ts"

const DNS_POLL_MS = 30_000

export interface DnsSnapshot {
  servers: string[]
  dot: boolean
  dnssec: boolean
}

const EMPTY: DnsSnapshot = {
  servers: [],
  dot: false,
  dnssec: false,
}

function parseResolvectl(raw: string): DnsSnapshot {
  if (!raw) return EMPTY

  const servers: string[] = []
  let dot = false
  let dnssec = false

  for (const line of raw.split("\n")) {
    const trimmed = line.trim()

    // "DNS Servers: 192.168.11.1" or "Current DNS Server: ..."
    const dnsMatch = trimmed.match(/DNS Servers?:\s*(.+)/)
    if (dnsMatch) {
      for (const s of dnsMatch[1].split(/\s+/)) {
        const addr = s.trim()
        if (addr && !servers.includes(addr)) servers.push(addr)
      }
    }

    // "Protocols: +DefaultRoute +LLMNR ... -DNSOverTLS DNSSEC=no/unsupported"
    if (trimmed.startsWith("Protocols:")) {
      dot = trimmed.includes("+DNSOverTLS")
      dnssec = /DNSSEC=(yes|allow-downgrade)/.test(trimmed)
    }
  }

  return { servers, dot, dnssec }
}

async function fetchActiveWifiInterface(): Promise<string | null> {
  const out = await safeExec(["nmcli", "-t", "-f", "DEVICE,TYPE,STATE", "device", "status"])
  for (const line of out.split("\n")) {
    const [device, type, state] = line.split(":")
    if (state?.trim() === "connected" && type?.trim() === "wifi") {
      return device?.trim() ?? null
    }
  }
  return null
}

async function fetchDns(): Promise<DnsSnapshot> {
  const iface = await fetchActiveWifiInterface()
  if (!iface) return EMPTY
  const raw = await safeExec(["resolvectl", "status", iface])
  return parseResolvectl(raw)
}

export interface DnsSource {
  snapshot: Accessor<DnsSnapshot>
}

export function createDnsSource(): DnsSource {
  const [snapshot, setSnapshot] = createState<DnsSnapshot>(EMPTY)

  fetchDns().then(setSnapshot)

  GLib.timeout_add(GLib.PRIORITY_DEFAULT, DNS_POLL_MS, () => {
    fetchDns().then(setSnapshot)
    return GLib.SOURCE_CONTINUE
  })

  return { snapshot }
}
