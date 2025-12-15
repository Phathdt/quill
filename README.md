# Quill

A fast, lightweight, open-source database GUI built with Tauri + React + TypeScript.

**Positioned as:** Free alternative to TablePlus/DBeaver with modern UX and AI-first design.

## Why Quill?

| | Quill | TablePlus | DBeaver | DataGrip |
|---|-------|-----------|---------|----------|
| **Price** | Free | $69-99 | Free/$249 | $99/yr |
| **Size** | ~5MB | ~50MB | ~200MB | ~500MB |
| **Speed** | Native Rust | Native | Java (slow) | Java |
| **Open Source** | ✅ | ❌ | ✅ | ❌ |

## Current Features ✅

- **Databases:** PostgreSQL, SQLite
- **Multi-Workspace:** Up to 5 simultaneous database connections
  - VS Code-style activity bar (left sidebar)
  - Right-click context menu: Close This / Close Others
  - Color-coded by database type (PostgreSQL=blue, SQLite=green)
  - Instant workspace switching (<100ms)
- **Query Editor:** Monaco-based with syntax highlighting, Cmd+Enter execution
- **Data Grid:** Virtual scrolling (handles 10k+ rows), type-aware formatting
- **Multi-tab:** Multiple query tabs per workspace
- **Connections:** Save, test, and manage database connections
- **Dark Theme:** Modern cyberpunk-inspired UI

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Zustand
- **Backend:** Tauri, Rust, sqlx (async)
- **Editor:** Monaco Editor
- **Grid:** TanStack Table + TanStack Virtual

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

### Phase 2: Daily Driver 🚗
Replace TablePlus for daily work.

| Feature | Priority | Status |
|---------|----------|--------|
| Inline cell editing | P0 | ✅ |
| Insert/delete rows UI | P0 | ✅ |
| MySQL support | P0 | ⬜ | <!-- Stays in Phase 2 per user decision -->
| SSH tunneling | P1 | ⬜ |
| SSL connections | P1 | ✅ |
| Import CSV/JSON | P1 | ✅ |
| Saved queries library | P1 | ✅ |
| Connection groups/folders | P2 | ✅ |
| Index information display | P2 | ✅ |

### Phase 3: Differentiation ✨
Features that make Quill unique.

| Feature | Priority | Strategic Value |
|---------|----------|-----------------|
| **AI SQL Assistant** | P0 | Natural language → SQL, query explanations |
| **DuckDB Support** | P1 | Analytics users, embedded analytics |
| **Safe Mode** | P1 | Prevent accidental production changes |
| **Query EXPLAIN visualization** | P2 | Visual execution plans |
| **Turso/LibSQL support** | P2 | Edge database trend |
| **Code review (change tracking)** | P2 | See what changed before commit |

### Phase 4: Power User & Enterprise 🏢

| Feature | Priority |
|---------|----------|
| SQL Server support | P1 |
| Oracle support | P2 |
| MongoDB support | P2 |
| ER diagrams | P2 |
| Schema diff/migration | P2 |
| Transaction UI (BEGIN/COMMIT/ROLLBACK) | P2 |
| Multiple windows | P3 |
| Custom themes (light mode) | P3 |
| Plugin system | P3 |
| Cloud sync | P3 |

---

## Quick Wins (Low Effort, High Impact)

These can be implemented quickly for immediate value:

1. ✅ Copy cell value (Cmd+C)
2. ✅ SQL formatter button (sql-formatter npm)
3. ✅ Export current result as CSV
4. ✅ Column header click to sort
5. ✅ Basic keyboard shortcuts

---

## Competitive Analysis

See full analysis: [`plans/reports/brainstorm-20251215-feature-gap-analysis.md`](./plans/reports/brainstorm-20251215-feature-gap-analysis.md)

### Key Gaps vs Competitors

| Missing Feature | TablePlus | DataGrip | DBeaver | Beekeeper |
|-----------------|-----------|----------|---------|-----------|
| Inline editing | ✅ | ✅ | ✅ | ✅ |
| Schema autocomplete | ✅ | ✅ | ✅ | ✅ |
| Export data | ✅ | ✅ | ✅ | ✅ |
| SSH tunneling | ✅ | ✅ | ✅ | ✅ |
| AI assistance | ❌ | ✅ | ✅ | ✅ |
| MySQL | ✅ | ✅ | ✅ | ✅ |

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

MIT
