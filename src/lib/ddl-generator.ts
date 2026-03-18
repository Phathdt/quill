import type { DbType } from '@/types/workspace'

/**
 * Generates DDL statements for schema modifications.
 * Supports PostgreSQL, MySQL, and SQLite (limited).
 */

export function renameColumn(dbType: DbType, table: string, oldName: string, newName: string): string {
  switch (dbType) {
    case 'mysql':
      // MySQL < 8.0 requires full column definition; 8.0+ supports RENAME COLUMN
      return `ALTER TABLE \`${table}\` RENAME COLUMN \`${oldName}\` TO \`${newName}\`;`
    case 'sqlite':
      return `ALTER TABLE "${table}" RENAME COLUMN "${oldName}" TO "${newName}";`
    default: // postgres
      return `ALTER TABLE "${table}" RENAME COLUMN "${oldName}" TO "${newName}";`
  }
}

export function changeColumnType(dbType: DbType, table: string, column: string, newType: string): string {
  switch (dbType) {
    case 'mysql':
      return `ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` ${newType};`
    case 'sqlite':
      // SQLite does not support ALTER COLUMN TYPE — user must recreate the table
      throw new Error('SQLite does not support changing column types directly. Recreate the table manually.')
    default: // postgres
      return `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE ${newType} USING "${column}"::${newType};`
  }
}

export function setColumnNullable(dbType: DbType, table: string, column: string, nullable: boolean): string {
  switch (dbType) {
    case 'mysql':
      // MySQL MODIFY requires full type; we use a workaround comment
      throw new Error('For MySQL, use MODIFY COLUMN with the full type definition to change nullability.')
    case 'sqlite':
      throw new Error('SQLite does not support altering column constraints directly.')
    default: // postgres
      return nullable
        ? `ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP NOT NULL;`
        : `ALTER TABLE "${table}" ALTER COLUMN "${column}" SET NOT NULL;`
  }
}

export function setColumnDefault(dbType: DbType, table: string, column: string, defaultValue: string | null): string {
  switch (dbType) {
    case 'mysql':
      return defaultValue !== null
        ? `ALTER TABLE \`${table}\` ALTER COLUMN \`${column}\` SET DEFAULT ${defaultValue};`
        : `ALTER TABLE \`${table}\` ALTER COLUMN \`${column}\` DROP DEFAULT;`
    case 'sqlite':
      throw new Error('SQLite does not support altering column defaults directly.')
    default: // postgres
      return defaultValue !== null
        ? `ALTER TABLE "${table}" ALTER COLUMN "${column}" SET DEFAULT ${defaultValue};`
        : `ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP DEFAULT;`
  }
}

export function addColumn(
  dbType: DbType,
  table: string,
  column: string,
  dataType: string,
  nullable: boolean,
  defaultValue: string | null
): string {
  const notNull = nullable ? '' : ' NOT NULL'
  const def = defaultValue ? ` DEFAULT ${defaultValue}` : ''
  switch (dbType) {
    case 'mysql':
      return `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${dataType}${notNull}${def};`
    case 'sqlite':
      // SQLite only supports ADD COLUMN (no NOT NULL without default)
      return `ALTER TABLE "${table}" ADD COLUMN "${column}" ${dataType}${def};`
    default: // postgres
      return `ALTER TABLE "${table}" ADD COLUMN "${column}" ${dataType}${notNull}${def};`
  }
}

export function dropColumn(dbType: DbType, table: string, column: string): string {
  switch (dbType) {
    case 'mysql':
      return `ALTER TABLE \`${table}\` DROP COLUMN \`${column}\`;`
    case 'sqlite':
      // SQLite 3.35+ supports DROP COLUMN
      return `ALTER TABLE "${table}" DROP COLUMN "${column}";`
    default: // postgres
      return `ALTER TABLE "${table}" DROP COLUMN "${column}";`
  }
}

export function dropIndex(dbType: DbType, table: string, indexName: string): string {
  switch (dbType) {
    case 'mysql':
      return `ALTER TABLE \`${table}\` DROP INDEX \`${indexName}\`;`
    default: // postgres, sqlite
      return `DROP INDEX "${indexName}";`
  }
}

export function createIndex(
  dbType: DbType,
  table: string,
  indexName: string,
  columns: string[],
  unique: boolean
): string {
  const uniqueKw = unique ? 'UNIQUE ' : ''
  switch (dbType) {
    case 'mysql':
      return `CREATE ${uniqueKw}INDEX \`${indexName}\` ON \`${table}\` (${columns.map((c) => `\`${c}\``).join(', ')});`
    default: // postgres, sqlite
      return `CREATE ${uniqueKw}INDEX "${indexName}" ON "${table}" (${columns.map((c) => `"${c}"`).join(', ')});`
  }
}
