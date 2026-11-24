import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { TurnStats } from '../types'

// Termius Dark palette (same values as the Termius Theme extension), plus a few hues for
// the kinds of work found in this machine's 988 sessions (tool mix, shell verbs, file types).
const C = {
  fg: '#e2e3e8',
  green: '#21b568',
  greenCard: '#12302b',
  red: '#ff7375',
  yellow: '#fdc47d',
  orange: '#ff9b6a',
  magenta: '#ff7dc5',
  purple: '#b48cff',
  cyan: '#44a7ff',
  sky: '#6fd3ff',
  teal: '#3ed7be',
  silver: '#c9d1e8',
  muted: '#8d91a5',
} as const

type Look = { color: string; tint: string; icon: string }
const look = (color: string, tint: string, icon: string): Look => ({ color, tint, icon })

// ---- broad kinds (the band above the prompt counts these) ----
type KindName = 'shell' | 'edit' | 'read' | 'browser' | 'agent' | 'mcp' | 'other'
const KINDS: Record<KindName, Look> = {
  shell: look(C.yellow, '#2b2626', '⚡'),
  edit: look(C.magenta, '#2b1a30', '✏'),
  read: look(C.cyan, '#13243c', '📄'),
  browser: look(C.sky, '#102a38', '🧭'),
  agent: look(C.teal, '#10302f', '🤖'),
  mcp: look(C.green, '#12302b', '🔌'),
  other: look(C.muted, '#1c2033', '•'),
}
const ORDER: KindName[] = ['shell', 'edit', 'read', 'browser', 'agent', 'mcp', 'other']

// ---- precise looks for a single row ----
const L = {
  error: look(C.red, '#2e1a24', '✗'),
  // shell, by what the command does
  sql: look(C.cyan, '#132640', '🗄'),
  net: look(C.sky, '#102a38', '🌐'),
  ssh: look(C.purple, '#231d3a', '🔐'),
  github: look(C.silver, '#22263a', '🐙'),
  git: look(C.orange, '#2e211d', '🔀'),
  rust: look(C.orange, '#2e1f1a', '🦀'),
  dotnet: look(C.purple, '#231d3a', '🟣'),
  flutter: look(C.cyan, '#12243a', '💙'),
  node: look(C.green, '#12302b', '📦'),
  python: look(C.yellow, '#2b2a1e', '🐍'),
  docker: look(C.cyan, '#12243a', '🐳'),
  search: look(C.cyan, '#13243c', '🔎'),
  files: look(C.yellow, '#2b2626', '📁'),
  remove: look(C.orange, '#2e211d', '🗑'),
  wait: look(C.muted, '#1c2033', '⏲'),
  // files, by type
  image: look(C.magenta, '#2b1a30', '🖼'),
  markdown: look(C.teal, '#10302f', '📝'),
  config: look(C.yellow, '#2b2a1e', '⚙'),
  // other tools
  write: look(C.magenta, '#2b1a30', '💾'),
  webSearch: look(C.sky, '#102a38', '🔭'),
  message: look(C.teal, '#10302f', '💬'),
  skill: look(C.teal, '#10302f', '🧩'),
  toolSearch: look(C.muted, '#1c2033', '🧰'),
  stop: look(C.orange, '#2e211d', '⏹'),
  monitor: look(C.yellow, '#2b2626', '📡'),
  ask: look(C.yellow, '#2b2a1e', '❓'),
  workflow: look(C.teal, '#10302f', '🕸'),
  artifact: look(C.magenta, '#2b1a30', '📰'),
  text: look(C.green, '#12302b', '🔤'),
  jira: look(C.cyan, '#13243c', '🎫'),
  gitlab: look(C.orange, '#2e211d', '🦊'),
  miro: look(C.yellow, '#2b2a1e', '🟨'),
  click: look(C.sky, '#102a38', '🖱'),
  shot: look(C.magenta, '#2b1a30', '📸'),
  script: look(C.purple, '#231d3a', '🧪'),
  navigate: look(C.sky, '#102a38', '🧭'),
} satisfies Record<string, Look>

const SURFACES = new Set(['vscode', 'desktop'])

const isBrowser = (t: string) => /chrome|browser|devtools|playwright/.test(t)

function kindOf(tool: string): KindName {
  const t = tool.toLowerCase()
  if (tool === 'Bash' || tool === 'PowerShell' || tool === 'Monitor') return 'shell'
  if (tool === 'Edit' || tool === 'Write' || tool === 'NotebookEdit') return 'edit'
  if (tool === 'Read' || tool === 'Grep' || tool === 'Glob' || tool === 'LSP' || tool === 'WebFetch' || tool === 'WebSearch') return 'read'
  if (t.startsWith('mcp__') && isBrowser(t)) return 'browser'
  if (tool === 'Agent' || tool === 'Skill' || tool === 'Workflow' || tool === 'SendMessage' || tool === 'ListAgents') return 'agent'
  if (t.startsWith('mcp__')) return 'mcp'
  return 'other'
}

type Rec = Record<string, unknown>
const rec = (v: unknown): Rec | undefined => (v !== null && typeof v === 'object' ? (v as Rec) : undefined)
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)
const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined)

const SQL_TEXT = /^\s*(select|with|insert|update|delete|merge|create|alter|drop|exec|declare|use)\b/i

function fileLook(path: string, fallback: Look): Look {
  const ext = (path.match(/\.[a-z0-9]+$/i)?.[0] ?? '').toLowerCase()
  if (/^\.(png|jpe?g|gif|webp|svg|ico|bmp)$/.test(ext)) return L.image
  if (/^\.(md|mdx|txt)$/.test(ext)) return L.markdown
  if (/^\.(ya?ml|json|toml|ini|env|props|csproj|config|xml)$/.test(ext)) return L.config
  if (ext === '.rs') return L.rust
  if (ext === '.cs') return L.dotnet
  if (ext === '.dart') return L.flutter
  if (ext === '.py') return L.python
  if (ext === '.sql') return L.sql
  if (/^\.(ts|tsx|js|jsx|mjs|cjs|astro|vue)$/.test(ext)) return { ...fallback, icon: ext.startsWith('.t') ? '🔷' : '🟨' }
  return fallback
}

/** What a row shows besides the engine's own row: highlighted SQL, or a one-line chip. */
type Detail = { look: Look; sql?: string; chip?: string }

function shellDetail(command: string): Detail | undefined {
  // `rtk` is a transparent proxy here: classify the real command behind it.
  const c = command.replace(/^\s*rtk\s+(proxy\s+)?/i, '')
  const lc = c.toLowerCase()

  if (/\b(sqlcmd|psql|sqlite3|mongosh|mysql|invoke-sqlcmd)\b/.test(lc)) {
    const q = c.match(/\s-[Qq]\s+"((?:[^"\\]|\\.)+)"/) ?? c.match(/\s-[Qq]\s+'([^']+)'/) ?? c.match(/\s-c\s+"((?:[^"\\]|\\.)+)"/)
    return { look: L.sql, sql: q?.[1]?.replace(/\\"/g, '"') }
  }
  const url = c.match(/https?:\/\/[^\s"'`)]+/)?.[0]
  if (/\b(curl|wget|invoke-webrequest|invoke-restmethod|iwr|irm|grpcurl|httpie)\b/.test(lc)) {
    const method = (c.match(/\s-X\s*([A-Z]+)/)?.[1] ?? c.match(/-Method\s+(\w+)/i)?.[1] ?? (/\s(-d|--data|--json)\b/.test(c) ? 'POST' : 'GET')).toUpperCase()
    return { look: L.net, chip: url ? `${method}  ${url}` : undefined }
  }
  if (/(^|[|&;]\s*)(ssh|scp)\s/.test(lc)) {
    const host = c.match(/\b(?:ssh|scp)\s+(?:-\S+\s+(?:\S+\s+)?)*([\w.\-]+@[\w.\-]+|[\w.\-]+)/)?.[1]
    return { look: L.ssh, chip: host ? `→ ${host}` : undefined }
  }
  if (/(^|[|&;(]\s*)gh\s/.test(lc)) return { look: L.github }
  if (/(^|[|&;(]\s*)git\s/.test(lc)) return { look: L.git }
  if (/\b(cargo|rustup|rustc)\b/.test(lc)) return { look: L.rust }
  if (/\b(dotnet|msbuild)\b/.test(lc)) return { look: L.dotnet }
  if (/\b(flutter|dart)\b/.test(lc)) return { look: L.flutter }
  if (/\b(docker|docker-compose|podman|kubectl)\b/.test(lc)) return { look: L.docker }
  if (/\b(npm|npx|node|pnpm|yarn|bun)\b/.test(lc)) return { look: L.node }
  if (/\b(python3?|py|pip|uv|pytest)\b/.test(lc)) return { look: L.python }
  if (/^\s*(sleep|until|timeout|start-sleep)\b/.test(lc)) return { look: L.wait }
  if (/^\s*(rm|remove-item|rmdir|del)\b/.test(lc)) return { look: L.remove }
  if (/^\s*(grep|rg|find|select-string|wc)\b/.test(lc)) return { look: L.search }
  if (/^\s*(cat|head|tail|less|get-content|sed|awk)\b/.test(lc)) return { look: L.search, chip: undefined }
  if (/^\s*(ls|dir|mkdir|cp|mv|get-childitem|copy-item|move-item|new-item|cd|set-location)\b/.test(lc)) return { look: L.files }
  return undefined
}

function detailOf(tool: string, input: Rec): Detail {
  const t = tool.toLowerCase()

  if (tool === 'Bash' || tool === 'PowerShell') return shellDetail(str(input.command) ?? '') ?? { look: KINDS.shell }

  if (tool === 'Read') return { look: fileLook(str(input.file_path) ?? '', KINDS.read) }
  if (tool === 'Edit' || tool === 'NotebookEdit') return { look: fileLook(str(input.file_path) ?? str(input.notebook_path) ?? '', KINDS.edit) }
  if (tool === 'Write') return { look: fileLook(str(input.file_path) ?? '', L.write) }
  if (tool === 'Grep' || tool === 'Glob') return { look: L.search }
  if (tool === 'WebFetch') return { look: L.net, chip: str(input.url) }
  if (tool === 'WebSearch') return { look: L.webSearch, chip: str(input.query) }
  if (tool === 'SendMessage' || tool === 'ListAgents') return { look: L.message }
  if (tool === 'Skill') return { look: L.skill, chip: str(input.skill) }
  if (tool === 'ToolSearch') return { look: L.toolSearch }
  if (tool === 'TaskStop') return { look: L.stop }
  if (tool === 'Monitor') return { look: L.monitor }
  if (tool === 'AskUserQuestion') return { look: L.ask }
  if (tool === 'Workflow') return { look: L.workflow }
  if (tool === 'Artifact' || tool === 'ArtifactData') return { look: L.artifact }

  if (t.startsWith('mcp__')) {
    const sql = str(input.query) ?? str(input.sql)
    if (t.includes('sql') || (sql !== undefined && SQL_TEXT.test(sql))) return { look: L.sql, sql }
    if (t.includes('jira')) return { look: L.jira }
    if (t.includes('gitlab')) return { look: L.gitlab }
    if (t.includes('miro')) return { look: L.miro }
    if (t.includes('bitg') || t.includes('convert_text')) return { look: L.text }
    if (isBrowser(t)) {
      if (/screenshot|screencast|snapshot|gif/.test(t)) return { look: L.shot }
      if (/evaluate|javascript|script/.test(t)) return { look: L.script }
      if (/click|fill|type|press|hover|drag|form|upload|computer|find|select/.test(t)) return { look: L.click }
      return { look: L.navigate, chip: str(input.url) }
    }
    return { look: KINDS.mcp }
  }
  return { look: KINDS[kindOf(tool)] }
}

/** Keep the first `max` lines; say how many were left out. */
function clip(text: string, max: number): { source: string; more: number } {
  const lines = text.replace(/\s+$/, '').split('\n')
  if (lines.length <= max) return { source: lines.join('\n'), more: 0 }
  return { source: lines.slice(0, max).join('\n'), more: lines.length - max }
}

// ---- diagrams in replies ----
type DiagramNode = { id: string; label: string; status?: keyof typeof STATUS }
type Step = { node: DiagramNode; edge?: string } // edge: label on the arrow INTO this node
type Part = { kind: 'md'; text: string } | { kind: 'pipeline' | 'mermaid'; body: string; title?: string }

const STATUS = {
  ok: { color: C.green, icon: '✅' },
  err: { color: C.red, icon: '❌' },
  warn: { color: C.yellow, icon: '⚠' },
  wait: { color: C.muted, icon: '⏳' },
} as const

const NODE_COLORS = [C.cyan, C.magenta, C.yellow, C.teal, C.purple, C.orange, C.sky, C.green]
function nodeColor(id: string): string {
  let h = 0
  for (const ch of id.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return NODE_COLORS[h % NODE_COLORS.length] ?? C.cyan
}

function splitDiagrams(text: string): Part[] {
  const parts: Part[] = []
  const re = /```(pipeline|mermaid)([^\n]*)\n([\s\S]*?)```/g
  let at = 0
  for (let m = re.exec(text); m !== null; m = re.exec(text)) {
    parts.push({ kind: 'md', text: text.slice(at, m.index) })
    const title = (m[2] ?? '').trim()
    parts.push({ kind: m[1] === 'pipeline' ? 'pipeline' : 'mermaid', body: m[3] ?? '', title: title || undefined })
    at = m.index + m[0].length
  }
  parts.push({ kind: 'md', text: text.slice(at) })
  return parts
}

function makeNode(raw: string): DiagramNode {
  let label = raw.trim()
  let status: DiagramNode['status']
  const st = label.match(/\s*\[(ok|err|warn|wait)\]\s*$/i)
  if (st) {
    status = (st[1] ?? '').toLowerCase() as DiagramNode['status']
    label = label.slice(0, st.index).trim()
  }
  return { id: label, label, status }
}

/** One flow per line: `A -> B -> C [ok]`; an arrow label as `A -(label)-> B`. */
function parsePipeline(body: string): Step[][] {
  return body
    .split('\n')
    .map(l => l.trim())
    .filter(l => l !== '' && !l.startsWith('#') && !l.startsWith('%%'))
    .map(line => {
      const tokens = line.split(/\s*(-\([^)]*\)->|->|→|=>)\s*/)
      const steps: Step[] = []
      let edge: string | undefined
      tokens.forEach((tok, i) => {
        if (i % 2 === 1) {
          edge = tok.match(/^-\((.*)\)->$/)?.[1]
          return
        }
        if (tok.trim() !== '') steps.push({ node: makeNode(tok), edge })
        edge = undefined
      })
      return steps
    })
    .filter(r => r.length > 0)
}

const SHAPE = /^([\w.\-]+)\s*(?:\(\(|\[\(|\[\[|\{\{|\[\/|\[|\(|\{|>)\s*"?([^"\])}]*?)"?\s*(?:\)\)|\)\]|\]\]|\}\}|\/\]|\]|\)|\})?\s*$/

/** Mermaid flowchart/graph edges and sequenceDiagram messages, as `[A] ─label─▶ [B]` rows. */
function parseMermaid(body: string): Step[][] {
  const lines = body.split('\n').map(l => l.trim()).filter(l => l !== '' && !l.startsWith('%%'))
  const head = (lines[0] ?? '').toLowerCase()
  const labels = new Map<string, string>()
  const node = (raw: string): DiagramNode => {
    const m = raw.trim().match(SHAPE)
    const id = m?.[1] ?? raw.trim()
    if (m?.[2]) labels.set(id, m[2].trim())
    return { id, label: labels.get(id) ?? id }
  }
  const rows: Step[][] = []

  if (head.startsWith('sequencediagram')) {
    for (const l of lines.slice(1)) {
      const p = l.match(/^(?:participant|actor)\s+([\w.\-]+)(?:\s+as\s+(.+))?$/i)
      if (p) {
        labels.set(p[1] ?? '', (p[2] ?? p[1] ?? '').trim())
        continue
      }
      const msg = l.match(/^([\w.\-]+)\s*(-{1,2}>>?|-{1,2}x|-{1,2}\))[+-]?\s*([\w.\-]+)\s*:\s*(.*)$/)
      if (msg) {
        const from = msg[1] ?? ''
        const to = msg[3] ?? ''
        rows.push([
          { node: { id: from, label: labels.get(from) ?? from } },
          { node: { id: to, label: labels.get(to) ?? to }, edge: msg[4] },
        ])
      }
    }
    return rows
  }

  if (/^(flowchart|graph)\b/.test(head)) {
    for (const raw of lines.slice(1)) {
      if (/^(subgraph|end|style|classDef|class|linkStyle|click|direction)\b/.test(raw)) continue
      const l = raw.replace(/--\s+([^->|][^>]*?)\s+-->/g, '-->|$1|').replace(/==\s+([^=>|][^>]*?)\s+==>/g, '==>|$1|')
      const tokens = l.split(/\s*(-\.->|-->|==>|---|-\.-)\s*(?:\|([^|]*)\|)?\s*/)
      if (tokens.length < 4) {
        node(l) // a lone node definition: remember its label
        continue
      }
      const steps: Step[] = []
      for (let i = 0; i < tokens.length; i += 3) {
        const tok = tokens[i]
        if (tok === undefined || tok.trim() === '') continue
        steps.push({ node: node(tok), edge: i > 0 ? tokens[i - 1] || undefined : undefined })
      }
      if (steps.length > 1) rows.push(steps)
    }
    // labels defined after first use: refresh
    for (const r of rows) for (const s of r) s.node.label = labels.get(s.node.id) ?? s.node.label
  }
  return rows
}

const emptyCounts = (): Record<KindName, number> => ({ shell: 0, edit: 0, read: 0, browser: 0, agent: 0, mcp: 0, other: 0 })
const last = atom({ plugin: 'termius-chat', key: 'last' } as const, null)
const isHidden = atom({ plugin: 'termius-chat', key: 'isHidden' } as const, false)

export const register: Register = on => {
  let startedAt = 0
  let counts = emptyCounts()

  // Counting must never hold up a prompt or a tool call: failures are swallowed.
  on('prompt.submit', async ($, e, next) => {
    try {
      startedAt = await $.clock.now()
      counts = emptyCounts()
    } catch {
      startedAt = 0
    }

    return next(e)
  })

  on('tool.call', ($, e, next) => {
    try {
      counts[kindOf(String(e.tool))] += 1
    } catch {
      // ignore
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    try {
      const seconds = startedAt > 0 ? Math.round(((await $.clock.now()) - startedAt) / 1000) : 0
      const stats: TurnStats = { seconds, ...counts }
      await update($, last, () => stats)
    } catch {
      // ignore
    }

    return next(e)
  })

  // The person's own prompt: Termius-green text on a green-tinted card, marked by an icon only.
  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    const { origin, from, text } = e.props
    // VS Code stamps its prompts with its own origin kind, so exclude what is NOT the person instead.
    const notThePerson = origin.kind === 'task-notification' || from !== undefined
    if (!SURFACES.has(e.surface) || notThePerson || text.trim() === '') {
      return next(e)
    }
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box borderStyle="round" borderColor={C.green} paddingX={1}>
        <Text color={C.green} weight="medium">
          <Text color={C.green} bold>❯ </Text>
          {text}
        </Text>
      </Box>
    )
  })

  // Tool rows: the engine's own row stays (IN / OUT and file paths open in the editor),
  // framed in a colour and icon picked from what the call does. SQL, a request's method and
  // URL, an SSH host and read files are also shown in the chat, highlighted.
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    if (!SURFACES.has(e.surface)) {
      return next(e)
    }
    const { Box, Text, Code } = $.ui.resolve(e)
    const { tool, isRunning, isErrored } = e.props
    const input = rec(e.props.input) ?? {}
    const output = rec(e.props.output)
    const d = detailOf(tool, input)
    const lk = isErrored ? L.error : d.look
    const icon = isRunning ? '⏳' : lk.icon
    const maxLines = e.props.isExpanded ? 400 : 30

    const extras = []
    if (d.chip !== undefined && d.chip.trim() !== '') {
      extras.push(<Text key="chip" color={lk.color} mono wrap="truncate-end">{icon} {d.chip}</Text>)
    }
    if (!isErrored && d.sql !== undefined && d.sql.trim() !== '') {
      if (extras.length === 0) extras.push(<Text key="sqlhead" color={lk.color} bold>{icon} SQL</Text>)
      extras.push(<Code key="sql" source={d.sql.trim()} language="sql" />)
    }
    if (!isErrored && tool === 'Read') {
      const file = rec(output?.file)
      const content = str(file?.content)
      if (content !== undefined && content.trim() !== '') {
        const { source, more } = clip(content, maxLines)
        extras.push(<Code key="file" source={source} path={str(input.file_path) ?? ''} startLine={num(file?.startLine) ?? 1} />)
        if (more > 0) extras.push(<Text key="more" color={C.muted} size="caption">… +{more}</Text>)
      }
    }

    const row = await next(e)

    return (
      <Box flexDirection="column" borderStyle="round" borderColor={lk.color} paddingX={1}>
        {row}
        {extras}
      </Box>
    )
  })

  // Replies: ```pipeline and ```mermaid blocks become coloured diagrams right in the chat.
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const { text, isSummary } = e.props
    if (!SURFACES.has(e.surface) || isSummary || !/```(pipeline|mermaid)/.test(text)) {
      return next(e)
    }
    const { Box, Text, Markdown, Code } = $.ui.resolve(e)
    const parts = splitDiagrams(text)

    const span = (n: DiagramNode, key: string) => {
      const st = n.status ? STATUS[n.status] : undefined
      const c = st?.color ?? nodeColor(n.id)
      return (
        <Text key={key} color={c} bold>
          {` ${st ? `${st.icon} ` : ''}${n.label} `}
        </Text>
      )
    }
    const arrow = (label: string | undefined, key: string) => (
      <Text key={key} color={C.muted}>{label ? ` ─ ${label} ─▶ ` : ' ─▶ '}</Text>
    )

    return (
      <Box flexDirection="column">
        {parts.map((p, i) => {
          if (p.kind === 'md') return p.text.trim() === '' ? null : <Markdown key={`m${i}`} text={p.text} />
          const rows = p.kind === 'pipeline' ? parsePipeline(p.body) : parseMermaid(p.body)
          if (rows.length === 0) return <Code key={`c${i}`} source={p.body} language={p.kind === 'mermaid' ? 'mermaid' : undefined} />
          return (
            <Box key={`d${i}`} flexDirection="column" borderStyle="round" borderColor={C.teal} paddingX={1}>
              {p.title ? <Text color={C.teal} bold>◆ {p.title}</Text> : null}
              {rows.map((r, j) => (
                <Text key={`r${j}`}>
                  {r.flatMap((step, k) => {
                    const out = [span(step.node, `n${k}`)]
                    if (k < r.length - 1) out.push(arrow(r[k + 1]?.edge, `a${k}`))
                    return out
                  })}
                </Text>
              ))}
            </Box>
          )
        })}
      </Box>
    )
  })

  // Band above the prompt: what the last turn did, by kind, icons and counts only.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const stats = await read($, last)
    if (!SURFACES.has(e.surface) || e.props.hasSurvey || stats === null || (await read($, isHidden))) {
      return next(e)
    }
    const { Box, Button, Text } = $.ui.resolve(e)
    const used = ORDER.filter(k => (stats[k] ?? 0) > 0)

    return (
      <Box flexDirection="row" gap={2} alignItems="center" borderStyle="round" borderColor={C.green} paddingX={1}>
        <Text color={C.teal} bold>⏱ {stats.seconds}s</Text>
        {used.map(k => (
          <Text key={k} color={KINDS[k].color} bold>
            {KINDS[k].icon} {stats[k]}
          </Text>
        ))}
        <Button key="hide" label="✕" onPress={() => update($, isHidden, () => true)} />
      </Box>
    )
  })
}
