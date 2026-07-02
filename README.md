# eSpeak

AI 英语口语练习 App（Android 为主）。中文 UI，情景对话 + 表达错误复习。

## 环境要求

- Node.js 20+
- pnpm 9+
- Android Studio（真机打包）+ Java 21（JBR）

## 快速开始

```bash
pnpm install
pnpm dev          # 浏览器 http://localhost:5173 （375px 预览）
pnpm lint         # TypeScript 检查
```

## Key 配置

在 **设置** 页配置：

| Key | 用途 |
|-----|------|
| DeepSeek Key | AI 对话（必须） |
| OpenAI Key | Whisper 语音识别（必须，与 DeepSeek 分开） |
| Edge TTS | 无需 Key |

开发时可开启 **Mock STT/TTS** 测 UI。

## 脚本

```bash
pnpm dev
pnpm build
pnpm cap:sync
pnpm install:android   # 构建并安装 Debug APK 到 USB 连接的真机
```

## 真机调试

1. 手机开启 USB 调试，连接电脑
2. `pnpm install:android`
3. Chrome 打开 `chrome://inspect` → 调试 WebView

## 文档

- [REQUIREMENTS.md](./REQUIREMENTS.md) — 需求规格
- [harness.md](./harness.md) — 闭环验收规则
- [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) — 分步开发计划

## 功能概览

**Phase 1**：15 情景 → 文字/语音对话 → Edge 朗读 → 本地历史

**Phase 2**：表达错误检测 → 复习对话引导 → Anki 间隔调度
