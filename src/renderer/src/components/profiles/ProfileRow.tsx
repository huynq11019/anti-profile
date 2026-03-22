import React from 'react'
import { Profile } from '@shared/types'
import { PROXY_MAP, formatFingerprint } from '@renderer/data/mockData'

interface ProfileRowProps {
  readonly profile: Profile
  readonly isSelected: boolean
  readonly onSelect: (id: string, checked: boolean) => void
  readonly onLaunch: (id: string) => void
  readonly onStop: (id: string) => void
  readonly onEdit: (profile: Profile) => void
  readonly onDelete: (id: string) => void
}

export const ProfileRow: React.FC<ProfileRowProps> = ({
  profile,
  isSelected,
  onSelect,
  onLaunch,
  onStop,
  onEdit,
  onDelete,
}) => {
  const proxy = profile.proxyId ? PROXY_MAP[profile.proxyId] : null
  const isRunning = profile.status === 'running'

  return (
    <tr
      className={`table-row-hover border-l-2 border-transparent 
        ${isSelected ? 'bg-surface-bright border-l-primary' : ''}`}
    >
      {/* Checkbox */}
      <td className="py-3.5 px-5">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(profile.id, e.target.checked)}
          className="rounded bg-surface border-outline-variant text-primary 
            focus:ring-primary focus:ring-offset-surface"
        />
      </td>

      {/* Status */}
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-2">
          <span className={isRunning ? 'status-dot-active animate-pulse' : 'status-dot-idle'} />
          <span
            className={`text-[11px] font-bold ${
              isRunning ? 'text-tertiary' : 'text-on-surface-variant'
            }`}
          >
            {isRunning ? 'Running' : 'Idle'}
          </span>
        </div>
      </td>

      {/* Name */}
      <td className="py-3.5 px-4 font-semibold text-on-surface text-sm">{profile.name}</td>

      {/* Browser */}
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-1.5 text-on-surface-variant">
          <span className="material-symbols-outlined text-[16px]">language</span>
          <span className="text-xs">Chrome v114</span>
        </div>
      </td>

      {/* Proxy */}
      <td className="py-3.5 px-4">
        {proxy ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] px-1.5 py-0.5 bg-surface-container-high text-on-surface-variant rounded font-mono font-bold">
              {proxy.country}
            </span>
            <span className="text-xs font-mono text-on-surface-variant">{proxy.ip}</span>
          </div>
        ) : (
          <span className="text-xs text-on-surface-variant opacity-50">— No Proxy —</span>
        )}
      </td>

      {/* Fingerprint */}
      <td className="py-3.5 px-4">
        <span className="text-[11px] font-mono text-outline">
          {formatFingerprint(profile.fingerprintSeed)}
        </span>
      </td>

      {/* Tags */}
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-1 flex-wrap">
          {profile.tags?.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 bg-surface-container-highest 
                border border-outline-variant/30 rounded text-primary"
            >
              {tag}
            </span>
          ))}
        </div>
      </td>

      {/* Last Used */}
      <td className="py-3.5 px-4 text-xs text-on-surface-variant">{profile.lastOpened ?? '—'}</td>

      {/* Actions */}
      <td className="py-3.5 px-5 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => (isRunning ? onStop(profile.id) : onLaunch(profile.id))}
            className={`text-xs font-bold px-3 py-1 rounded transition-opacity hover:opacity-80 
              ${isRunning ? 'bg-error text-white' : 'btn-primary'}`}
            id={`profile-action-${profile.id}`}
          >
            {isRunning ? 'Stop' : 'Start'}
          </button>
          <button
            onClick={() => onEdit(profile)}
            className="p-1.5 text-on-surface-variant hover:text-on-surface transition-colors"
            aria-label="Edit profile"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button
            onClick={() => onDelete(profile.id)}
            className="p-1.5 text-on-surface-variant hover:text-error transition-colors"
            aria-label="Delete profile"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </td>
    </tr>
  )
}

export default ProfileRow
