import { EventEmitter } from "node:events"
import { beforeEach, describe, expect, it, vi } from "vitest"

// createSession wraps @kud/androidtv-remote's event-driven remote into a
// single observable `state`. We fake the remote as a plain EventEmitter with
// spy-able send methods, so tests exercise gating/state logic without a real
// TV or socket on the network.
class FakeRemote extends EventEmitter {
  sendKey = vi.fn()
  sendText = vi.fn()
  sendAppLink = vi.fn()
  stop = vi.fn()
  start = vi.fn(() => Promise.resolve(true))
}

let fakeRemote: FakeRemote

vi.mock("@kud/androidtv-remote", () => ({
  createAndroidRemote: vi.fn(() => fakeRemote),
}))

vi.mock("./config.js", () => ({
  getCurrentDevice: vi.fn(() => null),
}))

const { createSession } = await import("./session.js")
const configModule = await import("./config.js")

beforeEach(() => {
  fakeRemote = new FakeRemote()
  vi.mocked(configModule.getCurrentDevice).mockReturnValue(null)
})

describe("createSession", () => {
  it("reports an error state immediately when no device is configured or passed", () => {
    const session = createSession()

    expect(session.state.error).toBe("No TV configured. Run `gtv pair` first.")
    expect(session.state.connected).toBe(false)
  })

  it("seeds tvName/host from the given device and connects the underlying remote", () => {
    const session = createSession({ host: "10.0.0.5", name: "Lounge" })

    expect(session.state.tvName).toBe("Lounge")
    expect(session.state.host).toBe("10.0.0.5")
    expect(session.state.connected).toBe(false)
  })

  it("emits change and flips connected once the remote is ready", () => {
    const session = createSession({ host: "10.0.0.5" })
    const onChange = vi.fn()
    session.on("change", onChange)

    fakeRemote.emit("ready")

    expect(session.state.connected).toBe(true)
    expect(session.state.error).toBeNull()
    expect(onChange).toHaveBeenCalledWith(session.state)
  })

  it("mirrors powered, volume, and current_app events onto state", () => {
    const session = createSession({ host: "10.0.0.5" })
    fakeRemote.emit("ready")

    fakeRemote.emit("powered", true)
    fakeRemote.emit("volume", { level: 5, muted: false })
    fakeRemote.emit("current_app", "com.netflix.ninja")

    expect(session.state.powered).toBe(true)
    expect(session.state.volume).toEqual({ level: 5, muted: false })
    expect(session.state.currentApp).toBe("com.netflix.ninja")
  })

  it("gates sends on readiness — commands before ready are dropped, not sent", () => {
    const session = createSession({ host: "10.0.0.5" })

    session.sendKey(3)
    session.typeText("hello")
    session.launchApp("market://launch?id=x")

    expect(fakeRemote.sendKey).not.toHaveBeenCalled()
    expect(fakeRemote.sendText).not.toHaveBeenCalled()
    expect(fakeRemote.sendAppLink).not.toHaveBeenCalled()
  })

  it("forwards sends to the remote once ready", () => {
    const session = createSession({ host: "10.0.0.5" })
    fakeRemote.emit("ready")

    session.sendKey(3, 1)
    session.typeText("hello")
    session.launchApp("market://launch?id=x")

    expect(fakeRemote.sendKey).toHaveBeenCalledWith(3, 1)
    expect(fakeRemote.sendText).toHaveBeenCalledWith("hello")
    expect(fakeRemote.sendAppLink).toHaveBeenCalledWith("market://launch?id=x")
  })

  it("marks the session disconnected and stops gating sends back on once ready again after an error", () => {
    const session = createSession({ host: "10.0.0.5" })
    fakeRemote.emit("ready")
    fakeRemote.emit("error", new Error("socket closed"))

    expect(session.state.connected).toBe(false)
    expect(session.state.error).toBe("socket closed")

    session.sendKey(3)
    expect(fakeRemote.sendKey).not.toHaveBeenCalled()
  })

  it("reports a friendly error when the TV rejects the saved pairing", () => {
    const session = createSession({ host: "10.0.0.5" })
    fakeRemote.emit("unpaired")

    expect(session.state.connected).toBe(false)
    expect(session.state.error).toBe(
      "TV rejected the saved pairing. Run `gtv pair` again.",
    )
  })

  it("stops the underlying remote when the session is stopped", () => {
    const session = createSession({ host: "10.0.0.5" })

    session.stop()

    expect(fakeRemote.stop).toHaveBeenCalled()
  })
})
