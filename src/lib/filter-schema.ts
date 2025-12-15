import { z } from 'zod'

import type { FilterOperator } from '@/types/workspace'

// Operators that don't require a value
const NULL_OPERATORS: FilterOperator[] = ['IS NULL', 'IS NOT NULL']

// Operators that require two values
const RANGE_OPERATORS: FilterOperator[] = ['BETWEEN', 'NOT BETWEEN']

// All valid operators
const FILTER_OPERATORS: FilterOperator[] = [
  '=',
  '<>',
  '<',
  '>',
  '<=',
  '>=',
  'IN',
  'NOT IN',
  'IS NULL',
  'IS NOT NULL',
  'BETWEEN',
  'NOT BETWEEN',
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
]

// Single filter schema with conditional validation
export const filterSchema = z
  .object({
    id: z.string(),
    column: z.string().min(1, 'Column is required'),
    operator: z.enum(FILTER_OPERATORS as [FilterOperator, ...FilterOperator[]]),
    value: z.string(),
    value2: z.string().optional(),
    enabled: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const { operator, value, value2 } = data

    // Null operators don't need values
    if (NULL_OPERATORS.includes(operator)) {
      return
    }

    // BETWEEN requires both values
    if (RANGE_OPERATORS.includes(operator)) {
      if (!value || !value.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'From value is required',
          path: ['value'],
        })
      }
      if (!value2 || !value2.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'To value is required',
          path: ['value2'],
        })
      }
      return
    }

    // Other operators require value
    if (!value || !value.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Value is required',
        path: ['value'],
      })
    }
  })

// Multiple filters schema
export const filtersSchema = z.array(filterSchema)

// Type inference
export type FilterFormData = z.infer<typeof filterSchema>
export type FiltersFormData = z.infer<typeof filtersSchema>

// Validation helper
export function validateFilter(filter: FilterFormData): { valid: boolean; errors: string[] } {
  const result = filterSchema.safeParse(filter)
  if (result.success) {
    return { valid: true, errors: [] }
  }
  return {
    valid: false,
    errors: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
  }
}

// Validate all filters and return only valid ones
export function getValidFilters(filters: FilterFormData[]): FilterFormData[] {
  return filters.filter((f) => {
    const result = filterSchema.safeParse(f)
    return result.success
  })
}
