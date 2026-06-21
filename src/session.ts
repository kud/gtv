import EventEmitter from "node:events"
import { createAndroidRemote, type AndroidRemote } from "@kud/androidtv-remote"
import { getCurrentDevice, type Device } from "./config.js"
import type { SessionState } from "./types.js"

interface Session extends EventEmitter {
  readonly state: SessionState
  sendKey(keyCode: number, direction?: number): void
  typeText(text: string): void
  stop(): void
  on(event: "change", listener: (state: SessionState) => void): this
  on(event: "error", listener: (error: Error) => void): this
}

// A long-lived, framework-agnostic connection to a Google TV. It reduces the
// library's events into a single observable `state` and re-emits "change" on
// every update — so React (the CLI), an MCP server, or a Tauri app each just
// subscribe and forward. Replaces the old React-bound `use-remote` hook.
const createSession = (device?: Device): Session => {
  const emitter = new EventEmitter()
  const state: SessionState = {
    tvName: null,
    host: null,
    connected: false,
    powered: null,
    volume: null,
    currentApp: null,
    error: null,
  }
  let ready = false
  let remote: AndroidRemote | undefined

  const update = (patch: Partial<SessionState>): void => {
    Object.assign(state, patch)
    emitter.emit("change", state)
  }

  const config = device ?? getCurrentDevice()
  if (!config) {
    update({ error: "No TV configured. Run `gtv pair` first." })
  } else {
    update({ tvName: config.name ?? "Google TV", host: config.host })

    remote = createAndroidRemote(config.host, {
      pairing_port: 6467,
      remote_port: config.port ?? 6466,
      service_name: config.name ?? "gtv",
      ...(config.cert ? { cert: config.cert } : {}),
    })

    remote.on("ready", () => {
      ready = true
      update({ connected: true, error: null })
    })
    remote.on("powered", (powered) => update({ powered }))
    remote.on("volume", (volume) => update({ volume }))
    remote.on("current_app", (currentApp) => update({ currentApp }))
    remote.on("error", (error) => {
      ready = false
      update({ connected: false, error: error.message })
    })
    remote.on("unpaired", () => {
      ready = false
      update({
        connected: false,
        error: "TV rejected the saved pairing. Run `gtv pair` again.",
      })
    })

    remote.start().catch((error: Error) => update({ error: error.message }))
  }

  // Sends are gated on the ready event — sending before the socket is up is a
  // no-op rather than a crash.
  const withReady = (fn: (remote: AndroidRemote) => void): void => {
    if (!ready || !remote) return
    try {
      fn(remote)
    } catch (error) {
      ready = false
      update({
        connected: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const sendKey = (keyCode: number, direction?: number): void =>
    withReady((r) => r.sendKey(keyCode, direction))
  const typeText = (text: string): void => withReady((r) => r.sendText(text))
  const stop = (): void => remote?.stop()

  return Object.assign(emitter, { state, sendKey, typeText, stop }) as Session
}

export { createSession }
export type { Session }
