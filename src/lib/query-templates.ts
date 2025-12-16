export interface QueryTemplate {
  id: string
  name: string
  description: string
  category: 'explore' | 'analyze' | 'admin'
  sql: {
    postgres?: string
    sqlite?: string
    default: string
  }
  variables?: string[]
}

export const QUERY_TEMPLATES: QueryTemplate[] = [
  // Explore
  {
    id: 'show-tables',
    name: 'Show Tables',
    description: 'List all tables in database',
    category: 'explore',
    sql: {
      postgres: `SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;`,
      sqlite: `SELECT name FROM sqlite_master
WHERE type = 'table'
ORDER BY name;`,
      default: 'SHOW TABLES;',
    },
  },
  {
    id: 'describe-table',
    name: 'Describe Table',
    description: 'Show table structure',
    category: 'explore',
    sql: {
      postgres: `SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = '{table_name}'
ORDER BY ordinal_position;`,
      sqlite: `PRAGMA table_info({table_name});`,
      default: 'DESCRIBE {table_name};',
    },
    variables: ['table_name'],
  },
  {
    id: 'select-top-10',
    name: 'Select Top 10',
    description: 'Preview first 10 rows',
    category: 'explore',
    sql: {
      postgres: 'SELECT * FROM {table_name} LIMIT 10;',
      sqlite: 'SELECT * FROM {table_name} LIMIT 10;',
      default: 'SELECT * FROM {table_name} LIMIT 10;',
    },
    variables: ['table_name'],
  },
  // Analyze
  {
    id: 'count-rows',
    name: 'Count Rows',
    description: 'Count total rows in table',
    category: 'analyze',
    sql: {
      default: 'SELECT COUNT(*) as total FROM {table_name};',
    },
    variables: ['table_name'],
  },
  {
    id: 'explain-query',
    name: 'Explain Query',
    description: 'Analyze query execution plan',
    category: 'analyze',
    sql: {
      postgres: 'EXPLAIN ANALYZE {query}',
      sqlite: 'EXPLAIN QUERY PLAN {query}',
      default: 'EXPLAIN {query}',
    },
    variables: ['query'],
  },
  {
    id: 'table-sizes',
    name: 'Table Sizes',
    description: 'Show size of all tables',
    category: 'analyze',
    sql: {
      postgres: `SELECT
  relname as table_name,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;`,
      sqlite: `SELECT name,
  SUM(pgsize) as size_bytes
FROM dbstat
GROUP BY name
ORDER BY size_bytes DESC;`,
      default: 'SELECT table_name FROM information_schema.tables;',
    },
  },
  // Admin
  {
    id: 'show-indexes',
    name: 'Show Indexes',
    description: 'List indexes for table',
    category: 'admin',
    sql: {
      postgres: `SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = '{table_name}';`,
      sqlite: `SELECT name, sql FROM sqlite_master
WHERE type = 'index' AND tbl_name = '{table_name}';`,
      default: 'SHOW INDEX FROM {table_name};',
    },
    variables: ['table_name'],
  },
  {
    id: 'active-connections',
    name: 'Active Connections',
    description: 'Show current database connections',
    category: 'admin',
    sql: {
      postgres: `SELECT pid, usename, application_name, client_addr, state
FROM pg_stat_activity
WHERE state IS NOT NULL;`,
      sqlite: `-- SQLite is file-based, no connection info
SELECT 'Single-user mode' as info;`,
      default: 'SHOW PROCESSLIST;',
    },
  },
]

export function getTemplatesByCategory(category?: string) {
  if (!category) return QUERY_TEMPLATES
  return QUERY_TEMPLATES.filter((t) => t.category === category)
}

export function getTemplateSql(template: QueryTemplate, dbType: 'postgres' | 'sqlite'): string {
  return template.sql[dbType] ?? template.sql.default
}

export function replaceVariables(sql: string, variables: Record<string, string>): string {
  let result = sql
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return result
}
