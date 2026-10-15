import { useCallback, useEffect, useState } from 'react'
import { api } from './api'

// Loads data from the API: const { data, error, loading, reload } = useApi('/courses')
// Pass null as the path to skip loading. While reloading the same path, the
// previous data stays on screen so the page doesn't flash a spinner.
export function useApi(path) {
  const [reloadCount, setReloadCount] = useState(0)
  const [result, setResult] = useState({ key: null, path: null, data: null, error: null })
  const key = path === null ? null : `${path}#${reloadCount}`

  useEffect(() => {
    if (key === null) return undefined

    let ignore = false
    api(path)
      .then((data) => {
        if (!ignore) setResult({ key, path, data, error: null })
      })
      .catch((error) => {
        if (!ignore) setResult({ key, path, data: null, error })
      })

    return () => {
      ignore = true
    }
  }, [path, key])

  const reload = useCallback(() => setReloadCount((count) => count + 1), [])
  const samePath = result.path === path

  return {
    data: samePath ? result.data : null,
    error: samePath ? result.error : null,
    loading: key !== null && !samePath,
    reloading: key !== null && samePath && result.key !== key,
    reload,
  }
}
