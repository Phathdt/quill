import { useRef } from 'react'

import Editor, { type OnMount } from '@monaco-editor/react'

import { useExecuteQuery } from '@/hooks/useExecuteQuery'
import { useQueryStore } from '@/stores/queryStore'

import { EditorToolbar } from './EditorToolbar'

export function QueryEditor() {
  const sql = useQueryStore((s) => s.sql)
  const setSql = useQueryStore((s) => s.setSql)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null)
  const { execute } = useExecuteQuery()

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor

    // Add Ctrl+Enter keybinding
    editor.addAction({
      id: 'execute-query',
      label: 'Execute Query',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => {
        execute()
      },
    })
  }

  return (
    <div className='flex flex-col border-b border-border'>
      <div className='h-48 min-h-[120px]'>
        <Editor
          height='100%'
          defaultLanguage='sql'
          value={sql}
          onChange={(value) => setSql(value || '')}
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
