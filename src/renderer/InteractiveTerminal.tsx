import { useEffect, useRef } from 'react'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'

type Theme = 'light' | 'dark'
type CommandSender = (command: string) => void

function getTheme(theme: Theme) {
  if (theme === 'light') {
    return {
      background: '#ffffff', foreground: '#24272d', cursor: '#2563eb', selectionBackground: '#bfdbfe',
      black: '#24272d', red: '#c2413b', green: '#16803c', yellow: '#a16207', blue: '#2563eb', magenta: '#9333a6', cyan: '#087e8b', white: '#e7e9ed',
      brightBlack: '#6b7280', brightRed: '#dc2626', brightGreen: '#16a34a', brightYellow: '#ca8a04', brightBlue: '#3b82f6', brightMagenta: '#a855f7', brightCyan: '#0891b2', brightWhite: '#ffffff',
    }
  }
  return {
    background: '#17191f', foreground: '#e7e9ee', cursor: '#7aa2f7', selectionBackground: '#34415e',
    black: '#15171c', red: '#f7768e', green: '#9ece6a', yellow: '#e0af68', blue: '#7aa2f7', magenta: '#bb9af7', cyan: '#7dcfff', white: '#a9b1d6',
    brightBlack: '#414868', brightRed: '#ff899d', brightGreen: '#b9e685', brightYellow: '#eac27d', brightBlue: '#8db0ff', brightMagenta: '#c7a8ff', brightCyan: '#8be0ff', brightWhite: '#c0caf5',
  }
}

export function InteractiveTerminal({ theme, onReady }: { theme: Theme; onReady: (sender: CommandSender | null) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const pendingEventsRef = useRef<Array<{ sessionId: string; data: string }>>([])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.25,
      scrollback: 5000,
      theme: getTheme(theme),
    })
    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(container)
    terminalRef.current = terminal

    const stopData = window.terminalApi.onData(({ sessionId, data }) => {
      if (sessionId === sessionIdRef.current) terminal.write(data)
      else pendingEventsRef.current.push({ sessionId, data })
    })
    const stopExit = window.terminalApi.onExit(({ sessionId, exitCode }) => {
      if (sessionId === sessionIdRef.current) terminal.write(`\r\n[process exited with code ${exitCode}]\r\n`)
    })
    const dataSubscription = terminal.onData((data) => {
      const sessionId = sessionIdRef.current
      if (sessionId) window.terminalApi.write(sessionId, data)
    })
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit()
        const sessionId = sessionIdRef.current
        if (sessionId) window.terminalApi.resize(sessionId, terminal.cols, terminal.rows)
      } catch {
        // The panel can briefly have zero size while the window is being laid out.
      }
    })
    resizeObserver.observe(container)

    let disposed = false
    void window.terminalApi.create().then((sessionId) => {
      if (disposed) {
        window.terminalApi.kill(sessionId)
        return
      }
      sessionIdRef.current = sessionId
      for (const event of pendingEventsRef.current) {
        if (event.sessionId === sessionId) terminal.write(event.data)
      }
      pendingEventsRef.current = []
      onReady((command) => {
        const input = command.replace(/\r?\n/g, '\r')
        window.terminalApi.write(sessionId, `${input}\r`)
      })
      requestAnimationFrame(() => {
        try {
          fitAddon.fit()
          window.terminalApi.resize(sessionId, terminal.cols, terminal.rows)
          terminal.focus()
        } catch {
          // Wait for the first non-zero layout before sizing the PTY.
        }
      })
    }).catch((error: unknown) => {
      terminal.write(`Failed to start shell: ${error instanceof Error ? error.message : String(error)}\r\n`)
    })

    return () => {
      disposed = true
      onReady(null)
      stopData()
      stopExit()
      dataSubscription.dispose()
      resizeObserver.disconnect()
      if (sessionIdRef.current) window.terminalApi.kill(sessionIdRef.current)
      sessionIdRef.current = null
      terminal.dispose()
      terminalRef.current = null
      pendingEventsRef.current = []
    }
  }, [])

  useEffect(() => {
    if (terminalRef.current) terminalRef.current.options.theme = getTheme(theme)
  }, [theme])

  return <div className="terminal-host" ref={containerRef} />
}
