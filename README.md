# OpenCode Visual Inspector

An OpenCode v2 plugin for selecting rendered web elements, attaching visual change requests, and sending the complete annotation batch to the active coding session.

## Requirements

- OpenCode v2
- Node.js-compatible plugin runtime
- Chrome, Chromium, Playwright Chromium, or a desktop default browser
- A reachable HTTP or HTTPS application

## Install

Install from npm after publication:

```sh
opencode2 plugin add opencode-visual-inspector
```

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

1. Hover over the page to outline an element.
2. Select an element and describe the requested change.
3. Add more annotations as needed.
4. Select **Send to OpenCode** once to submit the batch.

Each annotation includes a unique CSS selector when possible, an XPath fallback, stable attributes, element text, a bounded HTML snippet, relevant computed styles, geometry, optional source hints, and an optional `::before` or `::after` target.

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
