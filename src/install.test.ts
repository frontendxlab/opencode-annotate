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

test("installer preserves a trailing comma without duplicating it", () => {
  const result = patch('{\n  "model": "x",\n}\n', ["plugins"])
  expect(result.text).not.toContain(",,")
  const parsed = JSON.parse(result.text.replace(/,(\s*[}\]])/g, "$1"))
  expect(parsed.model).toBe("x")
  expect(parsed.plugins).toEqual([pkg])
})

test("installer does not swallow a trailing line comment into the separator", () => {
  const result = patch('{\n  "model": "x"\n  // note\n}\n', ["plugins"])
  expect(result.text).toContain("// note")
  expect(result.text).not.toContain("// note,")
  expect(result.text).not.toContain(",,\n  // note")
})

test("installer ignores a package name that only appears in a comment", () => {
  const result = patch(`{\n  // ${pkg}\n  "plugins": []\n}\n`, ["plugins"])
  expect(result.text).toContain(`// ${pkg}`)
  expect(result.text).toContain(`"plugins": [\n    "${pkg}"\n  ]`)
})

test("installer keeps JSONC valid across comment and array styles", () => {
  const result = patch('{\n  /* block\n     comment */\n  "plugins": [\n    // keep\n  ],\n}\n', ["plugins"])
  expect(result.text).toContain("/* block")
  expect(result.text).toContain("// keep")
  expect(result.text).toContain(`"${pkg}"`)
  const stripped = result.text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "").replace(/,(\s*[}\]])/g, "$1")
  expect(JSON.parse(stripped).plugins).toEqual([pkg])
})

test("installer refuses to emit invalid JSONC", () => {
  expect(() => patch("{ not valid", ["plugins"])).toThrow()
  expect(() => patch("[]", ["plugins"])).toThrow("root object")
})
