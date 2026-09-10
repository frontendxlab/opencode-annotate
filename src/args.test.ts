import { describe, expect, test } from "bun:test"
import { parse, supported } from "./args.js"

describe("inspect arguments", () => {
  test("parses URL, model, mode, and context", () => {
    expect(parse("http://localhost:3000 --model openai/gpt-5.6-luna --mode quick --context:fork")).toEqual({
      url: "http://localhost:3000",
      model: { providerID: "openai", modelID: "gpt-5.6-luna" },
      mode: "quick",
      context: "fork",
      screenshot: false,
    })
  })

  test("parses the screenshot opt-in and keeps it off by default", () => {
    expect(parse("http://localhost:3000").screenshot).toBe(false)
    expect(parse("http://localhost:3000 --screenshot").screenshot).toBe(true)
    expect(parse("http://localhost:3000 --screenshot --no-screenshot").screenshot).toBe(false)
    expect(() => parse("--screenshot --screenshot")).toThrow("Duplicate --screenshot")
  })

  test("warns when a model changes the current session", () => {
    expect(parse("--model anthropic/claude-sonnet-4-6").warning).toContain("current session model")
  })

  test("rejects malformed or duplicate options", () => {
    expect(() => parse("--model gpt-5")).toThrow("provider/model-id")
    expect(() => parse("--mode quick --mode batch")).toThrow("Duplicate --mode")
    expect(() => parse("--context other")).toThrow("Invalid --context value")
  })

  test("rejects options an adapter cannot honour", () => {
    const model = parse("--model openai/gpt-5.6-luna")
    const fork = parse("--context=fork")
    expect(() => supported(model, { model: false, fork: true })).toThrow("--model is not supported")
    expect(() => supported(fork, { model: true, fork: false })).toThrow("--context=fork is not supported")
    expect(supported(model, { model: true, fork: true })).toBe(model)
    expect(supported(fork, { model: true, fork: true })).toBe(fork)
    expect(() => supported(parse("http://localhost:3000"), { model: false, fork: false })).not.toThrow()
  })
})
