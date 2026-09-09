import { describe, expect, test } from "bun:test"
import { batch } from "./validate.js"

const viewport = { label: "Desktop", width: 1440, height: 900 }
const note = {
  request: "Make this button quieter",
  page: "http://localhost:3000",
  tag: "button",
  id: "save",
  classes: ["button", "primary"],
  selector: "#save",
  xpath: "/html/body/button",
  pseudo: null,
  html: "<button id=\"save\">Save</button>",
  text: "Save",
  attributes: { id: "save" },
  styles: { color: "rgb(0, 0, 0)" },
  rect: { x: 10, y: 20, width: 80, height: 32 },
  viewport,
  source: "src/Button.tsx:12",
}

describe("annotation validation", () => {
  test("accepts and normalizes a valid batch", () => {
    expect(batch({ target: note.page, viewports: [viewport], delivery: "main", annotations: [note] })).toEqual({ target: note.page, viewports: [viewport], delivery: "main", annotations: [note] })
  })

  test("rejects empty batches and missing locators", () => {
    expect(batch({ target: note.page, viewports: [viewport], delivery: "main", annotations: [] })).toBeNull()
    expect(batch({ target: note.page, viewports: [viewport], delivery: "main", annotations: [{ ...note, selector: "", xpath: "" }] })).toBeNull()
  })

  test("bounds untrusted browser fields", () => {
    const result = batch({ target: note.page, viewports: [viewport], delivery: "main", annotations: [{ ...note, request: "x".repeat(3_000), html: "y".repeat(2_000) }] })
    expect(result?.annotations[0].request).toHaveLength(2_000)
    expect(result?.annotations[0].html).toHaveLength(1_200)
  })

  test("normalizes unknown delivery to main and keeps subagent routes", () => {
    expect(batch({ target: note.page, viewports: [viewport], delivery: "sneaky", annotations: [note] })?.delivery).toBe("main")
    expect(batch({ target: note.page, viewports: [viewport], delivery: "subagent-context", annotations: [note] })?.delivery).toBe("subagent-context")
    expect(batch({ target: note.page, viewports: [viewport], delivery: "subagent-fresh", annotations: [note] })?.delivery).toBe("subagent-fresh")
  })

  test("normalizes viewport entries and fills defaults", () => {
    const result = batch({ target: note.page, viewports: [{ label: "", width: -5, height: 1200.4 }], delivery: "main", annotations: [note] })
    expect(result?.viewports).toEqual([{ label: "Viewport", width: 320, height: 1200 }])
  })

  test("caps the viewport list at twenty entries", () => {
    const list = Array.from({ length: 25 }, (_, index) => ({ ...viewport, width: viewport.width + index }))
    expect(batch({ target: note.page, viewports: list, delivery: "main", annotations: [note] })?.viewports).toHaveLength(20)
  })

  test("deduplicates viewport dimensions", () => {
    const list = [viewport, { ...viewport, label: "Same size" }]
    expect(batch({ target: note.page, viewports: list, delivery: "main", annotations: [note] })?.viewports).toEqual([viewport])
  })

  test("defaults a missing annotation viewport", () => {
    const result = batch({ target: note.page, viewports: [viewport], delivery: "main", annotations: [{ ...note, viewport: undefined }] })
    expect(result?.annotations[0].viewport).toEqual({ label: "Viewport", width: 320, height: 320 })
  })
})
