# Quill Codebase Summary

**Generated:** 2025-12-16 | **Version:** 1.0

## Quick Stats

| Metric | Value |
|--------|-------|
| **Total Files** | 131 |
| **Total Characters** | 482,464 |
| **Total Tokens** | 117,527 |
| **Primary Language** | TypeScript / Rust |
| **Frontend Files** | ~103 |
| **Backend Files** | ~28 |

## Directory Structure

```
quill/
├── src/                          # React Frontend (103 files)
│   ├── components/               # 87 UI components
│   │   ├── ActivityBar/           # Workspace management sidebar
│   │   ├── DataGrid/              # Main table display with virtual scrolling
│   │   ├── Filter/                # SQL-based table filtering
│   │   ├── Import/                # CSV/JSON import dialog
│   │   ├── Layout/                # Shell, Header, Sidebar, StatusBar
│   │   ├── QueryEditor/           # Monaco-based SQL editor
│   │   ├── SavedQueries/          # Saved query library management
│   │   ├── TableStructure/        # Schema viewer (columns, indexes, FKs)
│   │   ├── Welcome/               # Connection management
│   │   ├── Workspace/             # Tab management and workspace content
│   │   └── ui/                    # 15 Radix UI primitives
│   ├── hooks/                    # 4 custom React hooks
│   │   ├── useExecuteQuery        # Query execution with loading/error states
│   │   ├── useGlobalShortcuts     # Cmd+Enter, Cmd+T, Cmd+W handlers
│   │   ├── useInlineEditing       # Cell editing and row operations
│   │   └── useTableFilter         # Column filtering with SQL
│   ├── stores/                   # 7 Zustand stores
│   │   ├── workspaceManagerStore  # Multi-workspace orchestration (5 max)
│   │   ├── connectionStore        # Saved connections (persisted)
│   │   ├── schemaStore            # Table/column schema cache
│   │   ├── queryHistoryStore      # Query history
│   │   ├── savedQueriesStore      # Saved query library
│   │   ├── workspaceStore         # Single workspace state
│   │   └── queryStore             # Query execution state
│   ├── lib/                      # 12 utility modules
│   │   ├── sql-autocomplete       # Schema-aware SQL completion
│   │   ├── sql-formatter          # SQL prettification
│   │   ├── sql-filter             # Filter SQL generation
│   │   ├── clipboard              # Copy/paste operations
│   │   ├── export                 # CSV/JSON export
│   │   ├── tauri                  # Tauri IPC wrapper
│   │   ├── storage                # LocalStorage management
│   │   ├── toast                  # Toast notifications
│   │   └── utils                  # Common utilities
│   ├── pages/                    # 2 route pages
│   │   ├── WelcomePage            # Connection selection/creation
│   │   └── WorkspacePage          # Main database workspace
│   ├── types/                    # 9 TypeScript interfaces
│   │   ├── connection.ts          # DatabaseConnection, ConnectionConfig
│   │   ├── schema.ts              # Table, Column, Index, ForeignKey
│   │   ├── editing.ts             # EditingState, PendingChange
│   │   ├── workspace.ts           # Workspace, Tab types
│   │   ├── database.ts            # DatabaseType enum
│   │   └── others                 # Import, SavedQuery, QueryHistory types
│   ├── styles/                   # Global Tailwind CSS
│   └── main.tsx                  # React root

├── src-tauri/                    # Rust Backend
│   ├── src/
│   │   ├── main.rs               # Tauri app initialization, command registration
│   │   ├── commands/             # 14 IPC command handlers
│   │   │   ├── query.rs          # execute_query, connect/disconnect, CRUD ops
│   │   │   ├── schema.rs         # get_tables_list, get_table_structure
│   │   │   └── import.rs         # preview_import_file, import_data
│   │   ├── db/
│   │   │   ├── connection.rs     # MultiDbState, DbPool (Postgres/SQLite)
│   │   │   ├── executor.rs       # SQL execution, value extraction
│   │   │   └── mod.rs            # Module exports
│   │   ├── models/
│   │   │   ├── query_result.rs   # QueryResult, Column, RowValue
│   │   │   └── mod.rs            # Module exports
│   │   └── error.rs              # AppError enum
│   ├── Cargo.toml                # Rust dependencies
│   ├── tauri.conf.json           # Tauri app config
│   └── build.rs                  # Build script

├── Config Files
│   ├── package.json              # npm dependencies and scripts
│   ├── tsconfig.json             # TypeScript configuration
│   ├── vite.config.ts            # Vite bundler config
│   ├── tailwind.config.js        # Tailwind CSS themes
│   ├── eslint.config.js          # Code linting rules
│   ├── components.json           # shadcn/ui config
│   └── .prettierrc                # Code formatting config

└── Documentation
    └── README.md                 # Project overview and roadmap
```

## Component Dependency Map

### Core Architecture Layers

```
React App (src/App.tsx)
  ├── WelcomePage
  │   └── Welcome/ (Connection management)
  │       └── connectionStore (Zustand)
  │
  └── WorkspacePage
      ├── ActivityBar (Workspace list)
      ├── Layout (Shell, Header, StatusBar)
      ├── WorkspaceContent
      │   ├── InnerTabBar (Tab management)
      │   ├── QueryEditor + EditorToolbar
      │   └── DataGrid + GridToolbar
      │
      └── Stores (Zustand)
          ├── workspaceManagerStore (orchestrator)
          ├── schemaStore (table metadata)
          ├── queryHistoryStore (history)
          └── savedQueriesStore (library)
```

### Tauri Backend Layer

```
Tauri Commands (src-tauri/src/main.rs)
  ├── query.rs
  │   ├── execute_query(sql, workspace_id)
  │   ├── connect(connection_config, workspace_id)
  │   ├── disconnect(workspace_id)
  │   ├── insert_row(table, values)
  │   ├── update_row(table, id, values)
  │   └── delete_row(table, id)
  │
  ├── schema.rs
  │   ├── get_tables_list(workspace_id)
  │   ├── get_table_structure(table_name)
  │   └── get_primary_key(table_name)
  │
  └── import.rs
      ├── preview_import_file(file_path)
      └── import_data(file_path, table_name)

Database Layer (src-tauri/src/db/)
  ├── connection.rs (Connection pooling)
  ├── executor.rs (SQL execution)
  └── models/ (Data structures)
```

## Top 5 Largest Files (by token count)

| File | Tokens | Purpose |
|------|--------|---------|
| workspaceManagerStore.ts | 6,634 | Multi-workspace state orchestration |
| NewConnectionModal.tsx | 4,496 | Connection creation UI |
| query.rs | 4,376 | Main SQL execution command |
| DataGrid.tsx | 3,772 | Grid rendering with virtual scrolling |
| README.md | 4,077 | Project roadmap |

## Key Technologies

### Frontend Stack
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Zustand** - State management
- **TanStack Table** - Data grid
- **TanStack Virtual** - Virtual scrolling
- **Monaco Editor** - SQL editor
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible components
- **Vite** - Build tool

### Backend Stack
- **Tauri** - Desktop framework
- **Rust** - System language
- **sqlx** - Async SQL executor
- **tokio** - Async runtime
- **serde** - Serialization

### Data Access
- **PostgreSQL** - Primary RDBMS
- **SQLite** - File-based DB
- **SSL/TLS** - Encrypted connections

## Feature Hotspots

### Multi-Workspace Management
- **File:** `workspaceManagerStore.ts` (6,634 tokens)
- **Purpose:** Orchestrates up to 5 concurrent database connections
- **Key Methods:** addWorkspace, removeWorkspace, switchWorkspace, updateTab

### Data Grid Display
- **File:** `DataGrid.tsx` + supporting components
- **Purpose:** Renders query results with virtual scrolling (10k+ rows)
- **Key Features:** Inline editing, column sorting, filtering, cell copying

### SQL Editor
- **File:** `QueryEditor.tsx` + `sql-autocomplete.ts`
- **Purpose:** Monaco-based editor with schema-aware autocomplete
- **Key Features:** Syntax highlighting, Cmd+Enter execution

### Inline Editing
- **File:** `useInlineEditing.ts`, `DataGrid/` components
- **Purpose:** Cell-level editing with pending changeset
- **Key Features:** SQL preview, parameterized queries, batch operations

### Connection Management
- **File:** `Welcome/`, `connectionStore.ts`
- **Purpose:** Save, test, and manage database connections
- **Key Features:** SSL config, connection groups, persistence

## Database Support Matrix

| Database | Support | Notes |
|----------|---------|-------|
| PostgreSQL | ✅ | Full support with SSL |
| SQLite | ✅ | File-based, no SSL needed |
| MySQL | ⬜ | Planned Phase 2 |
| Other | ⬜ | Future expansion |

## Code Organization Principles

1. **Component-driven UI** - Self-contained components with co-located styles
2. **Store-based state** - Zustand for client state, RwLock for server state
3. **Utility separation** - SQL logic in lib/, not component logic
4. **Type safety** - Strict TypeScript, interfaces for all data structures
5. **IPC abstraction** - Tauri commands wrapped in utility functions
6. **Error handling** - Try-catch patterns with AppError enum on backend

## Development Workflow

### Frontend Development
```bash
yarn install          # Install dependencies
yarn vite:dev         # Start Vite dev server
yarn type-check       # TypeScript check
yarn lint             # ESLint check
yarn format           # Prettier format
```

### Full Stack Development
```bash
yarn install          # Install all dependencies
yarn tauri dev        # Run Tauri with hot reload
yarn tauri build      # Production build
```

### Backend Testing
- Unit tests in Rust using `#[cfg(test)]` modules
- Parameterized query testing for SQL injection prevention
- Connection pooling verification

## Performance Optimizations

1. **Virtual Scrolling** - TanStack Virtual renders only visible rows
2. **Server-side Filtering** - SQL WHERE clauses, not client-side filtering
3. **Schema Caching** - schemaStore reduces metadata queries
4. **Connection Pooling** - sqlx connection reuse
5. **Debounced Autocomplete** - Reduces unnecessary completion requests

## Security Measures

1. **Parameterized Queries** - All sqlx queries use bound parameters
2. **SSL/TLS Support** - PostgreSQL connections encrypted
3. **SQL Injection Prevention** - No string interpolation in queries
4. **Type Safety** - TypeScript prevents type coercion exploits
5. **IPC Validation** - Tauri validates all command inputs

## Testing Coverage

- Unit tests for utility functions (sql-formatter, sql-filter, etc.)
- Integration tests for IPC commands
- E2E tests for multi-workspace workflows (future)
- Database-specific tests for PostgreSQL and SQLite

## Known Limitations

1. **Max 5 Workspaces** - Enforced by workspaceManagerStore
2. **No Persistence** - Workspaces are session-only
3. **Single Tab Focus** - Only one tab active per workspace
4. **Client-side History** - Query history not synced to backend
5. **No Offline Mode** - Requires active database connection
