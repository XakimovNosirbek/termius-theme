export type TurnStats = {
  seconds: number
  shell: number
  edit: number
  read: number
  browser: number
  agent: number
  mcp: number
  other: number
}

declare module 'claude-code' {
  interface PluginState {
    'termius-chat': { last: TurnStats | null; isHidden: boolean }
  }
}
