// Target trust policy for the visual inspector.
//
// The proxy binds to loopback and injects an authenticated client into the
// target page, so every script the target serves runs in the same document as
// the inspector credential and can read or replay it. That is safe only for
// hosts the developer already trusts, which is why the default policy allows
// loopback targets only and requires explicit opt-in for private and public
// network targets.
//
// Classification is hostname-literal only: names are never resolved. A name
// that is not localhost and not a literal IP fails closed as public, including
// names that would resolve to loopback via /etc/hosts or DNS.

export type Zone = "loopback" | "private" | "public" | "invalid"

export type Policy = { loopback?: boolean; private?: boolean; public?: boolean }

function zone4(value: number[]): Zone {
  const [a, b] = value
  if (a === 127 || a === 0) return "loopback"
  if (a === 10) return "private"
  if (a === 172 && b >= 16 && b <= 31) return "private"
  if (a === 192 && b === 168) return "private"
  if (a === 169 && b === 254) return "private"
  if (a === 100 && b >= 64 && b <= 127) return "private"
  return "public"
}

function quad(host: string): number[] | null {
  const parts = host.split(".")
  if (parts.length !== 4) return null
  const values = parts.map((part) => (/^\d{1,3}$/.test(part) ? Number(part) : -1))
  return values.some((value) => value < 0 || value > 255) ? null : values
}

function zone6(host: string): Zone {
  const bare = host.toLowerCase().split("%")[0]
  if (bare === "::1" || bare === "::") return "loopback"
  const mapped = bare.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/)
  if (mapped) {
    const value = quad(mapped[1])
    return value ? zone4(value) : "public"
  }
  const hex = bare.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
  if (hex) {
    const value = (parseInt(hex[1], 16) << 16) | parseInt(hex[2], 16)
    return zone4([(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255])
  }
  const head = bare.split(":")[0]
  if (head >= "fc00" && head <= "fdff") return "private"
  if (head >= "fe80" && head <= "febf") return "private"
  return "public"
}

function classify(host: string): Zone {
  const value = host.toLowerCase().replace(/\.$/, "").replace(/^\[(.*)\]$/, "$1")
  if (!value) return "invalid"
  if (value === "localhost" || value.endsWith(".localhost")) return "loopback"
  const four = quad(value)
  if (four) return zone4(four)
  if (value.includes(":")) return zone6(value)
  if (value.endsWith(".local")) return "private"
  return "public"
}

// ponytail: hostname-literal classification without DNS resolution; a name like
// dev.corp resolving to 10.x fails closed as public. Add resolution later if
// LAN-name targets matter.
export function zone(target: string): Zone {
  let url: URL
  try {
    url = new URL(target)
  } catch {
    return "invalid"
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "invalid"
  if (url.username || url.password) return "invalid"
  return classify(url.hostname)
}

export function allowed(target: string, policy: Policy = {}): boolean {
  const kind = zone(target)
  if (kind === "loopback") return policy.loopback ?? true
  if (kind === "private") return policy.private === true
  if (kind === "public") return policy.public === true
  return false
}

// Environment contract: OPENCODE_INSPECT_ALLOW_PRIVATE=1 and
// OPENCODE_INSPECT_ALLOW_PUBLIC=1 are process-local, independent opt-ins. A
// value must be exactly "1"; enabling the public opt-in does not enable
// private targets. Any other value or spelling keeps the default policy.
export function policy(env: NodeJS.ProcessEnv = process.env): Policy {
  return {
    private: env.OPENCODE_INSPECT_ALLOW_PRIVATE === "1",
    public: env.OPENCODE_INSPECT_ALLOW_PUBLIC === "1",
  }
}

// Returns null when the target may be inspected, otherwise the exact error
// message that explains the opt-in. Invalid targets and targets with embedded
// credentials are always refused.
export function gate(target: string, env: NodeJS.ProcessEnv = process.env): string | null {
  const kind = zone(target)
  if (kind === "invalid") return `The inspector target is invalid or unsupported: ${target}. Use a plain http or https URL without embedded credentials.`
  if (!allowed(target, policy(env))) {
    const flag = kind === "private" ? "OPENCODE_INSPECT_ALLOW_PRIVATE=1" : "OPENCODE_INSPECT_ALLOW_PUBLIC=1"
    return `The inspector refuses ${kind} network targets by default. Set ${flag} to inspect ${target}.`
  }
  return null
}
