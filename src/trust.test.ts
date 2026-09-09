import { describe, expect, test } from "bun:test"
import { allowed, gate, policy, zone } from "./trust.js"

describe("inspector target trust", () => {
  test("classifies loopback targets", () => {
    for (const target of [
      "http://127.0.0.1:3000",
      "http://127.254.9.1",
      "http://localhost:5173",
      "http://LOCALHOST",
      "http://sub.localhost",
      "http://localhost.",
      "http://0.0.0.0:3000",
      "http://[::1]:8080",
      "http://[::]:8080",
      "http://[::ffff:127.0.0.1]",
      "http://[::ffff:7f00:1]",
    ]) expect(zone(target)).toBe("loopback")
  })

  test("classifies private network targets", () => {
    for (const target of [
      "http://10.1.2.3",
      "http://172.16.0.1",
      "http://172.31.255.255",
      "http://192.168.0.77",
      "http://169.254.169.254",
      "http://100.64.0.1",
      "http://100.127.255.255",
      "http://[fc00::1]",
      "http://[fdff::1]",
      "http://[fe80::1]",
      "http://mybox.local",
      "http://[::ffff:10.0.0.1]",
      "http://[::ffff:a00:1]",
    ]) expect(zone(target)).toBe("private")
  })

  test("classifies public targets fail closed", () => {
    for (const target of [
      "http://example.com",
      "https://example.com/path",
      "http://172.32.0.1",
      "http://172.15.0.1",
      "http://11.0.0.1",
      "http://100.63.0.1",
      "http://100.128.0.1",
      "http://[2001:db8::1]",
      "http://app.test",
      "http://192.168.example.com",
      "http://[fec0::1]",
    ]) expect(zone(target)).toBe("public")
  })

  test("rejects invalid targets", () => {
    for (const target of ["", "not a url", "ftp://localhost", "file:///etc/hosts", "http://user:pass@localhost", "http:///"]) {
      expect(zone(target)).toBe("invalid")
    }
  })

  test("default policy allows loopback only", () => {
    expect(allowed("http://localhost:3000")).toBe(true)
    expect(allowed("http://127.0.0.1:4173/preview")).toBe(true)
    expect(allowed("http://192.168.1.10:5173")).toBe(false)
    expect(allowed("http://example.com")).toBe(false)
    expect(allowed("ftp://localhost")).toBe(false)
  })

  test("policy opt-ins unlock private and public targets", () => {
    expect(allowed("http://192.168.1.10:5173", { private: true })).toBe(true)
    expect(allowed("http://example.com", { private: true })).toBe(false)
    expect(allowed("http://example.com", { public: true })).toBe(true)
    expect(allowed("http://example.com", { public: true, private: true })).toBe(true)
    expect(allowed("http://localhost:3000", { loopback: false })).toBe(false)
    expect(allowed("http://user:pass@localhost", { loopback: true })).toBe(false)
  })

  test("reads opt-ins from the environment strictly", () => {
    expect(policy({ OPENCODE_INSPECT_ALLOW_PRIVATE: "1" })).toEqual({ private: true, public: false })
    expect(policy({ OPENCODE_INSPECT_ALLOW_PUBLIC: "1" })).toEqual({ private: false, public: true })
    expect(policy({ OPENCODE_INSPECT_ALLOW_PUBLIC: "1", OPENCODE_INSPECT_ALLOW_PRIVATE: "1" })).toEqual({ private: true, public: true })
    for (const wrong of ["true", "yes", "on", "0", "", " 1", "1 ", "01"]) {
      expect(policy({ OPENCODE_INSPECT_ALLOW_PUBLIC: wrong })).toEqual({ private: false, public: false })
      expect(policy({ OPENCODE_INSPECT_ALLOW_PRIVATE: wrong })).toEqual({ private: false, public: false })
    }
    expect(policy({})).toEqual({ private: false, public: false })
  })

  test("gate passes loopback and exact opt-ins, refuses the rest with the flag named", () => {
    expect(gate("http://localhost:3000", {})).toBeNull()
    expect(gate("http://127.0.0.1:4173/preview", {})).toBeNull()
    expect(gate("http://192.168.1.10:5173", {})).toBe("The inspector refuses private network targets by default. Set OPENCODE_INSPECT_ALLOW_PRIVATE=1 to inspect http://192.168.1.10:5173.")
    expect(gate("http://192.168.1.10:5173", { OPENCODE_INSPECT_ALLOW_PRIVATE: "1" })).toBeNull()
    expect(gate("http://example.com", { OPENCODE_INSPECT_ALLOW_PRIVATE: "1" })).toBe("The inspector refuses public network targets by default. Set OPENCODE_INSPECT_ALLOW_PUBLIC=1 to inspect http://example.com.")
    expect(gate("http://example.com", { OPENCODE_INSPECT_ALLOW_PUBLIC: "1" })).toBeNull()
    expect(gate("ftp://example.com", {})).toBe("The inspector target is invalid or unsupported: ftp://example.com. Use a plain http or https URL without embedded credentials.")
    expect(gate("http://user:pass@localhost", {})).toBe("The inspector target is invalid or unsupported: http://user:pass@localhost. Use a plain http or https URL without embedded credentials.")
    expect(gate("", {})).toContain("The inspector target is invalid or unsupported")
  })
})
