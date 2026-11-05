import { randomUUID } from 'node:crypto'
import { existsSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { spawn, type IPty } from 'node-pty'
import type { BrowserWindow } from 'electron'
import type { TerminalDataEvent, TerminalExitEvent } from '../shared/terminal-api'

interface TerminalSession {
  process: IPty
}

const MAX_SESSIONS = 8
const DEFAULT_COLS = 80
const DEFAULT_ROWS = 24

export class TerminalManager {
  private readonly sessions = new Map<string, TerminalSession>()

  constructor(private readonly getWindow: () => BrowserWindow | null) {}

  create(requestedCwd?: string): string {
    if (this.sessions.size >= MAX_SESSIONS) {
      throw new Error(`最多同时运行 ${MAX_SESSIONS} 个终端会话。`)
    }

    const cwd = this.resolveCwd(requestedCwd)
    const shellPath = process.env.SHELL || '/bin/zsh'
    const sessionId = randomUUID()
    const ptyProcess = spawn(shellPath, ['-l'], {
      name: 'xterm-256color',
      cols: DEFAULT_COLS,
      rows: DEFAULT_ROWS,
      cwd,
      env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' },
      encoding: 'utf8',
    })

    ptyProcess.onData((data) => {
      const event: TerminalDataEvent = { sessionId, data }
      this.getWindow()?.webContents.send('terminal:data', event)
    })
    ptyProcess.onExit((event) => {
      this.sessions.delete(sessionId)
      const exitEvent: TerminalExitEvent = {
        sessionId,
        exitCode: event.exitCode,
        ...(event.signal === undefined ? {} : { signal: event.signal }),
      }
      this.getWindow()?.webContents.send('terminal:exit', exitEvent)
    })

    this.sessions.set(sessionId, { process: ptyProcess })
    return sessionId
  }

  write(sessionId: string, data: string): void {
    if (typeof data !== 'string' || data.length > 64 * 1024) return
    this.sessions.get(sessionId)?.process.write(data)
  }

  resize(sessionId: string, cols: number, rows: number): void {
    if (!Number.isInteger(cols) || !Number.isInteger(rows)) return
    if (cols < 2 || cols > 500 || rows < 1 || rows > 300) return
    this.sessions.get(sessionId)?.process.resize(cols, rows)
  }

  kill(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return
    this.sessions.delete(sessionId)
    session.process.kill()
  }

  destroy(): void {
    for (const sessionId of this.sessions.keys()) this.kill(sessionId)
  }

  private resolveCwd(requestedCwd?: string): string {
    const fallback = homedir()
    if (!requestedCwd || !existsSync(requestedCwd)) return fallback
    try {
      return statSync(requestedCwd).isDirectory() ? requestedCwd : fallback
    } catch {
      return fallback
    }
  }
}
