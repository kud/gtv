import { spawn } from "node:child_process"
import dns from "node:dns/promises"

interface DiscoveredDevice {
  name: string
  host: string
  hostname: string
  port: number
}

// mDNS browse via the `dns-sd` system tool (macOS / avahi). Kept as-is from the
// CLI because it is proven on the platforms every current consumer runs on.
// TODO: a pure-JS mDNS (e.g. bonjour-service) would make this portable to
// Windows for the Tauri app — swap in once that platform is in scope.
const browseServices = (timeout: number): Promise<string[]> =>
  new Promise((resolve) => {
    const names: string[] = []
    const proc = spawn("dns-sd", ["-B", "_androidtvremote2._tcp", "local"])

    proc.stdout.on("data", (data: Buffer) => {
      for (const line of data.toString().split("\n")) {
        const match = line.match(
          /Add\s+\d+\s+\d+\s+\S+\s+_androidtvremote2\._tcp\.\s+(.+)$/,
        )
        if (match) names.push(match[1]!.trim())
      }
    })

    setTimeout(() => {
      proc.kill()
      resolve([...new Set(names)])
    }, timeout)
  })

const resolveService = (
  name: string,
): Promise<{ hostname: string; port: number } | null> =>
  new Promise((resolve) => {
    const proc = spawn("dns-sd", [
      "-L",
      name,
      "_androidtvremote2._tcp",
      "local",
    ])
    let output = ""

    proc.stdout.on("data", (data: Buffer) => {
      output += data.toString()
      const match = output.match(/can be reached at ([^:]+):(\d+)/)
      if (match) {
        proc.kill()
        resolve({ hostname: match[1]!, port: parseInt(match[2]!, 10) })
      }
    })

    setTimeout(() => {
      proc.kill()
      resolve(null)
    }, 3000)
  })

// Returns the Google TV devices found on the local network. Pure data — any
// UI (spinners, selection prompts, persistence) belongs to the caller.
const discover = async (
  opts: { timeout?: number } = {},
): Promise<DiscoveredDevice[]> => {
  const timeout = opts.timeout ?? 5000
  const names = await browseServices(timeout)
  if (names.length === 0) return []

  const resolved = await Promise.all(
    names.map(async (name) => {
      const service = await resolveService(name)
      if (!service) return null

      const { address } = await dns.lookup(service.hostname, { family: 4 })
      return {
        name,
        host: address,
        hostname: service.hostname,
        port: service.port,
      } satisfies DiscoveredDevice
    }),
  )

  return resolved.filter((d): d is DiscoveredDevice => d !== null)
}

export { discover }
export type { DiscoveredDevice }
