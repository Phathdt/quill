import { useSchemaStore } from '@/stores/schemaStore'
import type * as Monaco from 'monaco-editor'

const SQL_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'AND',
  'OR',
  'NOT',
  'IN',
  'LIKE',
  'BETWEEN',
  'JOIN',
  'LEFT',
  'RIGHT',
  'INNER',
  'OUTER',
  'ON',
  'AS',
  'ORDER',
  'BY',
  'GROUP',
  'HAVING',
  'LIMIT',
  'OFFSET',
  'INSERT',
  'INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE',
  'CREATE',
  'TABLE',
  'DROP',
  'ALTER',
  'INDEX',
  'DISTINCT',
  'COUNT',
  'SUM',
  'AVG',
  'MIN',
  'MAX',
  'NULL',
  'IS',
  'ASC',
  'DESC',
]

function detectContext(textBefore: string): 'table' | 'column' | 'keyword' {
  const upper = textBefore.toUpperCase().trim()

  // After FROM/JOIN -> suggest tables
  if (/(?:FROM|JOIN)\s+\w*$/i.test(upper)) return 'table'

  // After SELECT/WHERE/AND/OR/SET + space -> suggest columns
  if (/(?:SELECT|WHERE|AND|OR|SET|ON)\s+\w*$/i.test(upper)) return 'column'

  // After table. -> suggest columns
  if (/\w+\.\w*$/.test(textBefore)) return 'column'

  return 'keyword'
}

function extractReferencedTable(text: string): string | null {
  // Check for table.column pattern
  const dotMatch = text.match(/(\w+)\.\w*$/)
  if (dotMatch) return dotMatch[1]

  // Check for FROM table pattern
  const fromMatch = text.match(/FROM\s+["']?(\w+)["']?/i)
  if (fromMatch) return fromMatch[1]

  return null
}

export function createSqlCompletionProvider(
  workspaceId: string,
  monaco: typeof Monaco
): Monaco.languages.CompletionItemProvider {
  return {
    triggerCharacters: [' ', '.', '"'],

    provideCompletionItems: async (model, position) => {
      const textBefore = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      })

      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      const context = detectContext(textBefore)
      const suggestions: Monaco.languages.CompletionItem[] = []
      const schemaStore = useSchemaStore.getState()

      if (context === 'keyword') {
        // SQL Keywords
        SQL_KEYWORDS.forEach((kw) => {
          if (kw.toLowerCase().startsWith(word.word.toLowerCase())) {
            suggestions.push({
              label: kw,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: kw + ' ',
              range,
            })
          }
        })
      }

      if (context === 'table' || context === 'keyword') {
        // Table names
        const tables = schemaStore.getTables(workspaceId)
        tables.forEach((table) => {
          if (table.toLowerCase().startsWith(word.word.toLowerCase())) {
            suggestions.push({
              label: table,
              kind: monaco.languages.CompletionItemKind.Class,
              insertText: `"${table}"`,
              detail: 'Table',
              range,
            })
          }
        })
      }

      if (context === 'column') {
        // Column names (context-aware)
        const tableName = extractReferencedTable(textBefore)
        if (tableName) {
          const structure = await schemaStore.getTableColumns(workspaceId, tableName)
          if (structure) {
            structure.columns.forEach((col) => {
              if (col.name.toLowerCase().startsWith(word.word.toLowerCase())) {
                suggestions.push({
                  label: col.name,
                  kind: monaco.languages.CompletionItemKind.Field,
                  insertText: `"${col.name}"`,
                  detail: col.dataType,
                  range,
                })
              }
            })
          }
        } else {
          // No specific table - suggest columns from all cached tables
          const tables = schemaStore.getTables(workspaceId)
          for (const table of tables.slice(0, 5)) {
            const structure = schemaStore.getCachedColumns(workspaceId, table)
            if (structure) {
              structure.columns.forEach((col) => {
                if (col.name.toLowerCase().startsWith(word.word.toLowerCase())) {
                  suggestions.push({
                    label: col.name,
                    kind: monaco.languages.CompletionItemKind.Field,
                    insertText: `"${col.name}"`,
                    detail: `${table}.${col.dataType}`,
                    range,
                  })
                }
              })
            }
          }
        }
      }

      return { suggestions }
    },
  }
}
