import { describe, expect, test } from "bun:test"
import { parse } from "./args.js"

describe("inspect arguments", () => {
  test("parses URL, model, mode, and context", () => {
    expect(parse("http://localhost:3000 --model openai/gpt-5.6-luna --mode quick --context:fork")).toEqual({
      url: "http://localhost:3000",
      model: { providerID: "openai", modelID: "gpt-5.6-luna" },
      mode: "quick",
      context: "fork",
    })
  })

  test("warns when a model changes the current session", () => {
    expect(parse("--model anthropic/claude-sonnet-4-6").warning).toContain("current session model")
  })

  test("rejects malformed or duplicate options", () => {
    expect(() => parse("--model gpt-5")).toThrow("provider/model-id")
    expect(() => parse("--mode quick --mode batch")).toThrow("Duplicate --mode")
    expect(() => parse("--context other")).toThrow("Invalid --context value")
  })
})
