# Quill

A fast, lightweight database GUI built with Tauri + React + TypeScript.

**Positioned as:** Freemium alternative to TablePlus/DBeaver with modern UX and **AI-first design**.

## Why Quill?

|                 | Quill             | TablePlus     | DBeaver     | DataGrip |
| --------------- | ----------------- | ------------- | ----------- | -------- |
| **Price**       | Free / Pro $15/mo | $69-99        | Free/$249   | $99/yr   |
| **Size**        | ~5MB              | ~50MB         | ~200MB      | ~500MB   |
| **Speed**       | Native Rust       | Native        | Java (slow) | Java     |
| **AI Features** | ✅ Built-in       | ❌            | Plugin      | Plugin   |
| **Free Tier**   | ✅ Generous       | ❌ Trial only | ✅          | ❌       |

## Current Features ✅

- **Databases:** PostgreSQL, SQLite
- **Multi-Workspace:** Up to 5 simultaneous database connections
  - VS Code-style activity bar (left sidebar)
  - Right-click context menu: Close This / Close Others
  - Color-coded by database type (PostgreSQL=blue, SQLite=green)
  - Instant workspace switching (<100ms)
- **Query Editor:** Monaco-based with syntax highlighting, Cmd+Enter execution
- **Data Grid:** Virtual scrolling (handles 10k+ rows), server-side pagination & sorting, type-aware formatting, JSONB support
- **Inline Editing:** Edit cells, insert/delete rows with pending changeset (preview SQL before apply)
- **Multi-tab:** Multiple query tabs per workspace
- **Connections:** Save, test, and manage database connections
- **Dark Theme:** Modern cyberpunk-inspired UI

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Zustand
- **Backend:** Tauri, Rust, sqlx (async)
- **Editor:** Monaco Editor
- **Grid:** TanStack Table + TanStack Virtual

---

## Pricing

### FREE (Personal Use)

- 2 database connections
- 3 tabs per workspace
- Basic query editor & autocomplete
- Export up to 1000 rows (CSV only)
- Dark theme
- Community support

### PRO — $15/month ($129/year)

**AI Features:**

- ✅ 1,000 AI queries/month
- ✅ Natural Language → SQL
- ✅ Query optimization suggestions
- ✅ Query explanation & fixing

**Professional:**

- ✅ Unlimited connections & tabs
- ✅ Advanced query editor (variables, templates)
- ✅ Unlimited export (CSV, JSON, Excel, SQL, Markdown)
- ✅ SSH tunneling & advanced security
- ✅ Query scheduling
- ✅ Performance tools & EXPLAIN visualization
- ✅ Code generation (ORM models, migrations)
- ✅ Custom themes
- ✅ Priority support

### TEAM — $25/user/month (min 3 users)

**Everything in Pro, plus:**

- ✅ 5,000 AI queries/month per user
- ✅ Team workspace & shared connections
- ✅ Shared query library
- ✅ Activity feed & mentions
- ✅ Permission management (read-only, read-write, admin)
- ✅ Audit logs
- ✅ Advanced support

### ENTERPRISE — Custom Pricing

**Everything in Team, plus:**

- ✅ Unlimited AI queries
- ✅ Self-hosted / on-premise option
- ✅ SSO (SAML, OAuth)
- ✅ Advanced compliance (GDPR tools, data masking)
- ✅ SLA guarantee
- ✅ Dedicated support
- ✅ Custom integrations
- ✅ White-label option

---

## Roadmap

### ✅ Phase 0: Multi-Workspace (Complete)

- [x] Inner tab system, backend multi-connection, activity bar
- [x] Right-click context menu, workspace isolation, instant switching
- [x] Status bar, max 5 workspaces enforcement

**Design Decision:** Session-only workspaces (no persistence on restart).

### ✅ Phase 1: MVP Table Stakes (Complete)

- [x] Export CSV/JSON, copy cell/row, column resizing
- [x] Keyboard shortcuts, query history, table structure view
- [x] SQL formatter, sort columns, filter columns
- [x] Full SQL autocomplete (tables, columns, JOINs, subqueries)

### ✅ Phase 2: Daily Driver (Complete)

- [x] Inline cell editing with SQL preview
- [x] Insert/delete rows UI (pending changeset)
- [x] Copy/paste rows (TSV clipboard)
- [x] Server-side pagination & sorting
- [x] SSL connections, import CSV/JSON
- [x] Saved queries library, connection groups, index display

### 🚗 Phase 2.5: UI/UX Polish (Current)

Modern UX to compete with TablePlus.

| Feature                       | Priority | Status | Description                                      |
| ----------------------------- | -------- | ------ | ------------------------------------------------ |
| Adaptive Sidebar              | P0       | ✅     | Action hub: recent connections, quick actions    |
| Connection Cards 2.0          | P0       | ✅     | Status indicators, env labels, hover actions     |
| Enhanced Status Bar           | P0       | ✅     | Row count, latency, workspace count, schema/type |
| Empty State 2.0               | P0       | ✅     | Quick start buttons, shortcuts hint              |
| Command Palette (Cmd+K)       | P1       | ✅     | Universal actions with fuzzy search              |
| Connection Groups Enhancement | P1       | ✅     | Custom colors, drag-drop, count badges           |
| Query Templates               | P1       | ✅     | Pre-built: SHOW TABLES, DESCRIBE, COUNT          |
| Keyboard Shortcuts Overlay    | P1       | ✅     | Press F1 to show all shortcuts                   |
| Smart Search                  | P2       | ⬜     | Operators: `env:production`, `last:today`        |
| Dashboard Mode                | P2       | ⬜     | Overview of all workspaces with metrics          |
| Import/Export Connections     | P2       | ⬜     | Migration from TablePlus/DBeaver                 |

### 🔌 Phase 3: Database Expansion & Architecture (Next Priority)

Critical gaps vs competitors — requires provider architecture for scalability.

> **Plan:** [`plans/20251216-multi-provider-architecture/`](./plans/20251216-multi-provider-architecture/)

#### 3.1 Multi-Provider Architecture (Foundation)

| Phase                | Description                          | Status |
| -------------------- | ------------------------------------ | ------ |
| Core Trait System    | Rust traits for provider abstraction | ⬜     |
| Result Normalization | Unified `ProviderResult` enum        | ⬜     |
| Frontend Adapters    | TypeScript adapter patterns          | ⬜     |

```
DatabaseProvider (base)
├── SqlProvider (PostgreSQL, SQLite, MySQL, DuckDB)
└── DocumentProvider (MongoDB)
```

#### 3.2 SQL Providers

| Feature            | Priority | Status | Notes                     |
| ------------------ | -------- | ------ | ------------------------- |
| MySQL support      | P0       | ⬜     | All competitors have this |
| SSH tunneling      | P0       | ⬜     | Essential for production  |
| DuckDB support     | P1       | ⬜     | Analytics/OLAP use case   |
| SQL Server support | P2       | ⬜     | Enterprise demand         |
| Turso/LibSQL       | P2       | ⬜     | Edge database trend       |
| Oracle support     | P3       | ⬜     | Legacy enterprise         |

#### 3.3 Document Providers (Future)

| Feature                  | Priority | Status | Notes                        |
| ------------------------ | -------- | ------ | ---------------------------- |
| MongoDB support          | P3       | ⬜     | Requires DocumentProvider    |
| Query Editor Enhancement | P3       | ⬜     | Multi-language editor support|

### 🤖 Phase 4: AI Features (Pro MVP)

AI-first differentiation — core of Pro subscription.

#### 4.1 AI Query Assistant (P0 - Launch Priority)

| Feature                | Description                                   |
| ---------------------- | --------------------------------------------- |
| Natural Language → SQL | "Show top 10 customers by revenue this month" |
| Query Explanation      | Explain complex queries in plain language     |
| Query Fixing           | Auto-fix SQL syntax errors                    |
| Smart Auto-complete    | Predict entire queries based on context       |
| Query Optimization     | Suggest indexes, rewrite for performance      |

#### 4.2 AI Data Intelligence (P1-P2)

- Anomaly Detection ("1000 users signed up abnormally")
- Pattern Recognition ("Revenue drops 20% every Sunday")
- Data Quality Check (duplicates, nulls, outliers)
- Smart Suggestions ("Add index to column X")

#### 4.3 AI Schema Helper (P1-P2)

- Schema Design Assistant, Relationship Detector, Migration Generator

#### 4.4 AI Documentation (P2)

- Auto-generate DB docs, query comments, table descriptions

### 💼 Phase 5: Professional Features

Power features for daily professional use.

| Category         | P0 Features                        | P1-P2 Features                                |
| ---------------- | ---------------------------------- | --------------------------------------------- |
| Query Editor     | Query history search (FTS)         | Templates, variables, scheduling, profiler    |
| Export/Import    | Unlimited rows, Excel/SQL/Markdown | Custom templates, scheduled, cloud export     |
| Security         | —                                  | Multiple auth methods, Vault integration      |
| Performance      | —                                  | Slow query detector, EXPLAIN viz, index recs  |
| Dev Productivity | —                                  | Code gen (TS/Py/Go), migration gen, test data |

### 👥 Phase 6: Team & Collaboration

| Feature                                       | Priority |
| --------------------------------------------- | -------- |
| Shared connections & query library            | P0       |
| Permission management (read-only/write/admin) | P0       |
| Comments, mentions, activity feed             | P1       |
| Query version history, change approval        | P2       |

### 🏢 Phase 7: Enterprise Features

#### Compliance & Audit

- Audit logging (P0), data masking, GDPR tools, row-level security

#### Schema Management

- Schema compare/diff, sync tool, ER diagrams, migration tools

#### Advanced Features

- Transaction UI, safe mode, multiple windows, custom themes
- Vim/Emacs mode, session restore, cloud sync, plugin system

---

## Implementation Priority

### 🎯 Immediate (Close Critical Gaps)

| Feature       | Effort | Impact   | Why                         |
| ------------- | ------ | -------- | --------------------------- |
| MySQL support | Medium | Critical | All competitors have it     |
| SSH tunneling | Medium | Critical | Required for production DBs |

### 🚀 Pro MVP Launch Features

1. **AI Query Assistant** — Natural language → SQL (core differentiation)
2. **Unlimited connections/tabs** — Quick win, high demand
3. **Export to Excel** — Low effort, high value
4. **Query history search** — Full-text search with SQLite FTS

### 💎 Quick Wins (Low Effort, High Impact)

| Feature               | Effort | Value  |
| --------------------- | ------ | ------ |
| Unlimited tabs        | Low    | High   |
| Export to Excel       | Low    | High   |
| Dark theme variations | Low    | Medium |
| Query history search  | Medium | High   |

### 💪 High-Value Features (Worth the Effort)

| Feature                   | Effort | Strategic Value         |
| ------------------------- | ------ | ----------------------- |
| AI Natural Language Query | High   | Core differentiation    |
| Schema compare & sync     | High   | Enterprise appeal       |
| Real-time collaboration   | High   | Team plan justification |
| Performance profiler      | Medium | Pro appeal              |

---

## Competitive Analysis

See full analysis: [`plans/reports/brainstorm-20251215-feature-gap-analysis.md`](./plans/reports/brainstorm-20251215-feature-gap-analysis.md)

### Key Gaps vs Competitors

| Feature             | Quill       | TablePlus | DataGrip | DBeaver | Beekeeper |
| ------------------- | ----------- | --------- | -------- | ------- | --------- |
| Inline editing      | ✅          | ✅        | ✅       | ✅      | ✅        |
| Schema autocomplete | ✅          | ✅        | ✅       | ✅      | ✅        |
| Export data         | ✅          | ✅        | ✅       | ✅      | ✅        |
| SSH tunneling       | ⬜          | ✅        | ✅       | ✅      | ✅        |
| AI assistance       | ⬜ (P0)     | ❌        | ✅       | ✅      | ✅        |
| MySQL               | ⬜          | ✅        | ✅       | ✅      | ✅        |
| Team collaboration  | ⬜          | ❌        | ✅       | ❌      | ✅        |
| Native performance  | ✅          | ✅        | ❌       | ❌      | ❌        |
| Free tier           | ✅ Generous | ❌        | ❌       | ✅      | ✅        |

---

## Technical Decisions

Key architecture choices made during development:

1. **Workspace Persistence:** Session-only workspaces (no restoration on restart)
   _Rationale:_ Simpler state management, cleaner user experience, avoids stale connection issues

2. **Connection Management:** Keep-alive with periodic health checks
   _Rationale:_ Prevents timeout interruptions during long editing sessions

3. **Autocomplete Scope:** Full SQL intelligence (tables, columns, JOINs, subqueries, keywords)
   _Rationale:_ Competitive parity with TablePlus/DataGrip, essential for productivity

4. **MySQL Priority:** Remains Phase 2 (after MVP features complete)
   _Rationale:_ PostgreSQL + SQLite cover 80% use cases, polish existing features first

5. **Multi-Provider Architecture:** Trait-based abstraction for database providers
   _Rationale:_ Enable support for different database paradigms (SQL vs NoSQL) without code duplication. Uses Rust traits (`DatabaseProvider`, `SqlProvider`, `DocumentProvider`) and TypeScript adapters for provider-specific UI. See [architecture plan](./plans/20251216-multi-provider-architecture/).

---

## Development

### Prerequisites

- Node.js 18+
- Rust 1.70+
- Yarn

### Setup

```bash
# Install dependencies
yarn install

# Run development
yarn tauri dev

# Build production
yarn tauri build
```

### IDE Setup

- [VS Code](https://code.visualstudio.com/)
- [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

---

## Architecture

```
src/                    # React frontend
├── components/         # UI components
├── pages/              # Route pages
├── stores/             # Zustand state
├── hooks/              # Custom hooks
├── types/              # TypeScript types
└── lib/                # Utilities

src-tauri/              # Rust backend
├── src/
│   ├── commands/       # Tauri commands
│   ├── db/             # Database operations
│   ├── models/         # Data structures
│   └── main.rs         # Entry point
└── Cargo.toml
```

---

## Contributing

Contributions welcome! See the roadmap above for priority features.

## License

Proprietary. Free tier available for personal use.
