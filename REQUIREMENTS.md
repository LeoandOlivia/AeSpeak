# eSpeak 需求规格（唯一真相源）

AI 英语口语练习 App · Android 为主 · 中文 UI · 零后端。

---

## 1. 产品闭环

```
选情景 → 情景对话（文字/语音）→ AI 流式回复 + 朗读
       → 识别表达错误 → Anki 间隔调度
       → 复习 Tab → AI 引导对话 → 用户说出正确说法 → 四档评分
```

**复习原则**：在对话中重新产出正确表达，不是闪卡背答案。

---

## 2. 硬性约束

| 项 | 要求 |
|----|------|
| 平台 | Android App（Capacitor 8）；浏览器仅开发预览（375–430px） |
| 服务器 | 零后端，API 手机直连云端 |
| 数据 | IndexedDB（Dexie），Key 仅存本地 |
| 网络 | LLM / STT / TTS 需联网 |
| 禁止 | Next.js、Prisma、双栈、服务端 Routes、单元测试/eval 脚本 |

---

## 3. 技术栈

- Vite + React 19 + TypeScript + React Router
- Tailwind CSS 4、Sonner、Framer Motion（可选）
- Dexie、Capacitor 8
- API 集中：`lib/providers/`

---

## 4. 语音方案

| 能力 | 主方案 | 备选 |
|------|--------|------|
| TTS | Edge TTS（无 Key） | 国内 TTS |
| STT | OpenAI Whisper | 国内 STT |
| 录音 | Capacitor VoiceRecorder（AAC/MP4, 16kHz） | — |

- 不用 Web Speech API / speechSynthesis / Google SpeechRecognizer 作为主路径
- 长 TTS 单句 ~500 字符；录音最长 60s

---

## 5. LLM

- 默认 DeepSeek（`https://api.deepseek.com/v1`）
- 可选 OpenAI（设置切换）
- 流式输出；每情景独立 system prompt
- 难度：beginner / intermediate / advanced

---

## 6. Phase 1 功能

### 壳层
- MobileShell：顶栏 + 底栏（练习 / 复习 / 设置），safe-area，暗色模式
- 聊天页、复习对话页 hideTabs

### 练习 `/`
- 15 内置情景（5 分类 × 3 难度），搜索 + 分类筛选
- 点击进入练习聊天

### 聊天 `/chat/:conversationId`
- 气泡、文字发送、流式 AI、结束对话
- 朗读（Edge TTS）、麦克风（录音 → STT → 输入框）

### 历史 `/history`
- 列表、筛选、继续、删除

### 复习 `/review`（Phase 1 空状态占位）

### 设置 `/settings`
- DeepSeek Key、OpenAI Key、国内 STT/TTS Key
- Provider 选择、模型、TTS 音色
- 保存 / 验证 / 测试朗读 / 测试识别
- 可选 Mock STT/TTS

### Android
- VoiceRecorder 插件、RECORD_AUDIO + INTERNET、Java 21
- `pnpm install:android`

---

## 7. Phase 2 功能

### 表达错误（只记这一类）
- 中式英语、搭配错误、不地道说法、语用不当
- 不记：纯语法题、拼写、标点、原句已可接受

### 检测
- 每条 user 消息后异步 LLM 检测
- 入库 `ErrorRecord`，创建 `ReviewCard`

### 结束摘要
- 对话结束展示本次表达错误

### 复习 `/review` + `/review/session/:reviewCardId`
- 待复习列表（Anki due）
- 复习 mini 对话：AI 引导说出 `correctExpression`
- Judge 达标 → 四档：忘了 / 困难 / 不错 / 简单
- SM-2 更新间隔

---

## 8. 数据模型

```typescript
// UserSettings — 单例
{ deepseekKey, openaiKey, llmProvider, llmModel, sttProvider, ttsProvider, ttsVoice, mockVoice? }

// Scenario — seed 15
{ id, title, description, category, difficulty, systemPrompt, characterRole, suggestedVocab }

// Conversation
{ id, scenarioId?, reviewCardId?, type: 'practice'|'review', status, startedAt, endedAt, updatedAt }

// Message
{ id, conversationId, role, content, status, createdAt }

// ErrorRecord
{ id, conversationId, messageId, scenarioId, originalExpression, correctExpression, explanationZh, contextSnippet?, createdAt }

// ReviewCard
{ id, errorRecordId, due, interval, easeFactor, reps, lapses, lastReviewAt?, lastRating? }
```

---

## 9. 路由

| 路径 | 页面 |
|------|------|
| `/` | 情景列表 |
| `/chat/:conversationId` | 练习聊天 |
| `/history` | 对话历史 |
| `/review` | 复习面板 |
| `/review/session/:reviewCardId` | 复习对话 |
| `/settings` | 设置 |

---

## 10. 内置情景（15）

| 分类 | 示例 |
|------|------|
| daily_life | 餐厅点餐、超市购物、邻里社交 |
| business | 工作面试、商务会议、商务谈判 |
| travel | 机场值机、酒店入住、紧急情况 |
| academic | 课堂参与、学术讨论、论文答辩 |
| social | 初次见面、约会聊天、争议话题 |

---

## 11. 验收标准

见 [harness.md](./harness.md) §9。

---

## 12. 文档

| 文件 | 用途 |
|------|------|
| REQUIREMENTS.md | 本文 |
| harness.md | 闭环规则 + 人工验收用例 |
| DEVELOPMENT_PLAN.md | 分步实施 S0–S16 |
| README.md | 环境、Key、真机调试（实施时编写） |
