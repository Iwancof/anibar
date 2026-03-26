import { describe, it, expect } from "bun:test"
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
    expect(result.summary).toBe("all_disabled")
    expect(result.measures).toHaveLength(6)
    expect(result.measures.every((m) => !m.enabled)).toBe(true)
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
    expect(result.summary).toBe("all_enabled")
    expect(isAllEnabled(result)).toBe(true)
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
    expect(result.summary).toBe("partial")
    expect(isAllEnabled(result)).toBe(false)
    expect(isMeasureEnabled(result, "ppd")).toBe(true)
    expect(isMeasureEnabled(result, "brightness")).toBe(false)
  })

  it("returns null for invalid JSON", () => {
    expect(parsePwsaveStatus("not json")).toBeNull()
    expect(parsePwsaveStatus("{}")).toBeNull()
    expect(parsePwsaveStatus("")).toBeNull()
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
    expect(result.measures).toHaveLength(1)
    expect(result.measures[0].measure).toBe("ppd")
  })
})

describe("parseLidAction", () => {
  it("parses suspend", () => {
    expect(parseLidAction("suspend")).toBe("suspend")
  })

  it("parses hibernate", () => {
    expect(parseLidAction("Hibernate")).toBe("hibernate")
  })

  it("parses ignore", () => {
    expect(parseLidAction("ignore")).toBe("ignore")
  })

  it("defaults to suspend for unknown values", () => {
    expect(parseLidAction("")).toBe("suspend")
    expect(parseLidAction("poweroff")).toBe("suspend")
  })
})
