// Centralized application constants

// Workspace limits
export const MAX_WORKSPACES = 5
export const MAX_QUERY_HISTORY_ENTRIES = 100

// Storage paths
export const STORAGE_DATA_DIR = 'quill-data'
export const STORAGE_HISTORY_DIR = 'history'

// Connection tag options
export const TAG_OPTIONS = [
  { value: 'local', label: 'local' },
  { value: 'development', label: 'development' },
  { value: 'staging', label: 'staging' },
  { value: 'production', label: 'production' },
] as const

// Connection status colors (for connection indicator)
export const STATUS_COLORS = [
  { value: 'default', color: 'bg-[#3c3c3c]' },
  { value: 'blue', color: 'bg-sky-500' },
  { value: 'yellow', color: 'bg-amber-400' },
  { value: 'green', color: 'bg-emerald-500' },
  { value: 'red', color: 'bg-rose-500' },
] as const

// Group colors (for connection groups)
export const GROUP_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
] as const

// Group colors with labels (for color picker UI)
export const GROUP_COLORS_WITH_LABELS = [
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#ec4899', label: 'Pink' },
] as const

// Database type display info
export const DB_TYPES = [
  {
    type: 'postgres' as const,
    name: 'PostgreSQL',
    icon: '🐘',
    color: '#336791',
  },
  {
    type: 'sqlite' as const,
    name: 'SQLite',
    icon: '📁',
    color: '#003B57',
  },
] as const
