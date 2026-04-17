import React from 'react'
import { Profile } from '@shared/types'
import { PROXY_MAP, formatFingerprint } from '@renderer/data/mockData'

interface ProfileRowProps {
  readonly profile: Profile
  readonly isSelected: boolean
  readonly onSelect: (id: string, checked: boolean) => void
  readonly onLaunch: (id: string) => void
  readonly onStop: (id: string) => void
  readonly onTogglePin: (id: string) => void
  readonly onOpenFolder: (id: string) => void
  readonly onOpenExtensions: (id: string) => void
  readonly onViewCookies: (id: string) => void
  readonly onExportZip: (profile: Profile) => void
  readonly onEdit: (profile: Profile) => void
  readonly onDelete: (id: string) => void
}

export const ProfileRow: React.FC<ProfileRowProps> = ({
  profile,
  isSelected,
  onSelect,
  onLaunch,
  onStop,
  onTogglePin,
  onOpenFolder,
  onOpenExtensions,
  onViewCookies,
  onExportZip,
  onEdit,
  onDelete,
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [menuPosition, setMenuPosition] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const rowRef = React.useRef<HTMLTableRowElement | null>(null)
  const proxy = profile.proxyId ? PROXY_MAP[profile.proxyId] : null
  const isRunning = profile.status === 'running'

  const closeMenu = React.useCallback(() => {
    setMenuOpen(false)
  }, [])

  React.useEffect(() => {
    if (!menuOpen) {
      return
    }

    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (rowRef.current && target && rowRef.current.contains(target)) {
        return
      }
      closeMenu()
    }

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu()
      }
    }

    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [menuOpen, closeMenu])

  const openMenuAt = (x: number, y: number) => {
    setMenuPosition({ x, y })
    setMenuOpen(true)
  }

  const runMenuAction = (action: () => void) => {
    action()
    closeMenu()
  }

  const menuItems = [
    { key: 'edit', label: 'Edit details', icon: 'edit', action: () => onEdit(profile) },
    { key: 'pin', label: profile.isPinned ? 'Unpin profile' : 'Pin profile', icon: 'push_pin', action: () => onTogglePin(profile.id) },
    { key: 'extensions', label: 'Install extension', icon: 'extension', action: () => onOpenExtensions(profile.id) },
    { key: 'cookies', label: 'View cookies', icon: 'cookie', action: () => onViewCookies(profile.id) },
    { key: 'folder', label: 'Open profile folder', icon: 'folder_open', action: () => onOpenFolder(profile.id) },
    { key: 'zip', label: 'Export profile ZIP', icon: 'download', action: () => onExportZip(profile) },
    { key: 'delete', label: 'Delete profile', icon: 'delete', action: () => onDelete(profile.id), danger: true }
  ]

  return (
    <tr
      ref={rowRef}
      className={`table-row-hover border-l-2 border-transparent ${isSelected ? 'bg-surface-bright border-l-primary' : ''}`}
      onContextMenu={(event) => {
        event.preventDefault()
        openMenuAt(event.clientX, event.clientY)
      }}
    >
      <td className="py-3.5 px-5">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(profile.id, e.target.checked)}
          className="rounded bg-surface border-outline-variant text-primary focus:ring-primary focus:ring-offset-surface"
        />
      </td>

      <td className="py-3.5 px-4">
        <div className="flex items-center gap-2">
          <span className={isRunning ? 'status-dot-active animate-pulse' : 'status-dot-idle'} />
          <span className={`text-[11px] font-bold ${isRunning ? 'text-tertiary' : 'text-on-surface-variant'}`}>
            {isRunning ? 'Running' : 'Idle'}
          </span>
        </div>
      </td>

      <td className="py-3.5 px-4 font-semibold text-on-surface text-sm">
        <div className="flex items-center gap-1.5">
          <span>{profile.name}</span>
          {profile.isPinned && <span className="material-symbols-outlined text-[14px] text-primary">push_pin</span>}
        </div>
      </td>

      <td className="py-3.5 px-4">
        <div className="flex items-center gap-1.5 text-on-surface-variant">
          <span className="material-symbols-outlined text-[16px]">language</span>
          <span className="text-xs">Chrome v114</span>
        </div>
      </td>

      <td className="py-3.5 px-4">
        {proxy ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] px-1.5 py-0.5 bg-surface-container-high text-on-surface-variant rounded font-mono font-bold">
              {proxy.country}
            </span>
            <span className="text-xs font-mono text-on-surface-variant">{proxy.ip}</span>
          </div>
        ) : (
          <span className="text-xs text-on-surface-variant opacity-50">- No Proxy -</span>
        )}
      </td>

      <td className="py-3.5 px-4">
        <span className="text-[11px] font-mono text-outline">{formatFingerprint(profile.fingerprintSeed)}</span>
      </td>

      <td className="py-3.5 px-4">
        <div className="flex items-center gap-1 flex-wrap">
          {profile.tags?.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 bg-surface-container-highest border border-outline-variant/30 rounded text-primary"
            >
              {tag}
            </span>
          ))}
        </div>
      </td>

      <td className="py-3.5 px-4 text-xs text-on-surface-variant">{profile.lastOpened ?? '-'}</td>

      <td className="py-3.5 px-5 text-right relative">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => (isRunning ? onStop(profile.id) : onLaunch(profile.id))}
            className={`text-xs font-bold px-3 py-1 rounded transition-opacity hover:opacity-80 ${isRunning ? 'bg-error text-white' : 'btn-primary'}`}
            id={`profile-action-${profile.id}`}
            title={isRunning ? 'Stop profile' : 'Open profile'}
          >
            {isRunning ? 'Stop' : 'Start'}
          </button>

          <button
            onClick={(event) => {
              const rect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect()
              openMenuAt(rect.right, rect.bottom + 6)
            }}
            className="p-1.5 text-on-surface-variant hover:text-on-surface transition-colors"
            aria-label="Profile action menu"
            title="Action menu"
          >
            <span className="material-symbols-outlined text-[18px]">more_vert</span>
          </button>
        </div>

        {menuOpen && (
          <div
            className="fixed z-[120] w-[240px] rounded-lg border border-outline-variant/30 bg-surface-container-high shadow-2xl p-1"
            style={{ top: `${menuPosition.y}px`, left: `${menuPosition.x}px` }}
            role="menu"
            aria-label="Profile actions"
          >
            {menuItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => runMenuAction(item.action)}
                className={`w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 transition-colors ${
                  item.danger
                    ? 'text-error hover:bg-error/10'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest'
                }`}
                role="menuitem"
                title={item.label}
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </td>
    </tr>
  )
}

export default ProfileRow
