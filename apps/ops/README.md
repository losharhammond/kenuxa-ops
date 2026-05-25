# KENUXA OPS

> **Voice-driven AI business operations system** — the operational intelligence layer for the KENUXA ecosystem. Say "Hey Kenuxa" and run your business hands-free.

---

## Overview

KENUXA OPS is not a chatbot. It's a **Jarvis-style operational infrastructure** built for African businesses:

- 🎙️ **Voice Engine** — Wake word detection, real-time STT, TTS priority queue
- 🧠 **AI Command Routing** — Groq Llama 3 intent classification, 30+ command types
- ⚡ **Workflow Automation** — Cron + event-driven multi-step workflows
- 💾 **Memory Engine** — Supabase-backed persistent memory with semantic search
- 📧 **Email Operations** — Send (Resend), summarize, draft replies via voice
- 🔗 **KENUXA CORE Connector** — REST integration with the core platform
- 🧩 **Plugin System** — Built-in + extensible plugin registry
- 🖥️ **Desktop App** — Electron wrapper with system app launching

---

## Tech Stack

| Layer        | Technology                                       |
|--------------|--------------------------------------------------|
| Framework    | Next.js 15 (App Router) + TypeScript strict mode |
| Database     | Supabase PostgreSQL (shared KENUXA project)      |
| AI           | Groq — Llama 3.1-8b, Llama 3.3-70b, Whisper     |
| Voice STT    | Web Speech API (browser) + Groq Whisper (server) |
| Voice TTS    | Web Speech API priority queue                    |
| State        | Zustand with devtools                            |
| Animations   | Framer Motion                                    |
| Email        | Resend (sending) + IMAP (reading)                |
| Scheduler    | node-cron + setTimeout                           |
| Desktop      | Electron with contextBridge IPC                  |
| Port         | **3002**                                         |

---

## Quick Start

### 1. Prerequisites

- Node.js 18+
- pnpm 8+
- Supabase project (shared with KENUXA ecosystem)
- Groq API key (dedicated `GROQ_OPS_API_KEY`)

### 2. Environment Setup

```bash
cp .env.example .env.local
```

Fill in all required variables (see `.env.example` for full list):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Groq (dedicated OPS key — separate rate limits)
GROQ_OPS_API_KEY=gsk_...

# Email
RESEND_API_KEY=re_...
EMAIL_FROM=ops@yourdomain.com

# KENUXA CORE
KENUXA_CORE_URL=https://core.kenuxa.com
KENUXA_SERVICE_KEY=your-service-key
```

### 3. Database Setup

Run the migration in your Supabase SQL editor:

```bash
# From the Supabase dashboard → SQL Editor
# Paste and run: supabase/migrations/001_ops_schema.sql
```

This creates all `ops_`-prefixed tables with Row Level Security enabled.

### 4. Install & Run

```bash
# From monorepo root
pnpm install

# Run OPS only (port 3002)
pnpm --filter @kenuxa/ops dev

# Or from apps/ops
cd apps/ops && pnpm dev
```

### 5. Desktop App (Electron)

```bash
# Build Next.js first
pnpm --filter @kenuxa/ops build

# Run Electron
pnpm --filter @kenuxa/ops electron:dev
```

---

## Architecture

### Voice Pipeline

```
Microphone
   └─► Web Speech API (continuous mode)
          └─► normalizeWakeWord() — regex: /hey\s*kenuxa/i
                 └─► One-shot STT capture (8s timeout)
                        └─► Groq Whisper (server fallback)
                               └─► parseIntent() — Groq Llama 3.1-8b
                                      └─► routeCommand() → handler
                                             └─► BrowserTTS priority queue
```

### Command Routing

```
parseIntent(rawText)         → ParsedIntent { intent, entities, confidence }
routeCommand(rawText)        → registers handler, executes, logs to DB
registerHandler(intent, fn)  → side-effect imports in useVoice.ts
```

**Intents**: `open_app`, `send_email`, `read_emails`, `search_web`, `create_task`, `remember`, `recall`, `run_workflow`, `query_reach`, `speak_only`, and 20+ more.

### Database Tables (all `ops_` prefixed)

| Table                  | Purpose                          |
|------------------------|----------------------------------|
| `ops_commands`         | Full command history with results |
| `ops_memory`           | Key-value persistent memory       |
| `ops_workflows`        | Workflow definitions              |
| `ops_workflow_runs`    | Execution history                 |
| `ops_workflow_steps`   | Step definitions                  |
| `ops_email_threads`    | Cached email threads              |
| `ops_tasks`            | Created tasks                     |
| `ops_plugins`          | Plugin registry                   |
| `ops_plugin_settings`  | Per-user plugin config            |
| `ops_integrations`     | OAuth connections                 |
| `ops_sessions`         | Voice session tracking            |

---

## Pages

| Route         | Description                                      |
|---------------|--------------------------------------------------|
| `/`           | Landing page with capability showcase            |
| `/dashboard`  | Stats, command history, workflows, quick actions |
| `/voice`      | Voice Console — primary interaction UI           |
| `/workflows`  | Workflow Center — create, manage, run            |
| `/memory`     | Memory Engine — browse, search, delete           |
| `/email`      | Email Hub — inbox, summaries, AI drafting        |
| `/plugins`    | Plugin Marketplace                               |

---

## API Routes

| Endpoint                        | Methods      | Purpose                            |
|---------------------------------|--------------|------------------------------------|
| `/api/commands`                 | GET, POST    | Execute commands, list history     |
| `/api/voice/transcribe`         | POST         | Groq Whisper transcription         |
| `/api/memory`                   | GET, POST, DELETE | Memory CRUD + semantic search  |
| `/api/automation`               | GET, POST, PUT, DELETE | Workflow management        |
| `/api/email`                    | GET, POST    | Email list, send, summarize, draft |

---

## Voice Commands

```
"Hey Kenuxa, [command]"

— "summarize my inbox"
— "send email to John about the meeting tomorrow"
— "create a task to follow up on Friday"
— "remember: client is allergic to morning meetings"
— "what do you know about Project Alpha?"
— "run the morning briefing workflow"
— "open Chrome"
— "search for Q2 sales report"
— "what's the status on KENUXA Reach?"
```

---

## Workflow Automation

Workflows support 6 step types:
- **email** — Send emails with template interpolation (`{{key}}`)
- **command** — Execute voice commands programmatically
- **http** — Call external webhooks
- **memory** — Read/write memory entries
- **wait** — Delay with duration
- **condition** — Branch based on context values

Triggers: `manual`, `cron`, `event`, `voice`, `webhook`

---

## Security

- All Supabase tables have **Row Level Security** (users only access their own data)
- `SUPABASE_SERVICE_ROLE_KEY` is **server-only** — never exposed to client
- CORE connector uses `X-Service-Key` header for authentication
- Electron uses **contextBridge** — no `nodeIntegration`, no direct Node.js access from renderer
- Microphone permission must be explicitly granted by the user
- All file system operations go through IPC handlers with explicit user confirmation dialogs

---

## Monorepo Integration

```
KENUXA/
├── apps/
│   ├── ops/          ← This app (port 3002)
│   ├── core/         ← KENUXA CORE (separate platform)
│   └── reach/        ← KENUXA REACH (port 3000)
├── packages/
│   ├── shared-types/ ← Shared TypeScript types
│   ├── ai/           ← Shared AI utilities
│   └── auth/         ← Shared auth helpers
```

OPS uses `@kenuxa/shared-types`, `@kenuxa/ai`, and `@kenuxa/auth` from the workspace.

**IMPORTANT**: OPS never directly queries CORE's database. All CORE interactions go through the REST API (`/api/*` on CORE) with service key authentication.

---

## Development Notes

- **Wake word**: Requires Chrome/Edge/Safari (Web Speech API). Firefox not supported.
- **Microphone**: Must be on HTTPS or localhost for browser microphone access.
- **Groq rate limits**: `GROQ_OPS_API_KEY` is a dedicated key separate from other KENUXA apps.
- **Supabase**: All tables are `ops_`-prefixed to coexist with CORE, REACH, and future apps in the same Supabase project.
- **Port**: OPS runs on port **3002** (`next.config.ts` → `env.PORT`).

---

## Roadmap

- [ ] Phase 2: Electron production build + auto-updater
- [ ] Phase 2: Real Gmail/Outlook OAuth integration  
- [ ] Phase 2: Playwright browser automation (currently stubbed)
- [ ] Phase 2: WebSocket real-time updates (socket.io)
- [ ] Phase 3: Mobile companion app
- [ ] Phase 3: Multi-user team workspace
- [ ] Phase 3: Advanced ML wake word (Picovoice Porcupine)

---

*Part of the KENUXA Ecosystem · Built for African businesses*
