import { useState, useMemo, useCallback, useEffect } from 'react'
import { Profile } from '@shared/types'

export const useDashboard = () => {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProfiles = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const fetched = await window.api.profiles.getAll()
      setProfiles(fetched)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch profiles.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const onProfilesChanged = () => {
      void loadProfiles()
    }

    const unsubscribeStatus = window.api.onProfileStatusChange((state) => {
      setProfiles((prev) =>
        prev.map((profile) =>
          profile.id === state.profileId
            ? {
                ...profile,
                status: state.status
              }
            : profile
        )
      )

      if (state.status === 'error' && state.error) {
        setError(state.error)
      }
    })

    void loadProfiles()
    window.addEventListener('profiles:changed', onProfilesChanged)

    return () => {
      window.removeEventListener('profiles:changed', onProfilesChanged)
      unsubscribeStatus()
    }
  }, [loadProfiles])

  const filteredProfiles = useMemo(
    () =>
      searchQuery.trim()
        ? profiles.filter((p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
          )
        : profiles,
    [profiles, searchQuery]
  )

  const handleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectedIds(checked ? new Set(filteredProfiles.map((p) => p.id)) : new Set())
    },
    [filteredProfiles]
  )

  const handleLaunch = useCallback(async (id: string) => {
    const result = await window.api.profiles.start([id])
    if (!result.success) {
      const launchErrors = result.errors?.join(', ') ?? 'Unknown launch error.'
      throw new Error(launchErrors)
    }

    setProfiles((prev) => {
      const now = new Date().toISOString()
      return prev.map((p) => (p.id === id ? { ...p, status: 'running', lastOpened: now } : p))
    })
  }, [])

  const handleStop = useCallback(async (id: string) => {
    const result = await window.api.profiles.stop([id])
    if (!result.success) {
      const stopErrors = result.errors?.join(', ') ?? 'Unknown stop error.'
      throw new Error(stopErrors)
    }

    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'idle' } : p)))
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    await window.api.profiles.delete(id)
    setProfiles((prev) => prev.filter((p) => p.id !== id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const handleBulkOpen = useCallback(async (profileIds: string[]) => {
    const result = await window.api.profiles.bulkOpen(profileIds)
    if (!result.success) {
      throw new Error(result.errors?.join(', ') ?? 'Bulk open failed.')
    }
  }, [])

  const handleBulkClose = useCallback(async (profileIds: string[]) => {
    const result = await window.api.profiles.bulkClose(profileIds)
    if (!result.success) {
      throw new Error(result.errors?.join(', ') ?? 'Bulk close failed.')
    }
  }, [])

  const handleBulkAssignProxy = useCallback(async (profileIds: string[], proxyId?: string) => {
    const result = await window.api.profiles.bulkAssignProxy(profileIds, proxyId)
    if (!result.success) {
      throw new Error(result.errors?.join(', ') ?? 'Bulk proxy assign failed.')
    }

    setProfiles((prev) => prev.map((profile) => (profileIds.includes(profile.id) ? { ...profile, proxyId } : profile)))
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  return {
    profiles: filteredProfiles,
    allProfiles: profiles,
    isLoading,
    error,
    selectedIds,
    searchQuery,
    setSearchQuery,
    refreshProfiles: loadProfiles,
    handleSelect,
    handleSelectAll,
    handleLaunch,
    handleStop,
    handleDelete,
    handleBulkOpen,
    handleBulkClose,
    handleBulkAssignProxy,
    clearSelection,
  }
}
