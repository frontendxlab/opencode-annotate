import { afterEach, describe, expect, test } from "bun:test"
import { access } from "node:fs/promises"
import { constants } from "node:fs"
import { browser, launch, launchArgs } from "./browser.js"
import type { BrowserControl } from "./browser.js"

const controls: BrowserControl[] = []

afterEach(async () => {
  await Promise.all(controls.splice(0).map((item) => item.close()))
})

describe("browser launch", () => {
  test("builds an isolated ephemeral CDP app command", () => {
    expect(launchArgs("http://127.0.0.1:3000", "/tmp/inspector-profile")).toEqual([
      "--no-first-run",
      "--no-default-browser-check",
      "--remote-debugging-port=0",
      "--user-data-dir=/tmp/inspector-profile",
      "--app=http://127.0.0.1:3000",
    ])
  })

  test("applies window bounds through real Chromium when available", async () => {
    const bin = "/usr/bin/google-chrome"
    try {
      await access(bin, constants.X_OK)
    } catch {
      return
    }
    const control = launch({ bin, name: "Chrome", args: [] }, "data:text/html,<title>inspector</title>")
    controls.push(control)
    await control.ready
    await control.resize(900, 700)
  }, 15000)
})
