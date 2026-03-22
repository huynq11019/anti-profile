import { useState, useMemo, useCallback } from 'react'
import { Profile } from '@shared/types'

export const useDashboard = (initialProfiles: Profile[]) => {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

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

  const handleLaunch = useCallback((id: string) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'running', lastOpened: 'Just now' } : p))
    )
  }, [])

  const handleStop = useCallback((id: string) => {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'idle' } : p)))
  }, [])

  const handleDelete = useCallback((id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  return {
    profiles: filteredProfiles,
    selectedIds,
    searchQuery,
    setSearchQuery,
    handleSelect,
    handleSelectAll,
    handleLaunch,
    handleStop,
    handleDelete,
  }
}
