import { expect, test } from "bun:test"
import { prompt } from "./prompt.js"
import type { Batch } from "./types.js"

test("formats all annotations into one implementation request", () => {
  const item = {
    request: "Use a smaller radius",
    page: "http://localhost:3000/settings",
    tag: "button",
    id: "save",
    classes: ["button"],
    selector: "#save",
    xpath: "/html/body/button",
    pseudo: "::after" as const,
    html: "<button id=\"save\">Save</button>",
    text: "Save",
    attributes: { id: "save" },
    styles: { "border-radius": "12px" },
    rect: { x: 10, y: 20, width: 80, height: 32 },
    source: "src/Button.tsx:12",
  }
  const result = prompt({ target: item.page, annotations: [item, { ...item, request: "Use less padding", pseudo: null }] } satisfies Batch)
  expect(result).toContain("## Annotation 1")
  expect(result).toContain("## Annotation 2")
  expect(result).toContain("Target: #save::after")
  expect(result).toContain("Source hint: src/Button.tsx:12")
  expect(result).toContain("Apply all annotations as one coherent change")
})
