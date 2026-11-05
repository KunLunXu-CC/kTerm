import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { TerminalManager } from './terminal-manager'

const currentDir = __dirname
let mainWindow: BrowserWindow | null = null
let terminalManager: TerminalManager

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 640,
    minHeight: 420,
    title: 'kTerm',
    backgroundColor: '#111318',
    webPreferences: {
      preload: join(currentDir, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(join(currentDir, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  terminalManager = new TerminalManager(() => mainWindow)

  ipcMain.handle('terminal:create', (_event, cwd?: string) => terminalManager.create(cwd))
  ipcMain.on('terminal:write', (_event, request: { sessionId: string; data: string }) => {
    if (request && typeof request.sessionId === 'string') {
      terminalManager.write(request.sessionId, request.data)
    }
  })
  ipcMain.on('terminal:resize', (_event, request: { sessionId: string; cols: number; rows: number }) => {
    if (request && typeof request.sessionId === 'string') {
      terminalManager.resize(request.sessionId, request.cols, request.rows)
    }
  })
  ipcMain.on('terminal:kill', (_event, sessionId: unknown) => {
    if (typeof sessionId === 'string') terminalManager.kill(sessionId)
  })

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}).catch((error: unknown) => {
  console.error('Failed to start kTerm:', error)
  app.quit()
})

app.on('before-quit', () => terminalManager?.destroy())
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
