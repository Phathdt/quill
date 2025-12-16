# Quill

A fast, lightweight database GUI built with Tauri + React + TypeScript.

**Positioned as:** Freemium alternative to TablePlus/DBeaver with modern UX and **AI-first design**.

## Why Quill?

| | Quill | TablePlus | DBeaver | DataGrip |
|---|-------|-----------|---------|----------|
| **Price** | Free / Pro $15/mo | $69-99 | Free/$249 | $99/yr |
| **Size** | ~5MB | ~50MB | ~200MB | ~500MB |
| **Speed** | Native Rust | Native | Java (slow) | Java |
| **AI Features** | ✅ Built-in | ❌ | Plugin | Plugin |
| **Free Tier** | ✅ Generous | ❌ Trial only | ✅ | ❌ |

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

### Phase 0: Multi-Workspace ✅ (Complete)
Complete multi-database workflow support.

- [x] Inner tab system (multiple tabs per workspace)
- [x] Backend multi-connection support
- [x] Activity bar with workspace icons (VS Code-style)
- [x] Right-click context menu (Close This / Close Others)
- [x] Workspace isolation and instant switching
- [x] Status bar showing current connection info
- [x] Max 5 workspaces enforcement

**Design Decision:** Workspaces are session-only (no persistence on restart). Closing last workspace redirects to welcome page.

### Phase 1: MVP Table Stakes ✅ (Complete)
Features every database GUI user expects.

| Feature | Priority | Status |
|---------|----------|--------|
| Export to CSV/JSON | P0 | ✅ |
| Copy cell/row to clipboard | P0 | ✅ |
| Column resizing | P0 | ✅ |
| Keyboard shortcuts (Cmd+T/W/Enter) | P0 | ✅ |
| Query history UI | P0 | ✅ |
| Table structure view (columns, types, constraints) | P0 | ✅ |
| SQL formatter (prettify) | P0 | ✅ |
| Sort columns (click header) | P0 | ✅ |
| Filter columns (SQL-based, table mode) | P1 | ✅ |
| Full SQL autocomplete (tables, columns, JOINs, subqueries, keywords) | P1 | ✅ |

### Phase 2: Daily Driver 🚗 (Current)
Replace TablePlus for daily work.

| Feature | Priority | Status |
|---------|----------|--------|
| Inline cell editing (with SQL preview) | P0 | ✅ |
| Insert/delete rows UI (pending changeset) | P0 | ✅ |
| Copy/paste rows (TSV clipboard) | P0 | ✅ |
| Server-side pagination (LIMIT/OFFSET) | P0 | ✅ |
| Server-side sorting (ORDER BY) | P0 | ✅ |
| MySQL support | P0 | ⬜ |
| SSH tunneling | P1 | ⬜ |
| SSL connections | P1 | ✅ |
| Import CSV/JSON | P1 | ✅ |
| Saved queries library | P1 | ✅ |
| Connection groups/folders | P2 | ✅ |
| Index information display | P2 | ✅ |

### Phase 2.5: UI/UX Improvements 🎨 (Current - Partial Complete)
Modern UX polish to compete with TablePlus. Phase 2.5 initial release focused on welcome screen and workspace enhancements.

#### Welcome Page Improvements
| Feature | Priority | Status | Description |
|---------|----------|--------|-------------|
| Adaptive Sidebar | P0 | ✅ | Transform branding sidebar into action hub: recent connections, quick actions, connection stats |
| Connection Cards 2.0 | P0 | ✅ | Status indicators (connected/unreachable), environment labels (prod/dev), hover actions, last used timestamp |
| Connection Groups Enhancement | P1 | ⬜ | Custom colors, drag-drop reordering, connection count badges |
| Smart Search | P2 | ⬜ | Search operators: `env:production`, `tag:client-A`, `last:today` |
| Import/Export Connections | P2 | ⬜ | Migration from TablePlus/DBeaver, backup to JSON/CSV |

#### Workspace Page Improvements
| Feature | Priority | Status | Description |
|---------|----------|--------|-------------|
| Enhanced Status Bar | P0 | ✅ | Query results (row count in X ms), latency indicator, workspace count, schema name, DB type |
| Empty State 2.0 | P0 | ✅ | Actionable welcome: quick start buttons, keyboard shortcuts hint, connection status |
| Query Templates | P1 | ⬜ | Pre-built common queries: SHOW TABLES, DESCRIBE, COUNT, EXPLAIN |
| Dashboard Mode | P2 | ⬜ | Overview of all open workspaces with metrics and quick actions |

#### General UX
| Feature | Priority | Status | Description |
|---------|----------|--------|-------------|
| Command Palette (Cmd+K) | P1 | ✅ | Universal access to all actions with fuzzy search (using cmdk library) |
| Keyboard Shortcuts Overlay | P1 | ⬜ | Press `?` to show all shortcuts, interactive tutorial |

### Phase 3: AI Features 🤖 (Future)
AI-first differentiation — the core of Pro subscription.

#### 3.1 AI Query Assistant
| Feature | Priority | Description |
|---------|----------|-------------|
| Natural Language → SQL | P0 | "Show top 10 customers by revenue this month" |
| Query Explanation | P0 | Explain complex queries in Vietnamese/English |
| Query Fixing | P0 | Auto-fix SQL syntax errors |
| Smart Auto-complete | P1 | Predict entire queries based on context |
| Query Optimization | P1 | Suggest indexes, rewrite for performance |

#### 3.2 AI Data Intelligence
| Feature | Priority | Description |
|---------|----------|-------------|
| Anomaly Detection | P1 | "1000 users signed up abnormally yesterday" |
| Pattern Recognition | P2 | "Revenue drops 20% every Sunday" |
| Data Quality Check | P2 | Find duplicates, null values, outliers |
| Smart Suggestions | P2 | "Add index to column X — slow query detected" |

#### 3.3 AI Schema Helper
| Feature | Priority | Description |
|---------|----------|-------------|
| Schema Design Assistant | P1 | "I want to build e-commerce DB" → suggest tables |
| Relationship Detector | P2 | Auto-detect missing foreign keys |
| Migration Generator | P2 | "Add soft delete to all tables" → generate migration |

#### 3.4 AI Documentation
| Feature | Priority | Description |
|---------|----------|-------------|
| Auto-generate DB Documentation | P2 | Create docs for database schema |
| Query Comments | P2 | AI writes comments for complex queries |
| Table Descriptions | P2 | AI describes purpose of each table/column |

### Phase 4: Professional Features 💼
Power features for daily professional use.

#### 4.1 Advanced Query Editor
| Feature | Priority | Status |
|---------|----------|--------|
| Query history (unlimited + full-text search) | P0 | ⬜ |
| Query templates (reusable patterns) | P1 | ⬜ |
| Variables in queries (`{{country}}`) | P1 | ⬜ |
| Query scheduling (run periodically) | P2 | ⬜ |
| Query profiler (visual explain plan) | P1 | ⬜ |

#### 4.2 Advanced Export & Import
| Feature | Priority | Status |
|---------|----------|--------|
| Unlimited rows export | P0 | ⬜ |
| Export formats: Excel, SQL, Markdown | P0 | ⬜ |
| Custom export templates | P2 | ⬜ |
| Scheduled exports | P2 | ⬜ |
| Export to cloud (S3, Google Drive) | P3 | ⬜ |

#### 4.3 Security & Connectivity
| Feature | Priority | Status |
|---------|----------|--------|
| SSH tunneling | P0 | ⬜ |
| Multiple auth methods (key file, 2FA) | P1 | ⬜ |
| Vault integration (HashiCorp, AWS Secrets) | P2 | ⬜ |

#### 4.4 Database Performance Tools
| Feature | Priority | Status |
|---------|----------|--------|
| Slow query detector | P1 | ⬜ |
| Execution plan visualizer | P1 | ⬜ |
| Index recommendations | P1 | ⬜ |
| Real-time monitoring (connections, query times) | P2 | ⬜ |
| Performance dashboard | P2 | ⬜ |

#### 4.5 Developer Productivity
| Feature | Priority | Status |
|---------|----------|--------|
| Code generation (TypeScript, Python, Go models) | P1 | ⬜ |
| Migration generator (Prisma, TypeORM) | P1 | ⬜ |
| Test data generator (realistic fake data) | P2 | ⬜ |
| CRUD generator (admin panel code) | P2 | ⬜ |

### Phase 5: Collaboration Features 👥 (Team Plan)
Team workspace and collaboration.

| Feature | Priority | Description |
|---------|----------|-------------|
| Shared connections | P0 | Team shares connection configs |
| Shared query library | P0 | Share useful queries with team |
| Comments & mentions | P1 | @teammate in queries |
| Activity feed | P1 | "John ran DELETE on production 😱" |
| Permission management | P0 | Read-only, Read-write, Admin roles |
| Query version history | P2 | Rollback queries |
| Change approval | P2 | Require approval for production queries |

### Phase 6: Enterprise Features 🏢
Enterprise-grade features.

#### 6.1 Database Support
| Feature | Priority | Status |
|---------|----------|--------|
| MySQL support | P0 | ⬜ |
| DuckDB support | P1 | ⬜ |
| SQL Server support | P1 | ⬜ |
| Turso/LibSQL support | P2 | ⬜ |
| Oracle support | P2 | ⬜ |
| MongoDB support | P3 | ⬜ |

#### 6.2 Compliance & Audit
| Feature | Priority | Description |
|---------|----------|-------------|
| Audit logging | P0 | Full query logs with user tracking |
| Data masking | P1 | Hide sensitive data (credit cards, emails) |
| GDPR tools | P1 | Export/delete user data easily |
| Compliance reports | P2 | Generate compliance reports |
| Row-level security | P2 | Enforce data access policies |

#### 6.3 Schema Management
| Feature | Priority | Status |
|---------|----------|--------|
| Schema compare (dev vs prod) | P1 | ⬜ |
| Schema diff | P1 | ⬜ |
| Sync tool (generate sync scripts) | P2 | ⬜ |
| ER diagrams | P2 | ⬜ |
| Database migration tools | P2 | ⬜ |

#### 6.4 Advanced Features
| Feature | Priority | Status |
|---------|----------|--------|
| Transaction UI (BEGIN/COMMIT/ROLLBACK) | P1 | ⬜ |
| Safe mode (prevent accidental production changes) | P1 | ⬜ |
| Multiple windows | P2 | ⬜ |
| Custom themes (light mode, Dracula, Nord) | P2 | ⬜ |
| Vim/Emacs mode | P2 | ⬜ |
| Session restore (restore tabs on reopen) | P2 | ⬜ |
| Cloud sync (settings across devices) | P3 | ⬜ |
| Plugin/extension system | P3 | ⬜ |

### Phase 7: Multi-Provider Architecture 🔌 (Future)
Scalable architecture to support multiple database paradigms.

> **Plan:** [`plans/20251216-multi-provider-architecture/`](./plans/20251216-multi-provider-architecture/)

#### Architecture Overview
```
┌─────────────────────────────────────────────────────────────┐
│                    Provider Traits (Rust)                   │
├─────────────────────────────────────────────────────────────┤
│  DatabaseProvider (base)                                    │
│  ├── SqlProvider (PostgreSQL, SQLite, MySQL, DuckDB)       │
│  └── DocumentProvider (MongoDB)                             │
└─────────────────────────────────────────────────────────────┘
```

#### Database Paradigm Support
| Feature | SQL Providers | Document Providers |
|---------|---------------|-------------------|
| Query Language | SQL | MongoDB Query/Aggregation |
| Schema | Fixed columns/types | Flexible documents |
| Result Format | Rows/Columns | Documents (JSON) |
| Primary Key | User-defined | `_id` field |

#### Implementation Phases
| Phase | Description | Status |
|-------|-------------|--------|
| Core Trait System | Rust traits for provider abstraction | ⬜ |
| Result Normalization | Unified `ProviderResult` enum | ⬜ |
| DuckDB Provider | First new SQL provider (analytical) | ⬜ |
| MongoDB Provider | First NoSQL provider (documents) | ⬜ |
| Frontend Adapters | TypeScript adapter patterns | ⬜ |
| Query Editor Enhancement | Multi-language editor support | ⬜ |

#### Key Design Decisions
- **Trait-based abstraction**: Rust `async_trait` for provider interface
- **Operation types**: Separate Query, Command, and Mutation operations
- **Result unification**: All providers return normalized `ProviderResult` enum
- **Frontend adapters**: TypeScript interfaces for provider-specific UI rendering

---

## Implementation Priority

### 🚀 Phase 3 Launch (Pro MVP)
High-value, differentiation features for initial Pro launch:

1. **AI Query Assistant** — Natural language → SQL (core selling point)
2. **Unlimited connections/tabs** — Easy to implement, high demand
3. **SSH tunneling** — Essential for production use
4. **Export to Excel** — Add xlsx library
5. **Query history search** — Full-text search with SQLite FTS

### 💎 Quick Wins (Low Effort, High Impact)
| Feature | Effort | Value |
|---------|--------|-------|
| ✅ Copy cell value (Cmd+C) | Done | Done |
| ✅ SQL formatter | Done | Done |
| ✅ Export to CSV | Done | Done |
| ✅ Column header sort | Done | Done |
| ✅ Basic shortcuts | Done | Done |
| Unlimited tabs | Low | High |
| Export to Excel | Low | High |
| Dark theme variations | Low | Medium |
| Query history search | Medium | High |
| SSH tunneling | Medium | High |
| Connection groups | Done | Done |

### 💪 High-Value Features (Worth the Effort)
| Feature | Effort | Strategic Value |
|---------|--------|-----------------|
| AI Natural Language Query | High | Core differentiation |
| Schema compare & sync | High | Enterprise appeal |
| Real-time collaboration | High | Team plan justification |
| Database migration tools | High | Enterprise appeal |
| Performance profiler | Medium | Pro appeal |

---

## Competitive Analysis

See full analysis: [`plans/reports/brainstorm-20251215-feature-gap-analysis.md`](./plans/reports/brainstorm-20251215-feature-gap-analysis.md)

### Key Gaps vs Competitors

| Feature | Quill | TablePlus | DataGrip | DBeaver | Beekeeper |
|---------|-------|-----------|----------|---------|-----------|
| Inline editing | ✅ | ✅ | ✅ | ✅ | ✅ |
| Schema autocomplete | ✅ | ✅ | ✅ | ✅ | ✅ |
| Export data | ✅ | ✅ | ✅ | ✅ | ✅ |
| SSH tunneling | ⬜ | ✅ | ✅ | ✅ | ✅ |
| AI assistance | ⬜ (P0) | ❌ | ✅ | ✅ | ✅ |
| MySQL | ⬜ | ✅ | ✅ | ✅ | ✅ |
| Team collaboration | ⬜ | ❌ | ✅ | ❌ | ✅ |
| Native performance | ✅ | ✅ | ❌ | ❌ | ❌ |
| Free tier | ✅ Generous | ❌ | ❌ | ✅ | ✅ |

---

## Technical Decisions

Key architecture choices made during development:

1. **Workspace Persistence:** Session-only workspaces (no restoration on restart)
   *Rationale:* Simpler state management, cleaner user experience, avoids stale connection issues

2. **Connection Management:** Keep-alive with periodic health checks
   *Rationale:* Prevents timeout interruptions during long editing sessions

3. **Autocomplete Scope:** Full SQL intelligence (tables, columns, JOINs, subqueries, keywords)
   *Rationale:* Competitive parity with TablePlus/DataGrip, essential for productivity

4. **MySQL Priority:** Remains Phase 2 (after MVP features complete)
   *Rationale:* PostgreSQL + SQLite cover 80% use cases, polish existing features first

5. **Multi-Provider Architecture:** Trait-based abstraction for database providers
   *Rationale:* Enable support for different database paradigms (SQL vs NoSQL) without code duplication. Uses Rust traits (`DatabaseProvider`, `SqlProvider`, `DocumentProvider`) and TypeScript adapters for provider-specific UI. See [architecture plan](./plans/20251216-multi-provider-architecture/).

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

## Known Issues

| Issue | Description | Workaround | Status |
|-------|-------------|------------|--------|
| DataGrid scrollbar disappears on resize | Scrollbars may disappear after window resize on macOS due to Tauri WebView/WebKit rendering bug | Re-execute query or switch tabs to force re-render | Investigating |

---

## Contributing

Contributions welcome! See the roadmap above for priority features.

## License

Proprietary. Free tier available for personal use.
