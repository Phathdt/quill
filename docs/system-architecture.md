# Quill System Architecture

**Version:** 1.0 | **Last Updated:** 2025-12-16

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface (Web)                     │
│  React 19 + TypeScript + Tailwind CSS + Radix UI               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Welcome Page           │  Workspace Page                │  │
│  │ - Connection mgmt      │  - Query Editor (Monaco)       │  │
│  │ - Test connection      │  - Data Grid (TanStack Table)  │  │
│  │ - Connection groups    │  - Activity Bar (Workspaces)   │  │
│  │ - SSL config           │  - Tabs, Filters, Status Bar   │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                    IPC Bridge (Tauri)
                             │
┌────────────────────────────┴─────────────────────────────────────┐
│                    Tauri Desktop Shell                           │
│  Rust Backend + Command Handler + State Management              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Commands:                                                │  │
│  │ - execute_query                                          │  │
│  │ - connect/disconnect                                    │  │
│  │ - get_tables_list / get_table_structure                 │  │
│  │ - insert_row / update_row / delete_row                  │  │
│  │ - preview_import_file / import_data                     │  │
│  │                                                          │  │
│  │ State: RwLock<HashMap<workspace_id, DbPool>>            │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬─────────────────────────────────────┘
                             │
              Database Connection Layer
                   (sqlx async executor)
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
    PostgreSQL            SQLite                 SSH
    (with SSL/TLS)        (file-based)         Tunnel
        │                    │                    │
┌───────▼──────────┐  ┌──────▼──────────┐  ┌─────▼──────────┐
│ Production DB    │  │ Local DB        │  │ Remote DB      │
│ Port 5432        │  │ .db file        │  │ Port 22/3306   │
└──────────────────┘  └─────────────────┘  └────────────────┘
```

## Frontend Architecture

### State Management Hierarchy

```
Zustand Stores (Client-side State)
│
├── workspaceManagerStore (Root orchestrator)
│   └── Manages: workspaces[], activeWorkspaceId, max 5 connections
│
├── workspaceStore (Per-workspace state)
│   └── Manages: activeTab, tabs[], query results
│
├── schemaStore (Schema cache)
│   └── Manages: tables[], columns[], indexes[], FK relationships
│
├── connectionStore (Persisted)
│   └── Manages: savedConnections[], groups[]
│
├── queryHistoryStore
│   └── Manages: recentQueries[] (session memory)
│
├── savedQueriesStore (Persisted)
│   └── Manages: savedQueries[], categories[]
│
└── queryStore
    └── Manages: currentQuery, executionState (loading/error)
```

### Component Tree

```
App
│
├── WelcomePage
│   ├── WelcomeScreen
│   │   ├── ConnectionCard (per saved connection)
│   │   │   ├── ConnectionGroupHeader
│   │   │   └── Context menu: Connect/Edit/Delete
│   │   ├── NewConnectionModal
│   │   │   ├── DatabaseTypeModal (PostgreSQL/SQLite)
│   │   │   ├── ConnectionForm
│   │   │   └── SslConfigForm
│   │   └── CreateGroupDialog
│   │
│   └── Actions:
│       ├── Create connection
│       ├── Test connection
│       ├── Connect to DB (switch to WorkspacePage)
│       └── Organize into groups
│
└── WorkspacePage
    │
    ├── Layout
    │   ├── Header
    │   │   ├── Breadcrumb (database/schema info)
    │   │   ├── Connection status indicator
    │   │   └── Search bar (future)
    │   │
    │   ├── Sidebar (vertical tabs)
    │   │   └── ActivityBar
    │   │       ├── WorkspaceIcon (per workspace)
    │   │       │   └── WorkspaceTooltip (on hover)
    │   │       └── Context menu: Close/Close Others
    │   │
    │   └── StatusBar
    │       ├── Row count from last query
    │       ├── Query execution time
    │       ├── Workspace count
    │       └── Current database type badge
    │
    └── Content Area
        │
        ├── QueryEditor
        │   ├── Monaco Editor
        │   │   ├── SQL syntax highlighting
        │   │   ├── Schema-aware autocomplete
        │   │   └── Keyboard shortcuts
        │   │
        │   └── EditorToolbar
        │       ├── Run (Cmd+Enter)
        │       ├── Format SQL
        │       ├── Clear
        │       └── Save query
        │
        ├── InnerTabBar
        │   ├── Tab per query
        │   ├── Close button
        │   └── Unsaved indicator
        │
        ├── DataGrid
        │   ├── GridToolbar
        │   │   ├── Export (CSV/JSON)
        │   │   ├── Copy
        │   │   ├── Refresh
        │   │   ├── Insert row
        │   │   ├── Delete selected
        │   │   └── Filter
        │   │
        │   ├── Table headers
        │   │   ├── Click to sort
        │   │   ├── Resize columns
        │   │   └── Type indicator (string/number/json)
        │   │
        │   ├── Virtual rows (TanStack Virtual)
        │   │   ├── Cell content
        │   │   ├── Click to edit
        │   │   ├── Copy to clipboard
        │   │   └── Context menu
        │   │
        │   ├── Editing UI (when active)
        │   │   ├── Input field overlay
        │   │   ├── Type-aware input
        │   │   └── Esc/Enter to confirm
        │   │
        │   └── Pending Changeset
        │       ├── EditingToolbar
        │       ├── Preview SQL
        │       ├── Apply changes
        │       └── Discard changes
        │
        ├── Filter (toggle)
        │   ├── FilterPopup
        │   ├── Column selector
        │   ├── Operator (=, <, >, LIKE, IN)
        │   ├── Value input
        │   └── Apply SQL WHERE clause
        │
        ├── TableStructure (toggle)
        │   ├── ColumnsTable
        │   │   └── Column info: name, type, nullable, default
        │   ├── IndexesTable
        │   │   └── Index: name, columns, unique
        │   └── ForeignKeysTable
        │       └── FK: column, referenced table, referenced column
        │
        ├── SavedQueries (sidebar)
        │   ├── SavedQueriesPanel
        │   ├── Search/filter
        │   ├── Click to load
        │   └── SaveQueryDialog (new)
        │
        └── Other Modals
            ├── ImportDialog
            ├── ConnectModal (switch workspace)
            └── DeleteConfirmDialog (before delete ops)
```

## IPC Command Flow

### Query Execution Flow

```
User Types SQL in Monaco Editor
    │
    ├── [Cmd+Enter] Keyboard Shortcut
    │
    ├── useExecuteQuery hook triggered
    │
    ├── Validate SQL (optional client-side check)
    │
    ├── Tauri invoke('execute_query', {sql, workspaceId})
    │
    ├── [IPC Bridge]
    │
    ├── Tauri Backend: commands/query.rs::execute_query()
    │   ├── Get DbPool from workspaceId
    │   ├── executor::execute(&pool, &sql).await
    │   ├── Check for errors
    │   └── Return QueryResult
    │
    ├── [IPC Bridge]
    │
    ├── Frontend receives QueryResult
    │
    ├── Update queryStore with results
    │
    ├── DataGrid re-renders with virtual scrolling
    │
    ├── User can:
    │   ├── Edit cells (inline editing)
    │   ├── Sort columns
    │   ├── Filter results
    │   ├── Export to CSV/JSON
    │   └── Copy cells to clipboard
    │
    └── Pending changes tracked in workspaceManagerStore
```

### Connection Flow

```
User Selects "Connect" on Welcome Page
    │
    ├── New connection params selected
    │
    ├── Optional: Test connection (test_connection command)
    │
    ├── Tauri invoke('connect', {connectionConfig, workspaceId})
    │
    ├── [IPC Bridge]
    │
    ├── Tauri Backend: commands/query.rs::connect()
    │   ├── Parse connection config
    │   ├── Apply SSL/TLS if needed
    │   ├── Create sqlx Pool
    │   ├── Store in MultiDbState RwLock
    │   └── Return success
    │
    ├── [IPC Bridge]
    │
    ├── Frontend receives success
    │
    ├── workspaceManagerStore.addWorkspace()
    │
    ├── schemaStore.loadSchema(workspaceId)
    │   ├── Get tables list
    │   ├── Get column info per table
    │   ├── Get indexes
    │   └── Cache in schemaStore
    │
    ├── Switch to WorkspacePage
    │
    └── Ready for queries
```

### Inline Editing Flow

```
User Clicks Cell in DataGrid
    │
    ├── DataGrid.tsx onClick handler
    │
    ├── useInlineEditing hook activates
    │   ├── Store cell reference
    │   ├── Show editing input
    │   └── Capture user changes
    │
    ├── User Types New Value
    │   ├── onChange updates editingState
    │   └── Real-time validation (optional)
    │
    ├── User Presses Enter or Clicks Outside
    │   ├── Validate new value
    │   ├── Track in pendingChanges
    │   ├── Show EditingToolbar
    │   └── Generate SQL preview
    │
    ├── User Reviews SQL Preview
    │   ├── SQL shows: UPDATE table SET column = $1 WHERE id = $2
    │   ├── Can edit more cells
    │   ├── Can add new rows
    │   ├── Can delete rows
    │   └── Or discard all changes
    │
    ├── User Clicks "Apply Changes"
    │   ├── Batch all pending changes
    │   ├── Tauri invoke('apply_changes', {...})
    │   ├── Backend executes all SQLs (or transaction)
    │   ├── Return success/error
    │   └── Refresh DataGrid
    │
    └── Changes Applied (or error shown)
```

## Backend Architecture (Tauri + Rust)

### State Management

```rust
// Main state struct passed to commands
pub struct AppState {
  db_state: RwLock<MultiDbState>,
}

// Per-workspace database pool
pub struct MultiDbState {
  pools: HashMap<String, DbPool>, // workspace_id -> pool
}

// Database pool enum
pub enum DbPool {
  Postgres(sqlx::PgPool),
  Sqlite(sqlx::SqlitePool),
}

// Workspace limits
const MAX_WORKSPACES: usize = 5;
```

### Command Handlers

#### Query Commands (commands/query.rs)
- `execute_query(sql, workspace_id)` → QueryResult
- `connect(connection_config, workspace_id)` → success/error
- `disconnect(workspace_id)` → success
- `test_connection(connection_config)` → success/error
- `insert_row(table, values, workspace_id)` → inserted row
- `update_row(table, where_clause, values, workspace_id)` → rows affected
- `delete_row(table, where_clause, workspace_id)` → rows affected

#### Schema Commands (commands/schema.rs)
- `get_tables_list(workspace_id)` → Table[]
- `get_table_structure(table_name, workspace_id)` → Column[], Index[], FK[]
- `get_primary_key(table_name, workspace_id)` → Column

#### Import Commands (commands/import.rs)
- `preview_import_file(file_path)` → preview data
- `import_data(file_path, table_name, workspace_id)` → rows imported

### Database Executor

```rust
// db/executor.rs
pub async fn execute(
  pool: &DbPool,
  sql: &str,
) -> Result<QueryResult, AppError> {
  // 1. Parse SQL type (SELECT, INSERT, UPDATE, DELETE)
  // 2. Execute with parameterized query
  // 3. Extract column metadata
  // 4. Build QueryResult struct
  // 5. Return with timing info
}

// Type extraction by database
// PostgreSQL: use TYPE::OID to determine types
// SQLite: use PRAGMA table_info() for metadata
```

### Connection Management

```rust
// db/connection.rs
pub struct ConnectionConfig {
  host: String,
  port: u16,
  database: String,
  username: String,
  password: String,
  ssl_config: Option<SslConfig>,
}

// SSL/TLS for PostgreSQL
pub struct SslConfig {
  mode: SslMode, // require, prefer, disable
  root_ca: Option<Vec<u8>>,
}

// Connection pooling
let pool = PgPoolOptions::new()
  .max_connections(5)       // per workspace
  .idle_timeout(Duration::from_secs(300))
  .acquire_timeout(Duration::from_secs(30))
  .connect(&url)
  .await?;
```

## Data Flow Patterns

### Query Result Serialization

```
Rust QueryResult
  │
  ├── rows: Vec<DynamicRow>
  │   └── Each row contains values (String repr)
  │
  ├── columns: Vec<Column>
  │   ├── name: String
  │   ├── data_type: String
  │   └── nullable: bool
  │
  └── metadata: QueryMetadata
      ├── duration_ms: f64
      ├── rows_affected: usize
      └── total_rows: usize
          │
          ├── [serde serialization]
          │
          ├── JSON over IPC
          │
          ├── Frontend receives JSON
          │
          ├── TypeScript parsing
          │   └── Type-safe record[]
          │
          └── React re-renders DataGrid
```

## Performance Optimizations

### 1. Virtual Scrolling
- **Technology:** TanStack Virtual
- **Benefit:** Renders only visible rows (~50 visible, not 10k)
- **Where:** DataGrid component
- **Impact:** 10k+ row queries remain responsive

### 2. Connection Pooling
- **Technology:** sqlx PgPoolOptions
- **Benefit:** Reuse connections, no reconnection overhead
- **Where:** db/connection.rs
- **Impact:** 50ms+ saved per query

### 3. Schema Caching
- **Technology:** Zustand schemaStore
- **Benefit:** Avoid repeated INFORMATION_SCHEMA queries
- **Where:** Frontend store
- **Impact:** Autocomplete instant response

### 4. Server-side Filtering
- **Technology:** SQL WHERE clauses
- **Benefit:** Filter at DB level, not in memory
- **Where:** Filter component + sql-filter.ts
- **Impact:** Reduced network payload

### 5. Debounced Autocomplete
- **Technology:** debounce() utility
- **Benefit:** Avoid excessive completion requests
- **Where:** QueryEditor component
- **Impact:** Reduced backend load

## Security Architecture

### SQL Injection Prevention

```
User Input → No string interpolation → sqlx parameterized query
             Always use .bind() for user values

Example:
  ✅ sqlx::query("SELECT * FROM users WHERE id = ?").bind(user_id)
  ❌ sqlx::query(&format!("SELECT * FROM users WHERE id = {}", user_id))
```

### Connection Security

```
Password Storage:
  - In-memory during session
  - Optional: Store in OS keychain (future)
  - Encrypted at rest (future)

SSL/TLS:
  - PostgreSQL supports SSL mode
  - Root CA verification (optional)
  - Cert pinning (future)

SSH Tunneling:
  - Not yet implemented (Phase 2)
  - Will proxy connections through SSH
```

### Type Safety

```
TypeScript Compilation:
  - Prevents type coercion exploits
  - Ensures all data is type-checked
  - Strict null checks enabled

Rust Memory Safety:
  - Ownership prevents buffer overflows
  - No null pointer dereferences
  - Borrowing prevents use-after-free
```

## Scalability Considerations

### Current Limits
- **Max workspaces:** 5 (enforced in code)
- **Max rows displayed:** Limited by browser memory + virtual scrolling
- **Connection pool size:** 5 per workspace

### Future Scalability
- **Remote backend:** Move Tauri server to cloud
- **Database replication:** Master-slave setup
- **Caching layer:** Redis for frequently accessed schemas
- **Query queuing:** For slow queries
- **Worker threads:** Offload heavy computations

## Error Handling Architecture

### Frontend Error Flow

```
React Component
  │
  └─→ try {
        await invoke('command', ...)
      } catch (error) {
        toast.error(error.message)
        log to queryStore
      }
```

### Backend Error Flow

```
Tauri Command
  │
  └─→ Operation Result<T>
      │
      ├─ Match Ok(value) → serialize & return
      │
      └─ Match Err(error) → convert to AppError
                              │
                              └─ Serialize error
                                 │
                                 └─ Send over IPC
                                    │
                                    └─ Frontend toast
```

## Testing Architecture

### Unit Tests
- SQL formatter tests (lib tests)
- Store logic tests (Zustand)
- Rust command tests (Tauri)

### Integration Tests
- Multi-workspace workflows
- Connection → Schema → Query → Edit flows
- Error recovery scenarios

### E2E Tests (Future)
- Complete user workflows
- UI interactions
- Database operations

## Technology Stack Justification

| Component | Technology | Why |
|-----------|-----------|-----|
| UI Framework | React 19 | Modern, component-driven, large ecosystem |
| Type System | TypeScript | Type safety, IDE support, prevents runtime errors |
| State Mgmt | Zustand | Lightweight, minimal boilerplate, performant |
| Styling | Tailwind CSS | Utility-first, rapid development, consistent design |
| Grid | TanStack Table | Headless, flexible, virtual scrolling support |
| Editor | Monaco | Industry standard, used by VS Code |
| Desktop | Tauri | Lightweight, native performance, Rust backend |
| DB Driver | sqlx | Type-safe, compile-time checked queries |
| SQL Runtime | Rust async | Non-blocking, efficient, memory-safe |

## Deployment Architecture (Future)

```
Current (Desktop):
  [Tauri App] ← [sqlite/postgres/ssh]

Future (Web):
  [Web UI] → [Cloud Backend] → [Database]
  [Cloud Backend] runs Quill Server (Rust/Actix)

Future (Team):
  [Web UI] → [API Server] → [Database] + [Auth] + [Audit]
```
