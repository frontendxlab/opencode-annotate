import { expect, test } from "bun:test"
import { patch, pkg, v1pkg } from "../bin/opencode-visual-inspector.mjs"

test("installer adds both adapter keys and remains idempotent", () => {
  const source = '{\n  "plugin": ["old-plugin"],\n  "plugins": ["git+https://github.com/frontendxlab/opencode-annotate.git#main"]\n}\n'
  const first = patch(source, ["plugin", "plugins"])
  const second = patch(first.text, ["plugin", "plugins"])
  expect(first.changes).toHaveLength(2)
  expect(first.text).toContain('"@frontendxlab/opencode-visual-inspector"')
  expect(first.text).not.toContain("git+https://github.com/frontendxlab/opencode-annotate.git#main")
  expect(second.changes).toHaveLength(0)
})

test("installer creates a missing plugin list", () => {
  const result = patch('{\n  "model": "openai/test"\n}\n', ["plugins"])
  expect(result.text).toContain('"plugins": [')
  expect(result.text).toContain('"@frontendxlab/opencode-visual-inspector"')
})

test("installer preserves JSONC comments", () => {
  const result = patch('{\n  // keep this setting\n  "plugins": [],\n}\n', ["plugins"])
  expect(result.text).toContain("// keep this setting")
  expect(result.text).toContain('"@frontendxlab/opencode-visual-inspector"')
})

test("installer creates valid root arrays in an empty config", () => {
  const result = patch(patch("{\n}\n", ["plugin"], v1pkg).text, ["plugins"])
  expect(JSON.parse(result.text)).toEqual({ plugin: [v1pkg], plugins: [pkg] })
})

test("installer preserves project JSONC placement", () => {
  const source = '{\n  // project config\n  "plugins": [],\n}\n'
  const result = patch(source, ["plugins"])
  expect(result.text).toContain("// project config")
  expect(result.text).toContain('"@frontendxlab/opencode-visual-inspector"')
})

test("V1 and V2 use separate package specs", () => {
  expect(v1pkg).toBe(`${pkg}/v1`)
})
