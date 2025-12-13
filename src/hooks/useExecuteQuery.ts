import { useCallback } from 'react'

import { executeQuery } from '@/lib/tauri'
import { useQueryStore } from '@/stores/queryStore'

export function useExecuteQuery() {
  const sql = useQueryStore((s) => s.sql)
  const setResult = useQueryStore((s) => s.setResult)
  const setError = useQueryStore((s) => s.setError)
  const setLoading = useQueryStore((s) => s.setLoading)
  const loading = useQueryStore((s) => s.loading)

  const execute = useCallback(async () => {
    if (!sql.trim()) return
    setLoading(true)
    try {
      const result = await executeQuery(sql)
      setResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [sql, setResult, setError, setLoading])

  return { execute, loading }
}
