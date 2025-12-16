import { cn } from '@/lib/utils'
import type { CommandAction } from '@/stores/commandPaletteStore'
import { Command } from 'cmdk'
import { Command as CommandIcon } from 'lucide-react'

interface CommandListProps {
  actions: CommandAction[]
}

const CATEGORY_LABELS: Record<CommandAction['category'], string> = {
  navigation: 'Navigation',
  workspace: 'Workspace',
  connection: 'Connections',
  query: 'Query',
  general: 'General',
  template: 'Templates',
}

const CATEGORY_ORDER: CommandAction['category'][] = [
  'query',
  'template',
  'navigation',
  'workspace',
  'connection',
  'general',
]

export function CommandList({ actions }: CommandListProps) {
  // Group actions by category
  const grouped = CATEGORY_ORDER.reduce(
    (acc, category) => {
      const items = actions.filter((a) => a.category === category)
      if (items.length > 0) {
        acc[category] = items
      }
      return acc
    },
    {} as Record<string, CommandAction[]>
  )

  return (
    <Command.List className='max-h-[300px] overflow-y-auto p-2'>
      <Command.Empty className='py-6 text-center text-sm text-muted-foreground'>No results found.</Command.Empty>

      {Object.entries(grouped).map(([category, items]) => (
        <Command.Group
          key={category}
          heading={CATEGORY_LABELS[category as CommandAction['category']]}
          className='[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground'
        >
          {items.map((action) => (
            <Command.Item
              key={action.id}
              value={action.id}
              keywords={action.keywords}
              onSelect={action.action}
              className={cn(
                'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
                'aria-selected:bg-accent aria-selected:text-accent-foreground',
                'data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
              )}
            >
              {action.icon && <action.icon className='mr-2 h-4 w-4 shrink-0 opacity-70' />}
              <div className='flex-1'>
                <span>{action.label}</span>
                {action.description && <span className='ml-2 text-xs text-muted-foreground'>{action.description}</span>}
              </div>
              {action.shortcut && (
                <div className='ml-auto flex items-center gap-0.5'>
                  {action.shortcut.map((key, i) => (
                    <kbd key={i} className='px-1.5 py-0.5 text-xs bg-muted rounded border border-border'>
                      {key === 'meta' ? (
                        <CommandIcon className='w-3 h-3 inline' />
                      ) : (
                        key.charAt(0).toUpperCase() + key.slice(1)
                      )}
                    </kbd>
                  ))}
                </div>
              )}
            </Command.Item>
          ))}
        </Command.Group>
      ))}
    </Command.List>
  )
}
