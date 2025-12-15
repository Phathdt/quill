import { useCallback, useEffect, useRef } from 'react'

import Editor, { type OnMount } from '@monaco-editor/react'

import { useExecuteQuery } from '@/hooks/useExecuteQuery'
import { createSqlCompletionProvider } from '@/lib/sql-autocomplete'
import { useSchemaStore } from '@/stores/schemaStore'
import { useWorkspaceManagerStore } from '@/stores/workspaceManagerStore'

import { EditorToolbar } from './EditorToolbar'

export function QueryEditor() {
  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())
  const setTabSql = useWorkspaceManagerStore((s) => s.setTabSql)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null)
  const completionProviderRef = useRef<{ dispose: () => void } | null>(null)
  const { execute } = useExecuteQuery()

  // Use ref to always have latest execute function
  const executeRef = useRef(execute)
  useEffect(() => {
    executeRef.current = execute
  }, [execute])

  // Load schema on workspace change
  useEffect(() => {
    if (activeWorkspace?.id && activeWorkspace.isConnected) {
      useSchemaStore.getState().loadSchema(activeWorkspace.id)
    }
  }, [activeWorkspace?.id, activeWorkspace?.isConnected])

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (activeWorkspace && activeTab && value !== undefined) {
        setTabSql(activeWorkspace.id, activeTab.id, value)
      }
    },
    [activeWorkspace, activeTab, setTabSql]
  )

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor

    // Dispose previous provider
    completionProviderRef.current?.dispose()

    // Register SQL autocomplete
    if (activeWorkspace?.id) {
      completionProviderRef.current = monaco.languages.registerCompletionItemProvider(
        'sql',
        createSqlCompletionProvider(activeWorkspace.id, monaco)
      )
    }

    // Add Cmd/Ctrl+Enter keybinding - use ref to avoid stale closure
    editor.addAction({
      id: 'execute-query',
      label: 'Execute Query',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => {
        executeRef.current()
      },
    })
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      completionProviderRef.current?.dispose()
    }
  }, [])

  if (!activeTab) {
    return (
      <div className='flex flex-1 items-center justify-center text-muted-foreground bg-background'>No tab active</div>
    )
  }

  return (
    <div className='flex flex-col border-b border-border'>
      <div className='h-48 min-h-[120px]'>
        <Editor
          height='100%'
          defaultLanguage='sql'
          value={activeTab.sql}
          onChange={handleChange}
          onMount={handleMount}
          theme='vs-dark'
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: 'line',
            cursorBlinking: 'smooth',
            smoothScrolling: true,
          }}
        />
      </div>
      <EditorToolbar />
    </div>
  )
}
