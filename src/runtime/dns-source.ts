import { createState, type Accessor } from "gnim"
import { safeExec } from "./command.ts"
import { pollWhile } from "./visibility-gate.ts"

const DNS_POLL_MS = 30_000

export interface DnsSnapshot {
  servers: string[]
  protocols: string[]  // "dnscrypt", "DoT", "DNSSEC" etc.
  linkDns: string | null  // リンク単位の DNS
}

const EMPTY: DnsSnapshot = {
  servers: [],
  protocols: [],
  linkDns: null,
}

function parseResolvectl(raw: string): DnsSnapshot {
  if (!raw) return EMPTY

  const servers: string[] = []
  const protocols: string[] = []
  let linkDns: string | null = null
  let inGlobal = false
  let inLink = false

  for (const line of raw.split("\n")) {
    const trimmed = line.trim()

    if (trimmed === "Global") { inGlobal = true; inLink = false; continue }
    if (trimmed.startsWith("Link ")) { inGlobal = false; inLink = true; continue }

    // Global DNS servers + Fallback DNS
    if (inGlobal) {
      const dnsMatch = trimmed.match(/(?:Current |Fallback )?DNS Servers?:\s*(.+)/)
      if (dnsMatch) {
        for (const s of dnsMatch[1].split(/\s+/)) {
          const addr = s.replace(/#.*$/, "").trim()
          if (addr && !servers.includes(addr)) servers.push(addr)
        }
      }
      if (trimmed.startsWith("Protocols:")) {
        if (trimmed.includes("+DNSOverTLS")) protocols.push("DoT")
        if (/DNSSEC=(yes|allow-downgrade)/.test(trimmed)) protocols.push("DNSSEC")
      }
    }

    // Link DNS
    if (inLink) {
      const linkMatch = trimmed.match(/Current DNS Server:\s*(.+)/)
      if (linkMatch && !linkDns) {
        linkDns = linkMatch[1].trim()
      }
    }
  }

  // dnscrypt-proxy detection: if server is 127.0.0.1:5300 or similar local
  if (servers.some((s) => s.startsWith("127.0.0.1") || s.startsWith("::1"))) {
    protocols.push("dnscrypt")
  }

  return { servers, protocols, linkDns }
}

async function fetchDns(): Promise<DnsSnapshot> {
  // Global + all links
  const raw = await safeExec(["resolvectl", "status"])
  return parseResolvectl(raw)
}

export interface DnsSource {
  snapshot: Accessor<DnsSnapshot>
}

export function createDnsSource(active: Accessor<boolean>): DnsSource {
  const [snapshot, setSnapshot] = createState<DnsSnapshot>(EMPTY)

  pollWhile(active, DNS_POLL_MS, () => {
    fetchDns().then(setSnapshot)
  })

  return { snapshot }
}
