# OpenCode Visual Inspector

An OpenCode v2 plugin for selecting rendered web elements, attaching visual change requests, and sending the complete annotation batch to the active coding session.

## Requirements

- OpenCode v2
- Node.js-compatible plugin runtime
- Chrome, Chromium, Playwright Chromium, or a desktop default browser
- A reachable HTTP or HTTPS application

## Install

Install globally from GitHub:

```sh
opencode2 plugin add 'git+https://github.com/frontendxlab/opencode-annotate.git#main'
```

OpenCode adds the plugin to your global V2 configuration, so `/inspect` is available in every project. Reopen an existing TUI if it was running during installation.

Verify the installation:

```sh
opencode2 plugin list
```

After an npm release, the equivalent registry install is `opencode2 plugin add opencode-visual-inspector`.

For local development, add the package directory to `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["./plugins/opencode-visual-inspector"]
}
```

## Use

Open a known URL:

```text
/inspect http://localhost:5173
```

Or let the plugin detect a running local app:

```text
/inspect
```

The misspelled `/inpect` command is retained as an alias.

If no live app is detected, the command asks the active OpenCode agent to inspect the project, start or locate its web app, and invoke the `visual_inspect` tool with the resulting URL.

In the browser:

1. Choose a device preset or enter a custom viewport size when responsive behavior matters.
2. Hover over the page to outline an element.
3. Select an element and describe the requested change.
4. Change viewports and add more annotations as needed.
5. Select **Send to OpenCode** once to submit the batch.
6. Choose whether the main agent, a subagent with relevant context, or a fresh subagent should implement it.
7. After sending, close the inspector window or clear the sent batch and continue annotating.

Each annotation includes its viewport, a unique CSS selector when possible, an XPath fallback, stable attributes, element text, a bounded HTML snippet, relevant computed styles, geometry, optional source hints, and an optional `::before` or `::after` target. One batch can contain annotations from multiple viewport sizes.

OpenCode V2 subagents start with fresh context. The **Subagent with context** option instructs the main agent to package relevant session and project context into the delegation. The **Fresh subagent** option passes only the annotation batch and context discovered from project files.

## Configuration

Set a default target URL:

```sh
export OPENCODE_INSPECT_URL=http://localhost:5173
```

Set a browser executable when automatic detection is not suitable:

```sh
export OPENCODE_INSPECT_BROWSER=/usr/bin/google-chrome
```

Plugin options can also set the browser:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-visual-inspector",
      "options": {
        "browser": "/usr/bin/chromium"
      }
    }
  ]
}
```

## Limitations

- The proxy handles HTTP resources. Development-server WebSocket features such as hot reload may reconnect directly or remain unavailable in the inspector window.
- Authentication tied to the original hostname may require signing in through the inspector origin.
- Cross-origin child frames cannot be inspected from the parent page.
- Pseudo-elements are selected through their owning DOM element because they are not DOM nodes.

## Development

```sh
bun install
bun run typecheck
bun test
```

The package follows the OpenCode v2 `Plugin.define` API and exposes no V1 compatibility layer.

## Update or remove

```sh
opencode2 plugin update 'git+https://github.com/frontendxlab/opencode-annotate.git#main'
opencode2 plugin remove 'git+https://github.com/frontendxlab/opencode-annotate.git#main'
```
