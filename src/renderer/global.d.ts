import type { TerminalApi } from '../shared/terminal-api'

declare global {
  interface Window {
    terminalApi: TerminalApi
  }
}

export {}
