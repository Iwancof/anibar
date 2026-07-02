import assert from "node:assert/strict"
import test from "node:test"

import {
  parseWifiList,
  parseNmcliIpInfo,
  parseIpInfoJson,
  signalLevel,
  signalIcon,
  signalColorClass,
  countryBadge,
} from "../../src/modules/wifi/domain.ts"

// ── signalLevel ─────────────────────────────

test("signalLevel maps 0-100 to discrete levels", () => {
  assert.equal(signalLevel(0), 0)
  assert.equal(signalLevel(10), 1)
  assert.equal(signalLevel(25), 2)
  assert.equal(signalLevel(50), 3)
  assert.equal(signalLevel(75), 4)
  assert.equal(signalLevel(100), 4)
})

test("signal helpers render shared classes and country badges", () => {
  assert.equal(signalIcon(4), "󰤨")
  assert.equal(signalIcon(0), "󰤯")
  assert.equal(signalColorClass(3), "NpApSignalHigh")
  assert.equal(signalColorClass(1), "NpApSignalLow")
  assert.equal(countryBadge("jp"), "JP")
  assert.equal(countryBadge(""), "")
})

// ── parseWifiList ───────────────────────────

test("parseWifiList parses typical nmcli output with escaped BSSID colons", () => {
  const output = [
    "HomeNetwork:85:WPA2:DE\\:AD\\:BE\\:EF\\:00\\:01:*",
    "Neighbor5G:62:WPA2:AA\\:BB\\:CC\\:DD\\:EE\\:FF:",
    "OpenCafe:30::11\\:22\\:33\\:44\\:55\\:66:",
  ].join("\n")

  const result = parseWifiList(output)

  assert.equal(result.length, 3)
  // Connected AP first
  assert.equal(result[0].ssid, "HomeNetwork")
  assert.equal(result[0].signal, 85)
  assert.equal(result[0].security, "WPA2")
  assert.equal(result[0].bssid, "DE:AD:BE:EF:00:01")
  assert.equal(result[0].inUse, true)

  // Then sorted by signal
  assert.equal(result[1].ssid, "Neighbor5G")
  assert.equal(result[1].signal, 62)
  assert.equal(result[1].inUse, false)

  assert.equal(result[2].ssid, "OpenCafe")
  assert.equal(result[2].security, "")
  assert.equal(result[2].inUse, false)
})

test("parseWifiList handles SSID containing colons", () => {
  const output = "My:Network:70:WPA3:AB\\:CD\\:EF\\:01\\:23\\:45:"

  const result = parseWifiList(output)

  assert.equal(result.length, 1)
  assert.equal(result[0].ssid, "My:Network")
  assert.equal(result[0].signal, 70)
  assert.equal(result[0].security, "WPA3")
})

test("parseWifiList deduplicates SSIDs keeping first occurrence", () => {
  const output = [
    "DupNet:90:WPA2:AA\\:BB\\:CC\\:DD\\:EE\\:01:*",
    "DupNet:60:WPA2:AA\\:BB\\:CC\\:DD\\:EE\\:02:",
  ].join("\n")

  const result = parseWifiList(output)

  assert.equal(result.length, 1)
  assert.equal(result[0].ssid, "DupNet")
  assert.equal(result[0].signal, 90)
})

test("parseWifiList returns empty for blank input", () => {
  assert.deepEqual(parseWifiList(""), [])
  assert.deepEqual(parseWifiList("  \n  "), [])
})

// ── parseNmcliIpInfo ────────────────────────

test("parseNmcliIpInfo extracts IP and gateway", () => {
  const output = [
    "IP4.ADDRESS[1]:192.168.1.42/24",
    "IP4.GATEWAY:192.168.1.1",
  ].join("\n")

  const result = parseNmcliIpInfo(output)

  assert.equal(result.localIp, "192.168.1.42")
  assert.equal(result.gateway, "192.168.1.1")
})

test("parseNmcliIpInfo returns null when no info", () => {
  const result = parseNmcliIpInfo("")
  assert.equal(result.localIp, null)
  assert.equal(result.gateway, null)
})

// ── parseIpInfoJson ─────────────────────────

test("parseIpInfoJson extracts ip, city, country, org", () => {
  const json = JSON.stringify({
    ip: "203.0.113.42",
    city: "Tokyo",
    country: "JP",
    org: "AS12345 Example ISP",
    region: "Tokyo",
  })

  const result = parseIpInfoJson(json)

  assert.deepEqual(result, {
    ip: "203.0.113.42",
    city: "Tokyo",
    country: "JP",
    org: "AS12345 Example ISP",
  })
})

test("parseIpInfoJson returns null for invalid JSON", () => {
  assert.equal(parseIpInfoJson("not json"), null)
  assert.equal(parseIpInfoJson("{}"), null) // no ip field
})
