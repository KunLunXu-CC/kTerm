import { useEffect, useRef, useState } from 'react'
import { InteractiveTerminal } from './InteractiveTerminal'

type Appearance = 'system' | 'light' | 'dark'
type CommandSender = (command: string) => void
interface SubmittedCommand {
  id: number
  command: string
}

function readAppearance(): Appearance {
  const saved = localStorage.getItem('kterm.appearance')
  return saved === 'light' || saved === 'dark' ? saved : 'system'
}

function Icon({ name, size = 18 }: { name: 'home' | 'history' | 'settings' | 'search' | 'plus' | 'terminal' | 'send' | 'chevron' | 'more'; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const }
  switch (name) {
    case 'home': return <svg {...common}><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></svg>
    case 'history': return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
    case 'settings': return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.1.9-1.2 2.1-1.4-.5a7.8 7.8 0 0 1-1.7 1l-.3 1.5h-2.4l-.3-1.5a7.8 7.8 0 0 1-1.7-1l-1.4.5L7 16l1.1-.9a8 8 0 0 1 0-2l-1.1-.9 1.2-2.1 1.4.5a7.8 7.8 0 0 1 1.7-1l.3-1.5H14l.3 1.5a7.8 7.8 0 0 1 1.7 1l1.4-.5 1.2 2.1-1.1.9a8 8 0 0 1 0 2Z" /></svg>
    case 'search': return <svg {...common}><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
    case 'plus': return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>
    case 'terminal': return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="3" /><path d="m7 9 3 3-3 3m6 0h4" /></svg>
    case 'send': return <svg {...common}><path d="M12 19V5m-7 7 7-7 7 7" /></svg>
    case 'chevron': return <svg {...common}><path d="m7 10 5 5 5-5" /></svg>
    case 'more': return <svg {...common}><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></svg>
  }
}

export function App() {
  const [appearance, setAppearance] = useState<Appearance>(readAppearance)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [terminalKey, setTerminalKey] = useState(0)
  const [command, setCommand] = useState('')
  const [commands, setCommands] = useState<SubmittedCommand[]>([])
  const [commandSender, setCommandSender] = useState<CommandSender | null>(null)
  const conversationRef = useRef<HTMLDivElement | null>(null)
  const effectiveTheme = appearance === 'system' ? (systemDark ? 'dark' : 'light') : appearance

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setSystemDark(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = effectiveTheme
    localStorage.setItem('kterm.appearance', appearance)
  }, [appearance, effectiveTheme])

  useEffect(() => {
    const conversation = conversationRef.current
    if (conversation) conversation.scrollTo({ top: conversation.scrollHeight, behavior: 'smooth' })
  }, [commands])

  function startNewTerminal() {
    setCommandSender(null)
    setCommands([])
    setCommand('')
    setTerminalKey((value) => value + 1)
  }

  function submitCommand() {
    const nextCommand = command.trimEnd()
    if (!nextCommand.trim() || !commandSender) return
    setCommands((items) => [...items, { id: Date.now() + Math.random(), command: nextCommand }])
    commandSender(nextCommand)
    setCommand('')
  }

  return (
    <main className="desktop-app">
      <nav className="nav-rail" aria-label="主要导航">
        <div className="rail-brand" aria-label="kTerm">k<span>›</span></div>
        <button className="rail-button is-active" type="button" aria-label="终端"><Icon name="home" /></button>
        <button className="rail-button" type="button" aria-label="历史"><Icon name="history" /></button>
        <div className="rail-spacer" />
        <button className="rail-button" type="button" aria-label="设置"><Icon name="settings" /></button>
        <div className="rail-avatar">K</div>
      </nav>

      <aside className="session-sidebar">
        <header className="sidebar-header">
          <button className="workspace-switcher" type="button">kTerm <Icon name="chevron" size={15} /></button>
          <button className="icon-button" type="button" aria-label="搜索会话"><Icon name="search" /></button>
        </header>

        <button className="new-terminal-button" type="button" onClick={startNewTerminal}>
          <Icon name="plus" size={17} /><span>新建终端</span><kbd>⌘N</kbd>
        </button>

        <div className="sidebar-section-label">最近</div>
        <button className="session-row is-selected" type="button">
          <span className="session-glyph"><Icon name="terminal" size={17} /></span>
          <span className="session-copy"><strong>本地终端</strong><small>~</small></span>
          <span className="session-active-dot" />
        </button>

        <div className="sidebar-spacer" />
        <footer className="sidebar-footer">
          <div className="theme-setting-label"><Icon name="settings" size={16} /><span>外观</span></div>
          <select aria-label="外观主题" value={appearance} onChange={(event) => setAppearance(event.target.value as Appearance)}>
            <option value="system">跟随系统</option>
            <option value="dark">深色</option>
            <option value="light">浅色</option>
          </select>
        </footer>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div className="workspace-title"><span className="title-terminal"><Icon name="terminal" size={16} /></span><span>本地终端</span><span className="title-path">· ~/</span></div>
          <div className="workspace-actions">
            <span className="connection-status"><span className="status-dot" />Shell 已连接</span>
            <button className="icon-button" type="button" aria-label="更多选项"><Icon name="more" /></button>
          </div>
        </header>

        <div className="conversation-scroll" ref={conversationRef}>
          <div className="conversation-content">
            {commands.length === 0 ? (
              <section className="welcome-state">
                <div className="welcome-mark"><Icon name="terminal" size={26} /></div>
                <h1>终端已就绪</h1>
                <p>在下方输入命令，结果会显示在这里。</p>
                <div className="suggestion-row">
                  <button type="button" onClick={() => setCommand('pwd')}>查看当前目录 <code>pwd</code></button>
                  <button type="button" onClick={() => setCommand('ls -la')}>列出文件 <code>ls -la</code></button>
                </div>
              </section>
            ) : (
              <div className="command-history" aria-label="命令历史">
                {commands.map((item) => (
                  <article className="command-message" key={item.id}>
                    <div className="message-label"><span className="message-avatar">你</span><span>命令</span></div>
                    <pre className="command-bubble"><code>{item.command}</code></pre>
                  </article>
                ))}
              </div>
            )}

            <section className="terminal-output-card" aria-label="终端输出">
              <header className="output-card-header"><span><span className="output-card-icon"><Icon name="terminal" size={15} /></span>Shell 输出</span><span className="live-label"><span className="status-dot" />实时</span></header>
              <div className="output-card-content">
                <InteractiveTerminal key={terminalKey} theme={effectiveTheme} onReady={(sender) => setCommandSender(() => sender)} />
              </div>
            </section>
          </div>
        </div>

        <footer className="composer-dock">
          <form className="command-composer" onSubmit={(event) => { event.preventDefault(); submitCommand() }}>
            <textarea
              aria-label="输入终端命令"
              placeholder={commandSender ? '输入命令…' : '正在启动 shell…'}
              rows={1}
              value={command}
              disabled={!commandSender}
              onChange={(event) => setCommand(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  submitCommand()
                }
              }}
            />
            <div className="composer-toolbar">
              <div className="composer-context"><span className="context-path"><Icon name="terminal" size={15} /> ~/</span><span className="composer-hint">Enter 运行 · Shift+Enter 换行</span></div>
              <button className="send-button" type="submit" disabled={!commandSender || !command.trim()} aria-label="运行命令"><Icon name="send" size={19} /></button>
            </div>
          </form>
          <p className="composer-footnote">命令将在你的 Mac 本地 shell 中执行</p>
        </footer>
      </section>
    </main>
  )
}
