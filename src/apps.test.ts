import { describe, expect, it } from "vitest"
import { APPS, appLink, findApp, listApps } from "./apps.js"

describe("findApp", () => {
  it("resolves by exact catalog id", () => {
    expect(findApp("netflix")).toEqual({
      id: "netflix",
      name: "Netflix",
      packageName: "com.netflix.ninja",
    })
  })

  it("resolves by display name, case-insensitively", () => {
    expect(findApp("YouTube")?.id).toBe("youtube")
    expect(findApp("PRIME VIDEO")?.id).toBe("primevideo")
  })

  it("trims surrounding whitespace before matching", () => {
    expect(findApp("  plex  ")?.id).toBe("plex")
  })

  it("returns undefined for an unknown query", () => {
    expect(findApp("hulu")).toBeUndefined()
    expect(findApp("")).toBeUndefined()
  })
})

describe("appLink", () => {
  it("builds a market:// launch uri from the package name by default", () => {
    expect(
      appLink({
        id: "netflix",
        name: "Netflix",
        packageName: "com.netflix.ninja",
      }),
    ).toBe("market://launch?id=com.netflix.ninja")
  })

  it("prefers an explicit link override when present", () => {
    expect(
      appLink({
        id: "custom",
        name: "Custom",
        packageName: "com.example.custom",
        link: "https://example.com/launch",
      }),
    ).toBe("https://example.com/launch")
  })
})

describe("listApps", () => {
  it("returns the full curated catalog", () => {
    const apps = listApps()
    expect(apps).toBe(APPS)
    expect(apps.length).toBeGreaterThan(0)
    expect(apps.map((app) => app.id)).toContain("netflix")
  })

  it("contains no duplicate ids", () => {
    const ids = listApps().map((app) => app.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
