# kTerm

一个基于 Electron、React、xterm.js 和 node-pty 的 macOS 本地终端 app 骨架。

## 架构

```text
src/renderer/  React 界面、xterm.js 和主题映射
src/preload/   通过 contextBridge 暴露的窄终端 API
src/shared/    主进程与渲染进程共享的类型契约
src/main/      Electron 生命周期、IPC 校验和 node-pty 会话管理
```

终端界面通过 `@xterm/xterm` 绘制，`@xterm/addon-fit` 负责根据容器尺寸调整 PTY 行列；主进程用 `node-pty` 启动登录 shell。Renderer 不启用 Node 集成，只能调用 preload 暴露的创建、输入、缩放、关闭和事件订阅方法。

外观初始支持浅色、深色和跟随系统。CSS 语义变量控制 app 界面，单独的 xterm `ITheme` 映射负责终端调色板。

## 本地运行

要求 Node.js 20+ 和 pnpm。

```bash
pnpm install
pnpm rebuild:native
pnpm dev
```

`node-pty` 是原生模块，需要针对当前 Electron 版本重建。首次 scaffold 尚未生成 lockfile；依赖安装后提交 `pnpm-lock.yaml`。
