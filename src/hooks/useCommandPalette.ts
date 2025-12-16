import { useCallback, useMemo } from 'react'

import { getTemplateSql, QUERY_TEMPLATES } from '@/lib/query-templates'
import { formatSql } from '@/lib/sql-formatter'
import { useCommandPaletteStore, type CommandAction } from '@/stores/commandPaletteStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useWorkspaceManagerStore } from '@/stores/workspace'
import { Database, FileCode, FileText, Home, Wand2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function useCommandPalette() {
  const navigate = useNavigate()
  const close = useCommandPaletteStore((s) => s.close)

  // Stores
  const connections = useConnectionStore((s) => s.connections)
  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())
  const createTab = useWorkspaceManagerStore((s) => s.createTab)
  const setTabSql = useWorkspaceManagerStore((s) => s.setTabSql)

  // Action handler wrapper (closes palette after action)
  const withClose = useCallback(
    (fn: () => void) => () => {
      fn()
      close()
    },
    [close]
  )

  // Build actions list
  const actions = useMemo<CommandAction[]>(() => {
    const list: CommandAction[] = []

    // Navigation actions
    list.push({
      id: 'nav-home',
      label: 'Go to Home',
      description: 'Return to welcome screen',
      icon: Home,
      category: 'navigation',
      action: withClose(() => navigate('/')),
      keywords: ['home', 'welcome', 'start'],
    })

    // Workspace actions (only when connected)
    if (activeWorkspace?.isConnected) {
      list.push({
        id: 'query-new',
        label: 'New SQL Query',
        description: 'Create a new query tab',
        icon: FileText,
        shortcut: ['meta', 'T'],
        category: 'query',
        action: withClose(() => {
          createTab(activeWorkspace.id, 'query', 'SQL Query')
        }),
        keywords: ['new', 'tab', 'query', 'sql'],
      })

      if (activeTab?.sql) {
        list.push({
          id: 'query-format',
          label: 'Format SQL',
          description: 'Format current SQL query',
          icon: Wand2,
          shortcut: ['meta', 'shift', 'F'],
          category: 'query',
          action: withClose(() => {
            const dbType = activeWorkspace.dbType
            const language = dbType === 'postgres' ? 'postgresql' : 'sqlite'
            const formatted = formatSql(activeTab.sql, language)
            setTabSql(activeWorkspace.id, activeTab.id, formatted)
          }),
          keywords: ['format', 'beautify', 'sql'],
        })
      }

      // Add query templates (only templates without variables for simplicity)
      const dbType = activeWorkspace.dbType
      QUERY_TEMPLATES.filter((t) => !t.variables?.length).forEach((template) => {
        list.push({
          id: `template-${template.id}`,
          label: template.name,
          description: template.description,
          icon: FileCode,
          category: 'template',
          action: withClose(() => {
            const sql = getTemplateSql(template, dbType)
            const existingSql = activeTab?.sql?.trim()
            const newSql = existingSql ? `${existingSql}\n\n${sql}` : sql
            setTabSql(activeWorkspace.id, activeTab!.id, newSql)
            // Focus editor
            setTimeout(() => {
              const editor = document.querySelector('.monaco-editor textarea') as HTMLTextAreaElement
              editor?.focus()
            }, 100)
          }),
          keywords: ['template', 'sql', template.name.toLowerCase(), template.category],
        })
      })
    }

    // Connection actions
    connections.forEach((conn) => {
      list.push({
        id: `connect-${conn.id}`,
        label: `Connect to ${conn.name}`,
        description: conn.host ? `${conn.host} - ${conn.database || ''}` : conn.path,
        icon: Database,
        category: 'connection',
        action: withClose(() => {
          navigate(`/workspaces/${conn.id}`)
        }),
        keywords: ['connect', 'database', conn.type, conn.name.toLowerCase()],
      })
    })

    return list
  }, [activeWorkspace, activeTab, connections, navigate, createTab, setTabSql, withClose])

  return { actions }
}
