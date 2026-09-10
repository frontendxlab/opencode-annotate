import { describe, expect, test } from "bun:test"
import { live } from "./live.js"
import type { Batch } from "./types.js"

const item = { request: "change", page: "http://localhost/", tag: "button", id: null, classes: [], selector: "button", xpath: "//button", pseudo: null, html: "<button>", text: "", attributes: {}, styles: {}, rect: { x: 0, y: 0, width: 10, height: 10 }, viewport: { label: "test", width: 320, height: 320 }, source: null }
const value = { target: "http://localhost/", viewports: [item.viewport], delivery: "main", annotations: [item] } satisfies Batch
const wait = () => new Promise((resolve) => setTimeout(resolve, 0))

describe("live jobs", () => {
  test("orders states and does not resubmit an id", async () => {
    let calls = 0
    const service = live(async () => { calls++ })
    expect(service.create("a", value).state).toBe("submitting")
    expect(service.create("a", value).state).toBe("submitting")
    service.observe("busy")
    service.observe("idle")
    await wait()
    expect(calls).toBe(1)
    expect(service.status("a")?.events.map((event) => event.state)).toEqual(["submitting", "working", "succeeded"])
  })

  test("retains immediate busy and idle", async () => {
    const service = live(async () => {})
    service.create("a", value)
    service.observe("busy")
    service.observe("idle")
    await wait()
    expect(service.status("a")?.state).toBe("succeeded")
  })

  test("replays only events after the cursor", async () => {
    const service = live(async () => {})
    service.create("a", value)
    service.observe("busy")
    const got: string[] = []
    service.listen("a", 1, (event) => got.push(event.state))
    service.observe("idle")
    await wait()
    expect(got).toEqual(["succeeded"])
  })

  test("fails, bounds errors, cancels, and stops", async () => {
    const service = live(async () => { throw new Error("x".repeat(3_000)) })
    service.create("a", value)
    await wait()
    expect(service.status("a")?.state).toBe("failed")
    expect(service.status("a")?.error?.length).toBe(2_000)
    const other = live(async () => {})
    other.create("b", value)
    expect(other.cancel("b")).toBe(true)
    expect(other.status("b")?.state).toBe("cancelled")
    other.create("c", value)
    other.stop()
    expect(other.status("c")).toBeNull()
  })

  test("a rejected request cannot fail a newer request", async () => {
    const rejects: Array<(reason?: unknown) => void> = []
    const service = live(() => new Promise<void>((_resolve, fail) => { rejects.push(fail) }))
    service.create("A", value)
    service.cancel("A")
    service.create("B", value)
    rejects[0](new Error("A failed"))
    await wait()
    expect(service.status("B")?.state).toBe("submitting")
    expect(service.status("B")?.error).toBeUndefined()
    expect(service.status("A")?.state).toBe("cancelled")
  })

  test("idle before any busy or activity does not mark success", async () => {
    const service = live(async () => {})
    service.create("a", value)
    service.observe("idle")
    await wait()
    expect(service.status("a")?.state).toBe("submitting")
    service.observe("busy")
    service.observe("idle")
    await wait()
    expect(service.status("a")?.state).toBe("succeeded")
  })

  test("session activity alone never completes without idle", async () => {
    const service = live(async () => {})
    service.create("a", value)
    service.observe("busy")
    await wait()
    expect(service.status("a")?.state).toBe("working")
    service.observe("idle")
    await wait()
    expect(service.status("a")?.state).toBe("succeeded")
  })
})
