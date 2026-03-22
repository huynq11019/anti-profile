import React, { useState } from 'react'
import { Profile } from '@shared/types'
import { DASHBOARD_STATS, SAMPLE_PROFILES } from '@renderer/data/mockData'
import { ProfileRow } from '@renderer/components/profiles/ProfileRow'
import { useDashboard } from '@renderer/hooks/useDashboard'

interface ProfilesProps {
  readonly onCreateProfile?: () => void
}

export const Profiles: React.FC<ProfilesProps> = ({ onCreateProfile }) => {
  const {
    profiles,
    selectedIds,
    searchQuery,
    setSearchQuery,
    handleSelect,
    handleSelectAll,
    handleLaunch,
    handleStop,
    handleDelete,
  } = useDashboard(SAMPLE_PROFILES)

  const allSelected = selectedIds.size === profiles.length && profiles.length > 0
  const someSelected = selectedIds.size > 0 && !allSelected

  return (
    <div className="flex flex-col h-full">
      {/* ── Hero Section ─────────────────────────────── */}
      <section
        className="flex items-center px-10 h-[160px] border-b border-outline-variant/10 relative overflow-hidden shrink-0"
        style={{ background: 'linear-gradient(135deg, #111318 0%, #0c0e12 100%)' }}
      >
        {/* Decorative glint */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/[0.05] to-transparent pointer-events-none" />

        <div className="flex-1">
          <h1 className="text-2xl font-bold text-on-surface leading-tight">
            Manage your anonymous browser profiles securely
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Anti-fingerprint browser profiles with proxy, cookie and automation control
          </p>
        </div>

        {/* Stat cards */}
        <div className="flex gap-4">
          {DASHBOARD_STATS.map((stat) => (
            <div
              key={stat.label}
              className="bg-surface-container-high border border-outline-variant/20 
                px-5 py-4 rounded-lg min-w-[130px] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/[0.06] to-transparent" />
              <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                {stat.label}
              </p>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-on-surface">{stat.value}</h3>
                {stat.isActive && (
                  <span className="status-dot-active animate-pulse" />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Profiles Section ──────────────────────────── */}
      <section className="flex-1 overflow-auto p-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onCreateProfile}
              className="flex items-center gap-1.5 border border-primary text-primary 
                px-4 py-2 rounded text-sm font-semibold hover:bg-primary/[0.06] transition-colors"
              id="new-profile-btn"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Profile
            </button>
            <button className="btn-secondary flex items-center gap-1.5 text-sm">
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              Import
            </button>
            <div className="relative">
              <button className="btn-secondary flex items-center gap-1.5 text-sm">
                Bulk Action
                <span className="material-symbols-outlined text-[18px]">expand_more</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search profiles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-surface-container-highest border border-outline-variant/20 
                  rounded-lg pl-9 pr-4 py-2 w-[260px] text-sm text-on-surface placeholder:text-on-surface-variant
                  focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            <button className="btn-secondary p-2.5">
              <span className="material-symbols-outlined text-[20px]">filter_alt</span>
            </button>
            <button className="btn-secondary p-2.5">
              <span className="material-symbols-outlined text-[20px]">sort</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface-container-low rounded-lg overflow-hidden border border-outline-variant/10 shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-high/50">
              <tr>
                <th className="py-3.5 px-5 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded bg-surface border-outline-variant text-primary focus:ring-primary focus:ring-offset-surface"
                  />
                </th>
                {['Status', 'Profile Name', 'Browser', 'Proxy', 'Fingerprint', 'Tags', 'Last Used', 'Actions'].map((col) => (
                  <th
                    key={col}
                    className={`py-3.5 px-4 text-[10px] font-semibold text-on-surface-variant uppercase tracking-widest ${
                      col === 'Actions' ? 'text-right pr-5' : ''
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {profiles.map((profile) => (
                <ProfileRow
                  key={profile.id}
                  profile={profile}
                  isSelected={selectedIds.has(profile.id)}
                  onSelect={handleSelect}
                  onLaunch={handleLaunch}
                  onStop={handleStop}
                  onEdit={() => {}}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-5 flex items-center justify-between text-xs text-on-surface-variant">
          <p>Showing 1–{profiles.length} of 128 profiles</p>
          <div className="flex items-center gap-1.5">
            <button className="p-2 border border-outline-variant/30 rounded hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                className={`w-8 h-8 rounded font-bold text-xs transition-colors ${
                  n === 1
                    ? 'btn-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                {n}
              </button>
            ))}
            <button className="p-2 border border-outline-variant/30 rounded hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Profiles
