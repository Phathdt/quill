import { useMemo } from 'react'

import { useWorkspaceManagerStore } from '@/stores/workspace'

export interface QueryStats {
  rowCount: number | null
  executionTimeMs: number | null
  hasResult: boolean
  isLoading: boolean
}

export function useQueryStats(): QueryStats {
  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())

  return useMemo(() => {
    if (!activeTab) {
      return {
        rowCount: null,
        executionTimeMs: null,
        hasResult: false,
        isLoading: false,
      }
    }

    const result = activeTab.result
    const hasResult = !!result && result.rows.length > 0

    return {
      rowCount: result?.rows.length ?? null,
      executionTimeMs: result?.executionTimeMs ?? null,
      hasResult,
      isLoading: activeTab.loading,
    }
  }, [activeTab])
}
