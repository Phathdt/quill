import type { FilterOperator } from '@/types/workspace'

// Operator display labels
export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  '=': '=',
  '<>': '<>',
  '<': '<',
  '>': '>',
  '<=': '<=',
  '>=': '>=',
  IN: 'IN',
  'NOT IN': 'NOT IN',
  'IS NULL': 'IS NULL',
  'IS NOT NULL': 'IS NOT NULL',
  BETWEEN: 'BETWEEN',
  'NOT BETWEEN': 'NOT BETWEEN',
  LIKE: 'LIKE',
  ILIKE: 'ILIKE',
  CONTAINS: 'Contains',
  NOT_CONTAINS: 'Not contains',
  CONTAINS_CI: 'Contains - Case insensitive',
  NOT_CONTAINS_CI: 'Not contains - Case insensitive',
  HAS_PREFIX: 'Has prefix',
  HAS_SUFFIX: 'Has suffix',
  HAS_PREFIX_CI: 'Has prefix - Case insensitive',
  HAS_SUFFIX_CI: 'Has suffix - Case insensitive',
}

// Operators grouped by category
export const OPERATOR_GROUPS = {
  comparison: ['=', '<>', '<', '>', '<=', '>='] as FilterOperator[],
  set: ['IN', 'NOT IN'] as FilterOperator[],
  null: ['IS NULL', 'IS NOT NULL'] as FilterOperator[],
  range: ['BETWEEN', 'NOT BETWEEN'] as FilterOperator[],
  pattern: [
    'LIKE',
    'ILIKE',
    'CONTAINS',
    'NOT_CONTAINS',
    'CONTAINS_CI',
    'NOT_CONTAINS_CI',
    'HAS_PREFIX',
    'HAS_SUFFIX',
    'HAS_PREFIX_CI',
    'HAS_SUFFIX_CI',
  ] as FilterOperator[],
}

// Operators that don't need a value input
export const NULL_OPERATORS: FilterOperator[] = ['IS NULL', 'IS NOT NULL']

// Operators that need two values
export const RANGE_OPERATORS: FilterOperator[] = ['BETWEEN', 'NOT BETWEEN']

// Operators that need comma-separated values
export const SET_OPERATORS: FilterOperator[] = ['IN', 'NOT IN']
