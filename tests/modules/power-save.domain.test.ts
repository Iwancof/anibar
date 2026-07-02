import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  parsePwsaveStatus,
  isAllEnabled,
  isMeasureEnabled,
  parseLidAction,
} from "../../src/modules/power-save/domain.ts"

describe("parsePwsaveStatus", () => {
  it("parses all_disabled status", () => {
    const json = JSON.stringify({
      summary: "all_disabled",
      measures: [
        { measure: "ppd", enabled: false, profile: "balanced" },
        { measure: "brightness", enabled: false },
        { measure: "boost", enabled: false },
        { measure: "cores", enabled: false },
        { measure: "gpu", enabled: false },
        { measure: "wifi", enabled: false },
      ],
    })
    const result = parsePwsaveStatus(json)!
    assert.equal(result.summary, "all_disabled")
    assert.equal(result.measures.length, 6)
    assert.ok(result.measures.every((m) => !m.enabled))
  })

  it("parses all_enabled status", () => {
    const json = JSON.stringify({
      summary: "all_enabled",
      measures: [
        { measure: "ppd", enabled: true },
        { measure: "brightness", enabled: true },
        { measure: "boost", enabled: true },
        { measure: "cores", enabled: true },
        { measure: "gpu", enabled: true },
        { measure: "wifi", enabled: true },
      ],
    })
    const result = parsePwsaveStatus(json)!
    assert.equal(result.summary, "all_enabled")
    assert.ok(isAllEnabled(result))
  })

  it("parses partial status", () => {
    const json = JSON.stringify({
      summary: "partial",
      measures: [
        { measure: "ppd", enabled: true },
        { measure: "brightness", enabled: false },
        { measure: "boost", enabled: true },
        { measure: "cores", enabled: false },
        { measure: "gpu", enabled: false },
        { measure: "wifi", enabled: true },
      ],
    })
    const result = parsePwsaveStatus(json)!
    assert.equal(result.summary, "partial")
    assert.equal(isAllEnabled(result), false)
    assert.ok(isMeasureEnabled(result, "ppd"))
    assert.equal(isMeasureEnabled(result, "brightness"), false)
  })

  it("returns null for invalid JSON", () => {
    assert.equal(parsePwsaveStatus("not json"), null)
    assert.equal(parsePwsaveStatus("{}"), null)
    assert.equal(parsePwsaveStatus(""), null)
  })

  it("ignores unknown measures", () => {
    const json = JSON.stringify({
      summary: "all_disabled",
      measures: [
        { measure: "ppd", enabled: false },
        { measure: "unknown_thing", enabled: true },
      ],
    })
    const result = parsePwsaveStatus(json)!
    assert.equal(result.measures.length, 1)
    assert.equal(result.measures[0].measure, "ppd")
  })
})

describe("parseLidAction", () => {
  it("parses suspend", () => {
    assert.equal(parseLidAction("suspend"), "suspend")
  })

  it("parses hibernate", () => {
    assert.equal(parseLidAction("Hibernate"), "hibernate")
  })

  it("parses ignore", () => {
    assert.equal(parseLidAction("ignore"), "ignore")
  })

  it("defaults to suspend for unknown values", () => {
    assert.equal(parseLidAction(""), "suspend")
    assert.equal(parseLidAction("poweroff"), "suspend")
  })
})
