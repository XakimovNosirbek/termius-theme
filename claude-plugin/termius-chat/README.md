# termius-chat

A Claude Code plugin that makes the chat in VS Code (and Claude Code Desktop) easier to scan, in the colours of the [Termius Theme](../../README.md).

## What it changes

| Where | What you see |
| --- | --- |
| Your prompts | `❯` and your text in Termius green, in a green frame |
| Tool rows | A coloured frame and icon by what the call does; the row's own IN / OUT and file links still open in the editor |
| SQL | `sqlcmd -Q "…"` and SQL MCP queries shown highlighted as SQL |
| Requests | `curl` / `Invoke-WebRequest` / WebFetch show `METHOD  URL`; `ssh` / `scp` show the host |
| Read | The file's text highlighted by its extension, with line numbers |
| Diagrams | ```` ```pipeline ```` and ```` ```mermaid ```` (flowchart, sequence) blocks drawn as coloured flows |
| Above the prompt | The last turn's time and tool counts by kind |

Icons: 🗄 SQL · 🌐 network · 🔐 SSH · 🐙 GitHub · 🔀 git · 🦀 Rust · 🟣 .NET · 💙 Flutter · 📦 Node · 🐍 Python · 🐳 Docker · 🔎 search · 📁 files · ⏲ wait · 🖼 image · 📝 Markdown · ⚙ config · 💾 write · 🖱 click · 📸 screenshot · 🧪 script · 🧭 browse · 🤖 agent · 🧩 skill · ✗ error · ⏳ running.

### Pipeline syntax

````
```pipeline Optional title
Client -> API -> Queue [ok] -> DB [err]
Worker -(retry 3x)-> API [warn]
```
````

One flow per line. `[ok]`, `[err]`, `[warn]` and `[wait]` mark a step's state; `-(label)->` puts a label on an arrow.

## Install

In a Claude Code terminal session:

```
/plugin install termius-chat --marketplace XakimovNosirbek/termius-theme
```

Answer `y` to add the marketplace, then pick a scope.

## Limits

- VS Code labels every plugin-drawn row with "From the termius-chat plugin". The extension adds that mark itself and a plugin cannot remove it.
- VS Code stacks a plugin's elements vertically, so icons sit inline in text rather than beside the tool's own header.
- Colours are tuned for dark themes.

## License

MIT
