import { afterAll, describe, expect, test } from "bun:test"
import { createServer, type Server } from "node:http"
import { inspectable, normalize, reachable } from "./detect.js"

const servers: Server[] = []

async function fixture(status: number, type: string) {
  const server = createServer((_req, res) => {
    res.writeHead(status, { "content-type": type })
    res.end("<!doctype html><title>Fixture</title>")
  })
  servers.push(server)
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (!address || typeof address === "string") throw new Error("Fixture server did not start")
  return `http://127.0.0.1:${address.port}`
}

const url = await fixture(200, "text/html")

afterAll(async () => {
  await Promise.all(servers.map((server) => new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()))))
})

describe("normalize", () => {
  test("adds the HTTP protocol and removes a trailing slash", () => {
    expect(normalize("localhost:5173/")).toBe("http://localhost:5173")
  })

  test("preserves HTTPS paths", () => {
    expect(normalize("https://example.com/app/")).toBe("https://example.com/app")
  })

  test("normalizes mixed-case schemes instead of mangling them", () => {
    expect(normalize("HTTPS://EXAMPLE.COM")).toBe("https://example.com")
    expect(normalize("Http://LocalHost:5173/App/")).toBe("http://localhost:5173/App")
  })

  test("rejects unsupported protocols regardless of case", () => {
    expect(() => normalize("file:///etc/passwd")).toThrow("Only http and https URLs are supported")
    expect(() => normalize("FILE:///etc/passwd")).toThrow("Only http and https URLs are supported")
    expect(() => normalize("JavaScript:alert(1)")).toThrow("Only http and https URLs are supported")
  })
})

describe("reachable", () => {
  test("accepts a reachable HTML application", async () => {
    expect(await reachable(url)).toBe(true)
  })

  test("accepts a reachable non-HTML application", async () => {
    expect(await reachable(await fixture(200, "application/json"))).toBe(true)
  })

  test("accepts a redirect as reachable", async () => {
    expect(await reachable(await fixture(302, "text/html"))).toBe(true)
  })

  test("rejects a closed port", async () => {
    expect(await reachable("http://127.0.0.1:1")).toBe(false)
  })

  test("rejects server errors", async () => {
    expect(await reachable(await fixture(500, "text/html"))).toBe(false)
  })
})

describe("inspectable", () => {
  test("accepts an HTML application", async () => {
    expect(await inspectable(url)).toBe(true)
  })

  test("accepts a redirect as inspectable", async () => {
    expect(await inspectable(await fixture(302, "text/html"))).toBe(true)
  })

  test("rejects non-HTML content at the root", async () => {
    expect(await inspectable(await fixture(200, "application/json"))).toBe(false)
  })

  test("rejects a closed port", async () => {
    expect(await inspectable("http://127.0.0.1:1")).toBe(false)
  })
})
