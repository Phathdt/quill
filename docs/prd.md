# Quill 🪶

> A beautifully crafted local-first database client

**Tagline:** Write data, beautifully

---

## 🎯 Vision

Quill is a lightweight, blazingly fast database GUI tool that reimagines how developers interact with their local data. Unlike heavy Electron-based tools, Quill is built with Rust + Tauri for minimal footprint (~3-5MB) and native performance.

## ✨ Core Features

### 1. **Multi-Database Support**

- SQLite (embedded, zero-config)
- DuckDB (analytical workloads)
- Local PostgreSQL (dev environments)
- Unified interface across all databases

### 2. **Intelligent Visual Query Builder**

- Drag-and-drop table relationships
- Smart auto-completion with schema awareness
- Real-time query preview
- Save & version query templates

### 3. **Time-Travel Queries**

- View data at different points in time
- Snapshot comparison
- Rollback to previous states
- Audit trail visualization

### 4. **Jupyter-Style Notebooks**

- Mix SQL queries with markdown notes
- Data analysis with built-in transformations
- Inline visualization (charts, graphs)
- Export notebooks as runnable scripts

### 5. **Advanced Export Pipeline**

- Multi-format support: CSV, Parquet, JSON, Excel
- Built-in data transformations
- Batch export with progress tracking
- Custom export templates

### 6. **Cloud Config Sync** ☁️

- **Optional** cross-device synchronization
- Sync connections, saved queries, themes, keyboard shortcuts
- End-to-end encryption for sensitive data
- Support multiple backends:
  - MongoDB Atlas (recommended - free tier 512MB)
  - PostgreSQL/Supabase
  - Custom sync server
- **Local-first**: works perfectly offline, syncs when available
- Conflict resolution for multi-device edits

## 🛠 Tech Stack

### Backend

- **Rust** - Core engine for maximum performance
- **Tauri 2.x** - Cross-platform native wrapper
- **sqlx** - Type-safe SQL with compile-time checking
- **duckdb-rs** - DuckDB integration
- **polars** - DataFrame operations for analysis
- **mongodb** - Cloud sync client (optional)
- **ring/age** - End-to-end encryption for sync

### Frontend

- **Vite** - Lightning fast build tool & HMR
- **React** - Component-based UI with concurrent features
- **TypeScript** - Type safety for the frontend
- **TanStack Table** - Virtual scrolling for large datasets
- **TanStack Query** - Data fetching & caching
- **Monaco Editor** - VS Code's SQL editor
- **Recharts** - Data visualizations
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful UI components
- **Zustand** - Lightweight state management
- **react-hotkeys-hook** - Keyboard shortcuts

## 🎨 Design Principles

1. **Local-First** - Your data stays on your machine
2. **Performance** - Sub-100ms startup, instant queries
3. **Elegance** - Thoughtful UX, minimal clutter
4. **Extensibility** - Plugin system for custom features
5. **Privacy** - Sync is optional, encrypted by default

## 📐 Architecture Overview

```

┌─────────────────────────────────────┐
│ React + TypeScript │
│ (Query Builder, Grid, Notebooks) │
└──────────────┬──────────────────────┘
│ Tauri IPC
┌──────────────▼──────────────────────┐
│ Rust Backend │
├─────────────────────────────────────┤
│ • Connection Pool Manager │
│ • Query Executor (streaming) │
│ • Time-travel Engine │
│ • Export Pipeline │
│ • Notebook Runtime │
│ • Sync Engine (optional) ──────────┼──► MongoDB Atlas
└──────────────┬──────────────────────┘ PostgreSQL
│ Custom Server
┌──────────┼──────────┐
▼ ▼ ▼
SQLite DuckDB PostgreSQL

```

## 🔐 Sync Architecture

### What Gets Synced

```rust
// ~/.quill/config.encrypted.json
{
  "version": "1.0.0",
  "device_id": "uuid-v4",
  "last_sync": "2024-01-15T10:30:00Z",

  // Encrypted with user's passphrase
  "encrypted_data": {
    "connections": [...],      // DB connection strings
    "saved_queries": [...],    // User's query library
    "notebooks": [...],        // Notebook files
    "preferences": {           // UI preferences
      "theme": "dark",
      "keymap": "vim",
      "font_size": 14
    },
    "snippets": [...]         // Custom SQL snippets
  }
}
```

### Sync Backends (Choose One)

#### Option 1: MongoDB Atlas (Recommended)

```toml
# Cargo.toml
[dependencies]
mongodb = "2.8"
```

```rust
// Free tier: 512MB storage
// Collection: user_configs
{
  _id: ObjectId,
  user_id: "email_hash",
  device_id: "uuid",
  encrypted_blob: Binary,
  updated_at: DateTime,
  checksum: String
}
```

**Pros:**

- Free tier generous
- Easy setup
- Built-in replication
- Fast global CDN

#### Option 2: PostgreSQL/Supabase

```toml
[dependencies]
sqlx = { version = "0.7", features = ["postgres"] }
```

```sql
CREATE TABLE quill_configs (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  encrypted_data BYTEA NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  checksum TEXT NOT NULL,
  UNIQUE(user_id, device_id)
);
```

**Pros:**

- Self-hostable
- SQL familiarity
- Supabase free tier

#### Option 3: Custom Sync Server

```rust
// Minimal Rust server with Axum
// For advanced users who want full control
```

### Encryption Strategy

```rust
// User sets a sync passphrase (NOT stored anywhere)
// Derive encryption key using Argon2
use argon2::Argon2;

let key = argon2_derive_key(passphrase, salt);

// Encrypt config with ChaCha20-Poly1305
let encrypted = encrypt_config(config, key);

// Only encrypted blob goes to cloud
// Keys never leave the device
```

### Conflict Resolution

```rust
// CRDT-like approach for merges
enum SyncStrategy {
  LastWriteWins,        // Simple, default
  PerFieldMerge,        // Merge non-conflicting fields
  Manual,               // Show conflicts to user
}

// Example: Merge saved queries from both devices
fn merge_configs(local: Config, remote: Config) -> Config {
  Config {
    connections: merge_connections(local.connections, remote.connections),
    saved_queries: union(local.queries, remote.queries), // Combine both
    preferences: last_write_wins(local.prefs, remote.prefs),
  }
}
```

## 📂 Project Structure

```
quill/
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/       # Tauri commands
│   │   ├── db/            # Database drivers
│   │   │   ├── sqlite.rs
│   │   │   ├── duckdb.rs
│   │   │   └── postgres.rs
│   │   ├── query/         # Query engine
│   │   ├── export/        # Export pipeline
│   │   ├── snapshot/      # Time-travel
│   │   └── sync/          # Cloud sync ⭐
│   │       ├── mod.rs
│   │       ├── encryption.rs
│   │       ├── backends/
│   │       │   ├── mongodb.rs
│   │       │   ├── postgres.rs
│   │       │   └── custom.rs
│   │       └── conflict.rs
│   └── Cargo.toml
│
├── src/                   # React frontend
│   ├── components/
│   │   ├── QueryBuilder/
│   │   ├── DataGrid/
│   │   ├── SqlEditor/
│   │   ├── Notebook/
│   │   ├── Sidebar/
│   │   └── SyncSettings/  # Sync configuration UI ⭐
│   ├── hooks/
│   │   └── useSync.ts     # React hook for sync ⭐
│   ├── lib/
│   ├── stores/
│   ├── types/
│   ├── App.tsx
│   └── main.tsx
│
├── package.json
└── tsconfig.json
```

## 🚀 MVP Roadmap

### Phase 1: Foundation (Week 1-2)

- [ ] Tauri project setup with Rust backend
- [ ] React + TypeScript + Tailwind setup
- [ ] SQLite connection & basic queries
- [ ] Simple table viewer with TanStack Table
- [ ] Monaco Editor integration for SQL

### Phase 2: Core Features (Week 3-4)

- [ ] Visual query builder (React DnD)
- [ ] DuckDB integration
- [ ] Export to CSV/JSON
- [ ] Connection manager UI (modal/sidebar)
- [ ] Query history with TanStack Query

### Phase 3: Advanced (Week 5-6)

- [ ] Time-travel queries (snapshot system)
- [ ] Notebook interface (markdown + SQL cells)
- [ ] PostgreSQL support
- [ ] Parquet export
- [ ] Data visualization with Recharts

### Phase 4: Polish (Week 7-8)

- [ ] Performance optimization (React.memo, useMemo)
- [ ] Error handling & recovery
- [ ] Keyboard shortcuts (react-hotkeys-hook)
- [ ] Dark/light themes (next-themes)
- [ ] Documentation site (Nextra/Docusaurus)

### Phase 5: Cloud Sync ⭐ (Week 9-10)

- [ ] Encryption engine (ChaCha20-Poly1305)
- [ ] MongoDB Atlas integration
- [ ] Sync UI (enable/disable, choose backend)
- [ ] Conflict resolution UI
- [ ] Multi-device testing
- [ ] Optional: PostgreSQL backend
- [ ] Optional: Self-hosted server

## 🎯 Success Metrics

- **Binary Size:** < 5MB (sync adds ~500KB)
- **Startup Time:** < 100ms cold start
- **Query Performance:** Handle 1M+ row tables smoothly
- **Memory Usage:** < 50MB idle, < 200MB under load
- **Sync Speed:** < 1s for typical config (~50KB encrypted)
- **React Re-renders:** Optimized with proper memoization

## 🔧 Key React Patterns

### State Management

```typescript
// Zustand for global state
const useConnectionStore = create((set) => ({
  connections: [],
  activeConnection: null,
  addConnection: (conn) =>
    set((state) => ({
      connections: [...state.connections, conn],
    })),
}))

// Sync store ⭐
const useSyncStore = create((set) => ({
  syncEnabled: false,
  lastSync: null,
  syncing: false,
  backend: 'mongodb', // 'mongodb' | 'postgres' | 'custom'
}))
```

### Tauri Integration

```typescript
// Custom hook for Tauri commands
const useQuery = (sql: string) => {
  return useQuery({
    queryKey: ['query', sql],
    queryFn: () => invoke('execute_query', { sql }),
  })
}

// Sync hook ⭐
const useSync = () => {
  const triggerSync = async () => {
    await invoke('sync_config', { force: true })
  }

  const enableSync = async (backend: string, credentials: any) => {
    await invoke('enable_sync', { backend, credentials })
  }

  return { triggerSync, enableSync }
}
```

### Virtual Scrolling

```typescript
// TanStack Table with virtualization
const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
})
```

## 🔒 Security & Privacy

### Sync Security Model

1. **Zero-knowledge**: Server never sees unencrypted data
2. **Passphrase-based**: User chooses strong sync passphrase
3. **Device-specific keys**: Each device has unique salt
4. **Optional 2FA**: For MongoDB Atlas/Supabase accounts
5. **Audit log**: Track sync history locally

### What's NOT Synced

- Database credentials stored in system keychain
- Actual database data (only metadata)
- Local cache/temp files
- Analytics (we don't collect any)

## 🔮 Future Ideas

- Plugin system for custom data sources
- Collaborative features (share queries/notebooks)
- AI-powered query suggestions (local LLM)
- ~~Cloud sync for settings~~ ✅ (In MVP)
- CLI companion tool
- VS Code extension
- Team workspaces (multi-user sync)
- Git-like version control for queries

## 📦 Distribution

- **GitHub Releases** - Pre-built binaries
- **Homebrew** (macOS) - `brew install quill`
- **Chocolatey** (Windows) - `choco install quill`
- **Snap/Flatpak** (Linux)

## 💰 Monetization (Optional)

Free forever for core features. Optional paid plans:

- **Free**: Local-only, unlimited
- **Sync (Free)**: MongoDB Atlas/Supabase (user provides own account)
- **Quill Cloud ($5/mo)**: Managed sync, 1GB storage, no setup
- **Teams ($15/user/mo)**: Shared connections, team notebooks

## 🪶 Why "Quill"?

The quill represents precision, craftsmanship, and the art of writing. Just as a quill was used to craft elegant prose, Quill helps you craft elegant queries and understand your data beautifully.

---

**License:** MIT (or Apache 2.0)
**Repository:** `github.com/quilldb/quill`
**Website:** `quilldb.dev`

Let's build something beautiful. 🪶
