# Quill Code Standards & Best Practices

**Version:** 1.0 | **Last Updated:** 2025-12-16

## File Organization & Structure

### Frontend (React/TypeScript)

**File Naming Conventions:**
```
Components:        PascalCase.tsx          (e.g., DataGrid.tsx, QueryEditor.tsx)
Custom Hooks:      useNameHook.ts          (e.g., useExecuteQuery.ts)
Utilities:         kebab-case.ts           (e.g., sql-formatter.ts)
Stores:            nameStore.ts            (e.g., workspaceManagerStore.ts)
Types/Interfaces:  kebab-case.ts           (e.g., connection.ts, schema.ts)
Constants:         SCREAMING_SNAKE_CASE    (in respective files)
```

**Directory Rules:**
- Keep components under 200 lines where possible
- Co-locate related files (component + tests in same folder)
- Use index.ts for folder exports
- Separate UI primitives into `ui/` subdirectory

**Example Structure:**
```
src/
├── components/
│   ├── DataGrid/
│   │   ├── DataGrid.tsx           # Main component
│   │   ├── cell-value.tsx         # Subcomponent
│   │   ├── ContextMenu.tsx        # Subcomponent
│   │   ├── index.ts               # Exports
│   │   └── use-data-grid-keyboard.ts  # Custom hook
│   └── index.ts
├── hooks/
│   └── useExecuteQuery.ts
└── stores/
    └── workspaceManagerStore.ts
```

### Backend (Rust)

**File Naming:**
```
Module files:      mod.rs or module_name.rs
Commands:          query.rs, schema.rs, import.rs
Database:          connection.rs, executor.rs
Models:            query_result.rs
```

**Rust Organization:**
```
src-tauri/src/
├── main.rs              # Entry point, command registration
├── error.rs             # AppError enum
├── commands/
│   ├── mod.rs          # Re-exports
│   ├── query.rs        # Query commands
│   ├── schema.rs       # Schema commands
│   └── import.rs       # Import commands
├── db/
│   ├── mod.rs
│   ├── connection.rs   # DbPool, connection management
│   └── executor.rs     # SQL execution
└── models/
    ├── mod.rs
    └── query_result.rs # Data structures
```

## TypeScript Patterns

### Type Definitions

**Always define types upfront:**
```typescript
// ✅ Good: Explicit types
interface QueryResult {
  rows: Record<string, unknown>[];
  columns: Column[];
  duration: number;
}

// ❌ Bad: Implicit any
const executeQuery = (sql) => { ... }
```

**Union types for variants:**
```typescript
// ✅ Good
type DatabaseType = 'postgres' | 'sqlite' | 'mysql';
type ConnectionStatus = 'connected' | 'disconnected' | 'error';

// ❌ Bad
const dbType = 'postgres' | 'sqlite';
```

**Strict null checks:**
```typescript
// ✅ Good
const getValue = (obj: Record<string, unknown> | null): string | undefined => {
  return obj?.someKey as string | undefined;
}

// ❌ Bad
const getValue = (obj) => obj.someKey
```

### React Component Patterns

**Functional components with hooks:**
```typescript
// ✅ Good
interface DataGridProps {
  data: Record<string, unknown>[];
  onRowClick?: (row: Record<string, unknown>) => void;
}

export const DataGrid: React.FC<DataGridProps> = ({ data, onRowClick }) => {
  const [sorting, setSorting] = useState<SortingState>([]);

  return <div>...</div>;
}

// ❌ Bad: Class components or implicit props
```

**Custom hooks for logic extraction:**
```typescript
// ✅ Good: Logic in custom hook
const useTableData = (sql: string) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  // ... hook logic
  return { data, loading };
}

// ❌ Bad: All logic in component
```

### State Management (Zustand)

**Store patterns:**
```typescript
// ✅ Good: Type-safe, immutable updates
interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
}

interface WorkspaceActions {
  addWorkspace: (workspace: Workspace) => void;
  removeWorkspace: (id: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState & WorkspaceActions>(
  (set) => ({
    workspaces: [],
    activeWorkspaceId: null,
    addWorkspace: (workspace) =>
      set((state) => ({
        workspaces: [...state.workspaces, workspace],
      })),
    removeWorkspace: (id) =>
      set((state) => ({
        workspaces: state.workspaces.filter((w) => w.id !== id),
      })),
  })
);

// Usage
const { workspaces, addWorkspace } = useWorkspaceStore();
```

**Avoid:**
```typescript
// ❌ Bad: Direct mutations
store.workspaces.push(newWorkspace);

// ❌ Bad: Implicit types
create((set) => ({ ... }))
```

## Rust Patterns

### Error Handling

**Use Result<T, E>:**
```rust
// ✅ Good: Explicit error handling
fn execute_query(sql: &str) -> Result<QueryResult, AppError> {
  let rows = sqlx::query_as::<_, (String,)>(sql)
    .fetch_all(&pool)
    .await
    .map_err(|e| AppError::DatabaseError(e.to_string()))?;

  Ok(QueryResult { rows, columns: vec![] })
}

// ❌ Bad: Unwrap or panic
fn execute_query(sql: &str) -> QueryResult {
  let rows = sqlx::query_as::<_, (String,)>(sql)
    .fetch_all(&pool)
    .await
    .unwrap(); // ← NEVER in production code

  QueryResult { rows, columns: vec![] }
}
```

**Custom error enum:**
```rust
#[derive(Debug)]
pub enum AppError {
  DatabaseError(String),
  ConnectionError(String),
  ValidationError(String),
  #[serde(rename = "SerializationError")]
  SerializationError(String),
}

impl From<sqlx::Error> for AppError {
  fn from(err: sqlx::Error) -> Self {
    AppError::DatabaseError(err.to_string())
  }
}
```

### Tauri Commands

**Command structure:**
```rust
// ✅ Good: Async command with error handling
#[tauri::command]
pub async fn execute_query(
  sql: String,
  workspace_id: String,
  state: tauri::State<'_, AppState>,
) -> Result<QueryResult, String> {
  let db_pool = state.get_workspace_pool(&workspace_id)
    .ok_or("Workspace not found")?;

  let result = executor::execute(&db_pool, &sql).await?;
  Ok(result)
}

// ❌ Bad: Blocking, no error handling
#[tauri::command]
pub fn execute_query(sql: String, workspace_id: String) -> QueryResult {
  // blocking code...
  QueryResult { ... }
}
```

### Database Queries

**Always use parameterized queries:**
```rust
// ✅ Good: Parameterized query prevents SQL injection
let result = sqlx::query_as::<_, (i32, String)>(
  "SELECT id, name FROM users WHERE id = ?"
)
.bind(user_id)
.fetch_one(&pool)
.await?;

// ❌ Bad: String interpolation (NEVER!)
let query = format!("SELECT * FROM users WHERE id = {}", user_id);
```

**Connection pooling:**
```rust
// ✅ Good: Use sqlx::PgPoolOptions for connection pooling
let pool = PgPoolOptions::new()
  .max_connections(5)
  .connect(&url)
  .await?;

// ❌ Bad: New connection per query
let conn = PgConnection::connect(&url).await?;
```

## Common Patterns

### SQL Utility Functions

**sql-formatter.ts - Format SQL:**
```typescript
// Used in QueryEditor toolbar
import { formatSql } from '@/lib/sql-formatter';
const formatted = formatSql(sqlText);
```

**sql-autocomplete.ts - Schema-aware completion:**
```typescript
// Provides table, column, and keyword suggestions
const suggestions = getAutocompleteSuggestions({
  sql: sqlText,
  position: cursorPos,
  schema: schemaStore.schema,
});
```

**sql-filter.ts - Generate WHERE clauses:**
```typescript
// Converts filter state to SQL
const whereClause = generateFilterSQL(filterState, tableName);
```

### Export Operations

**csv, json, excel:**
```typescript
// ✅ Good: Use export utilities
import { exportToCSV, exportToJSON } from '@/lib/export';

const handleExport = () => {
  exportToCSV(data, 'query-results.csv');
};
```

## Error Handling Strategy

### Frontend Error Handling

```typescript
// ✅ Good: Try-catch with user feedback
const executeQuery = async (sql: string) => {
  try {
    setLoading(true);
    const result = await invoke('execute_query', { sql });
    setData(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    toast.error(`Query failed: ${message}`);
  } finally {
    setLoading(false);
  }
}

// ❌ Bad: Silent failures
const executeQuery = async (sql: string) => {
  const result = await invoke('execute_query', { sql });
  setData(result);
}
```

### Backend Error Handling

```rust
// ✅ Good: Propagate errors with context
#[tauri::command]
pub async fn execute_query(sql: String, state: tauri::State<'_, AppState>)
  -> Result<QueryResult, String>
{
  let pool = state.get_pool()
    .ok_or_else(|| "Database not connected".to_string())?;

  executor::execute(&pool, &sql)
    .await
    .map_err(|e| format!("Query execution failed: {}", e))
}

// ❌ Bad: Generic errors
pub async fn execute_query(...) -> Result<QueryResult, String> {
  // ...
  Err("Error".to_string())
}
```

## Performance Best Practices

### Frontend Performance

1. **Memoize expensive components:**
   ```typescript
   const DataGridCell = React.memo(({ value }) => {
     return <div>{value}</div>;
   });
   ```

2. **Virtual scrolling for large datasets:**
   ```typescript
   // Use TanStack Virtual in DataGrid
   import { useVirtualizer } from '@tanstack/react-virtual';
   ```

3. **Debounce autocomplete requests:**
   ```typescript
   const debouncedSearch = useMemo(
     () => debounce((value) => fetchSuggestions(value), 300),
     []
   );
   ```

### Backend Performance

1. **Use connection pooling:**
   ```rust
   let pool = PgPoolOptions::new()
     .max_connections(5)
     .connect(&url)
     .await?;
   ```

2. **Limit query results:**
   ```rust
   let result = sqlx::query("SELECT * FROM large_table LIMIT 1000")
     .fetch_all(&pool)
     .await?;
   ```

3. **Cache schema metadata:**
   ```typescript
   // schemaStore caches table/column info to reduce queries
   const schema = await schemaStore.getSchema(workspaceId);
   ```

## Security Best Practices

1. **No SQL injection:**
   - Always use parameterized queries
   - Bind user inputs with sqlx `.bind()`

2. **No secrets in code:**
   - Database passwords in env vars
   - SSL certificates managed securely

3. **Type safety:**
   - Strict TypeScript prevents runtime errors
   - Rust's ownership prevents memory issues

4. **Validate inputs:**
   ```typescript
   // Frontend validation before sending to backend
   if (!isValidTableName(tableName)) {
     throw new Error('Invalid table name');
   }
   ```

## Testing Patterns

### Frontend Tests
```typescript
// ✅ Test component rendering
it('renders DataGrid with data', () => {
  const { getByTestId } = render(<DataGrid data={mockData} />);
  expect(getByTestId('grid-container')).toBeInTheDocument();
});

// ✅ Test Zustand store
it('adds workspace to store', () => {
  const { result } = renderHook(() => useWorkspaceStore());
  act(() => {
    result.current.addWorkspace(mockWorkspace);
  });
  expect(result.current.workspaces).toHaveLength(1);
});
```

### Backend Tests
```rust
#[tokio::test]
async fn test_execute_query() {
  let pool = create_test_pool().await;
  let result = execute(&pool, "SELECT 1").await;
  assert!(result.is_ok());
}
```

## Code Review Checklist

- [ ] TypeScript types are explicit (no `any`)
- [ ] No SQL injection vulnerabilities
- [ ] Error handling present (try-catch or Result)
- [ ] Component under 200 lines
- [ ] Store mutations are immutable
- [ ] No console.log statements
- [ ] Naming conventions followed
- [ ] Tests written for logic
- [ ] No hardcoded secrets
- [ ] README/comments for complex logic

## Linting & Formatting

### Commands
```bash
# TypeScript checking
yarn type-check

# ESLint
yarn lint

# Prettier format
yarn format
```

### ESLint Rules
- Enforces naming conventions (camelCase, PascalCase)
- Prevents unused variables
- Requires explicit return types
- Enforces const over let/var

### Prettier Config
- 2 space indentation
- Single quotes for strings
- Trailing commas in multiline
- No semicolons (Prettier removes them)

## Common Mistakes to Avoid

| Mistake | Fix |
|---------|-----|
| Implicit `any` types | Use explicit type annotations |
| Mutating state directly | Use immutable updates in Zustand |
| SQL string concatenation | Always use parameterized queries |
| Not handling async errors | Use try-catch or .catch() |
| Over-fetching schema | Cache with schemaStore |
| Rendering without keys | Add key props to lists |
| Not unsubscribing from stores | Use proper cleanup in useEffect |
| Blocking on main thread | Always use async/await in Rust |

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Best Practices](https://react.dev)
- [Zustand Docs](https://github.com/pmndrs/zustand)
- [sqlx Docs](https://docs.rs/sqlx/latest/sqlx/)
- [Tauri Docs](https://tauri.app)
