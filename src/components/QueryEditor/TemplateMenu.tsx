import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { getTemplateSql, QUERY_TEMPLATES, replaceVariables, type QueryTemplate } from '@/lib/query-templates'
import { useWorkspaceManagerStore } from '@/stores/workspace'
import { BarChart, FileCode, Search, Settings } from 'lucide-react'

const CATEGORY_ICONS = {
  explore: Search,
  analyze: BarChart,
  admin: Settings,
}

const CATEGORY_LABELS = {
  explore: 'Explore',
  analyze: 'Analyze',
  admin: 'Admin',
}

export function TemplateMenu() {
  const [selectedTemplate, setSelectedTemplate] = useState<QueryTemplate | null>(null)
  const [variables, setVariables] = useState<Record<string, string>>({})

  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())
  const setTabSql = useWorkspaceManagerStore((s) => s.setTabSql)

  const dbType = activeWorkspace?.dbType ?? 'postgres'

  const handleSelectTemplate = (template: QueryTemplate) => {
    if (template.variables?.length) {
      // Show variable input dialog
      setSelectedTemplate(template)
      setVariables(template.variables.reduce((acc, v) => ({ ...acc, [v]: '' }), {}))
    } else {
      // Insert directly
      insertTemplate(template, {})
    }
  }

  const insertTemplate = (template: QueryTemplate, vars: Record<string, string>) => {
    if (!activeWorkspace || !activeTab) return

    let sql = getTemplateSql(template, dbType)
    sql = replaceVariables(sql, vars)

    // Append to existing SQL or replace
    const existingSql = activeTab.sql?.trim()
    const newSql = existingSql ? `${existingSql}\n\n${sql}` : sql

    setTabSql(activeWorkspace.id, activeTab.id, newSql)
    setSelectedTemplate(null)
    setVariables({})

    // Focus Monaco editor after dialog closes
    setTimeout(() => {
      const editor = document.querySelector('.monaco-editor textarea') as HTMLTextAreaElement
      editor?.focus()
    }, 100)
  }

  const handleConfirmVariables = () => {
    if (selectedTemplate) {
      insertTemplate(selectedTemplate, variables)
    }
  }

  // Group templates by category
  const templatesByCategory = QUERY_TEMPLATES.reduce(
    (acc, t) => {
      acc[t.category] = acc[t.category] || []
      acc[t.category].push(t)
      return acc
    },
    {} as Record<string, QueryTemplate[]>
  )

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='sm'>
            <FileCode className='h-4 w-4 mr-2' />
            Templates
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start' className='w-56'>
          {Object.entries(templatesByCategory).map(([category, templates], idx) => {
            const Icon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]
            return (
              <div key={category}>
                {idx > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel className='flex items-center gap-2'>
                  <Icon className='h-4 w-4' />
                  {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                </DropdownMenuLabel>
                {templates.map((template) => (
                  <DropdownMenuItem key={template.id} onSelect={() => handleSelectTemplate(template)}>
                    <div className='flex flex-col'>
                      <span>{template.name}</span>
                      <span className='text-xs text-muted-foreground'>{template.description}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Variable Input Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          <form
            id='template-form'
            onSubmit={(e) => {
              e.preventDefault()
              handleConfirmVariables()
            }}
            className='space-y-4 py-4'
          >
            {selectedTemplate?.variables?.map((variable, idx) => (
              <div key={variable} className='space-y-2'>
                <label
                  htmlFor={variable}
                  className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                >
                  {variable.replace(/_/g, ' ')}
                </label>
                <Input
                  id={variable}
                  value={variables[variable] || ''}
                  onChange={(e) => setVariables((v) => ({ ...v, [variable]: e.target.value }))}
                  placeholder={`Enter ${variable.replace(/_/g, ' ')}`}
                  autoFocus={idx === 0}
                />
              </div>
            ))}
          </form>
          <DialogFooter>
            <Button variant='outline' onClick={() => setSelectedTemplate(null)}>
              Cancel
            </Button>
            <Button type='submit' form='template-form' onClick={handleConfirmVariables}>
              Insert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
