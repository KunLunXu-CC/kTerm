import { contextBridge, ipcRenderer } from 'electron'
import type { TerminalApi, TerminalDataEvent, TerminalExitEvent } from '../shared/terminal-api'

const terminalApi: TerminalApi = {
  create: (cwd) => ipcRenderer.invoke('terminal:create', cwd),
  write: (sessionId, data) => ipcRenderer.send('terminal:write', { sessionId, data }),
  resize: (sessionId, cols, rows) => ipcRenderer.send('terminal:resize', { sessionId, cols, rows }),
  kill: (sessionId) => ipcRenderer.send('terminal:kill', sessionId),
  onData: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, data: TerminalDataEvent) => listener(data)
    ipcRenderer.on('terminal:data', handler)
    return () => ipcRenderer.removeListener('terminal:data', handler)
  },
  onExit: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, data: TerminalExitEvent) => listener(data)
    ipcRenderer.on('terminal:exit', handler)
    return () => ipcRenderer.removeListener('terminal:exit', handler)
  },
}

contextBridge.exposeInMainWorld('terminalApi', terminalApi)
