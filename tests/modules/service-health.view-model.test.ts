import assert from "node:assert/strict"
import test from "node:test"

import {
  countHealthyServices,
  normalizeServiceState,
} from "../../src/modules/service-health/domain.ts"
import { toServiceHealthViewModel } from "../../src/modules/service-health/view-model.ts"

test("normalizeServiceState maps unknown strings safely", () => {
  assert.equal(normalizeServiceState("active"), "active")
  assert.equal(normalizeServiceState("failed"), "failed")
  assert.equal(normalizeServiceState("weird"), "unknown")
})

test("countHealthyServices counts active units only", () => {
  const healthy = countHealthyServices({
    services: [
      { name: "a", displayName: "A", state: "active" },
      { name: "b", displayName: "B", state: "activating" },
      { name: "c", displayName: "C", state: "active" },
    ],
  })

  assert.equal(healthy, 2)
})

test("toServiceHealthViewModel surfaces failing units", () => {
  const viewModel = toServiceHealthViewModel({
    services: [
      { name: "NetworkManager", displayName: "NetworkManager", state: "active" },
      { name: "dnscrypt-proxy", displayName: "dnscrypt", state: "failed" },
    ],
  })

  assert.equal(viewModel.tone, "critical")
  assert.match(viewModel.detail, /dnscrypt/)
  assert.equal(viewModel.rows.length, 2)
})
