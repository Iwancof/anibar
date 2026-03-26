import assert from "node:assert/strict"
import test from "node:test"

import { fuzzyScore, searchApps, type AppEntry } from "../../src/modules/launcher/domain.ts"

const firefox: AppEntry = {
  id: "firefox",
  name: "Firefox",
  description: "Web Browser",
  keywords: ["internet", "browser", "web"],
  icon: null,
}

const code: AppEntry = {
  id: "code",
  name: "Visual Studio Code",
  description: "Code Editing",
  keywords: ["editor", "ide", "development"],
  icon: null,
}

const discord: AppEntry = {
  id: "discord",
  name: "Discord",
  description: "Chat and Voice",
  keywords: ["chat", "voice", "gaming"],
  icon: null,
}

const kitty: AppEntry = {
  id: "kitty",
  name: "kitty",
  description: "The fast GPU-based terminal emulator",
  keywords: ["terminal", "shell"],
  icon: null,
}

const apps = [firefox, code, discord, kitty]

test("fuzzyScore: exact prefix scores highest", () => {
  const score = fuzzyScore(firefox, "fire")
  assert.ok(score >= 100)
})

test("fuzzyScore: substring in name scores medium", () => {
  const score = fuzzyScore(firefox, "fox")
  assert.ok(score >= 50 && score < 100)
})

test("fuzzyScore: keyword match scores lower", () => {
  const score = fuzzyScore(firefox, "browser")
  assert.ok(score >= 20 && score < 60)
})

test("fuzzyScore: fuzzy char match works", () => {
  const score = fuzzyScore(firefox, "ffx")
  assert.ok(score > 0)
})

test("fuzzyScore: no match returns 0", () => {
  assert.equal(fuzzyScore(firefox, "zzz"), 0)
})

test("fuzzyScore: empty query returns positive", () => {
  assert.ok(fuzzyScore(firefox, "") > 0)
})

test("searchApps: returns sorted results", () => {
  const results = searchApps(apps, "fi", 10)
  assert.equal(results[0].id, "firefox")
})

test("searchApps: empty query with recents shows recent first", () => {
  const results = searchApps(apps, "", 10, ["discord", "kitty"])
  assert.equal(results[0].id, "discord")
  assert.equal(results[1].id, "kitty")
})

test("searchApps: empty query without recents shows all", () => {
  const results = searchApps(apps, "", 10, [])
  assert.equal(results.length, 4)
})

test("searchApps: respects limit", () => {
  const results = searchApps(apps, "", 2)
  assert.equal(results.length, 2)
})

test("searchApps: filters non-matches", () => {
  const results = searchApps(apps, "zzz", 10)
  assert.equal(results.length, 0)
})

test("searchApps: terminal keyword finds kitty", () => {
  const results = searchApps(apps, "terminal", 10)
  assert.ok(results.some((r) => r.id === "kitty"))
})
