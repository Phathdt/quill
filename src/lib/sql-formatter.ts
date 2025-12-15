import { format } from 'sql-formatter'

export function formatSql(sql: string, language: 'postgresql' | 'sqlite' = 'postgresql'): string {
  try {
    return format(sql, {
      language,
      tabWidth: 2,
      keywordCase: 'upper',
      linesBetweenQueries: 2,
    })
  } catch (error) {
    console.error('Failed to format SQL:', error)
    return sql
  }
}
