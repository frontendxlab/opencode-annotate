import { describe, expect, test } from "bun:test"
import { batch } from "./validate.js"

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
  source: "src/Button.tsx:12",
}

describe("annotation validation", () => {
  test("accepts and normalizes a valid batch", () => {
    expect(batch({ target: note.page, annotations: [note] })).toEqual({ target: note.page, annotations: [note] })
  })

  test("rejects empty batches and missing locators", () => {
    expect(batch({ target: note.page, annotations: [] })).toBeNull()
    expect(batch({ target: note.page, annotations: [{ ...note, selector: "", xpath: "" }] })).toBeNull()
  })

  test("bounds untrusted browser fields", () => {
    const result = batch({ target: note.page, annotations: [{ ...note, request: "x".repeat(3_000), html: "y".repeat(2_000) }] })
    expect(result?.annotations[0].request).toHaveLength(2_000)
    expect(result?.annotations[0].html).toHaveLength(1_200)
  })
})
