import { afterAll, describe, expect, test } from "bun:test"
import { createServer } from "node:http"
import { normalize, reachable } from "./detect.js"

const server = createServer((_req, res) => {
  res.writeHead(200, { "content-type": "text/html" })
  res.end("<!doctype html><title>Fixture</title>")
})
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
const address = server.address()
if (!address || typeof address === "string") throw new Error("Fixture server did not start")
const url = `http://127.0.0.1:${address.port}`

afterAll(() => new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve())))

describe("normalize", () => {
  test("adds the HTTP protocol and removes a trailing slash", () => {
    expect(normalize("localhost:5173/")).toBe("http://localhost:5173")
  })

  test("preserves HTTPS paths", () => {
    expect(normalize("https://example.com/app/")).toBe("https://example.com/app")
  })

  test("rejects unsupported protocols", () => {
    expect(() => normalize("file:///etc/passwd")).toThrow("Only http and https URLs are supported")
  })
})

describe("reachable", () => {
  test("accepts a reachable HTML application", async () => {
    expect(await reachable(url)).toBe(true)
  })

  test("rejects a closed port", async () => {
    expect(await reachable("http://127.0.0.1:1")).toBe(false)
  })
})
