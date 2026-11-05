export interface TerminalDataEvent {
  sessionId: string
  data: string
}

export interface TerminalExitEvent {
  sessionId: string
  exitCode: number
  signal?: number
}

export interface TerminalApi {
  create(cwd?: string): Promise<string>
  write(sessionId: string, data: string): void
  resize(sessionId: string, cols: number, rows: number): void
  kill(sessionId: string): void
  onData(listener: (event: TerminalDataEvent) => void): () => void
  onExit(listener: (event: TerminalExitEvent) => void): () => void
}
