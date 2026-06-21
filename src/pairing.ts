import { createAndroidRemote, type Certificate } from "@kud/androidtv-remote"
import { upsertDevice, type Device } from "./config.js"

type PairStatus = "connecting" | "awaiting-pin" | "pairing" | "paired"

interface PairOptions {
  // Address to persist (typically the resolved IPv4 from discovery).
  host: string
  // Address to connect to during pairing; defaults to `host`.
  hostname?: string
  // Remote port to persist for later connections (not the pairing port).
  port?: number
  name?: string
  serviceName?: string
  // Resolve with the PIN shown on the TV. Driven by the consumer (a terminal
  // prompt, an MCP round-trip, a Tauri dialog…).
  onSecret: () => Promise<string>
  onStatus?: (status: PairStatus) => void
  // Persist the paired device + cert to the config store (default true).
  save?: boolean
}

interface PairResult {
  cert: Certificate
  device: Device
}

// Pairs with a TV as a pure async flow. All UI is injected: the PIN comes from
// `onSecret`, progress goes to `onStatus`. No prompts, spinners, or printing.
const pair = (opts: PairOptions): Promise<PairResult> =>
  new Promise((resolve, reject) => {
    const onStatus = opts.onStatus ?? (() => {})
    onStatus("connecting")

    const remote = createAndroidRemote(opts.hostname ?? opts.host, {
      pairing_port: 6467,
      service_name: opts.serviceName ?? "gtv",
    })

    const fail = (message: string) => {
      remote.stop()
      reject(new Error(message))
    }

    remote.on("secret", async () => {
      onStatus("awaiting-pin")
      try {
        const pin = await opts.onSecret()
        onStatus("pairing")
        remote.sendCode(pin)
      } catch (error) {
        fail(error instanceof Error ? error.message : String(error))
      }
    })

    remote.on("ready", () => {
      const cert = remote.getCertificate()
      const device: Device = {
        host: opts.host,
        port: opts.port,
        name: opts.name ?? opts.serviceName ?? "gtv",
        cert,
      }
      if (opts.save !== false) upsertDevice(device)
      onStatus("paired")
      remote.stop()
      resolve({ cert, device })
    })

    remote.on("unpaired", () => fail("TV rejected the pairing request."))
    remote.on("error", (error) => fail(error.message))

    remote
      .start()
      .then((paired) => {
        if (!paired)
          fail(
            "Could not connect to TV. Check that 'Remote Device Settings → Control remotely' is enabled.",
          )
      })
      .catch((error: Error) => fail(error.message))
  })

export { pair }
export type { PairOptions, PairResult, PairStatus }
