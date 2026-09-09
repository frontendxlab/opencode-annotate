import { expect, test } from "bun:test"
import { prompt } from "./prompt.js"
import type { Batch } from "./types.js"

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
  viewport: { label: "Desktop", width: 1440, height: 900 },
  source: "src/Button.tsx:12",
}

const base = { target: item.page, viewports: [] as Batch["viewports"] }

test("formats all annotations into one implementation request", () => {
  const result = prompt({ ...base, viewports: [item.viewport], delivery: "main", annotations: [item, { ...item, request: "Use less padding", pseudo: null }] } satisfies Batch)
  expect(result).toContain("## Annotation 1")
  expect(result).toContain("## Annotation 2")
  expect(result).toContain("Target: #save::after")
  expect(result).toContain("Source hint: src/Button.tsx:12")
  expect(result).toContain("Viewport: Desktop (1440x900)")
  expect(result).toContain("Requested viewports: Desktop (1440x900)")
  expect(result).toContain("Apply all annotations as one coherent change")
})

test("routes main delivery to the active agent", () => {
  const result = prompt({ ...base, delivery: "main", annotations: [item] } satisfies Batch)
  expect(result).toContain("Implement these annotations directly in the active main agent.")
  expect(result).not.toContain("Delegate")
})

test("routes subagent-context delivery to a briefed subagent", () => {
  const result = prompt({ ...base, delivery: "subagent-context", annotations: [item] } satisfies Batch)
  expect(result).toContain("Do not implement these annotations in the main agent.")
  expect(result).toContain("Delegate the complete task to a subagent")
  expect(result).toContain("explicitly provide it with all relevant current session, project, and annotation context")
  expect(result).toContain("OpenCode subagents start with fresh context")
  expect(result).toContain("The main agent should only coordinate and report the result")
})

test("routes subagent-fresh delivery to a context-free subagent", () => {
  const result = prompt({ ...base, delivery: "subagent-fresh", annotations: [item] } satisfies Batch)
  expect(result).toContain("Do not implement these annotations in the main agent.")
  expect(result).toContain("Delegate the complete task to a fresh subagent using only this annotation batch")
  expect(result).toContain("Do not pass unrelated conversation context")
  expect(result).not.toContain("provide it with all relevant current session")
})
