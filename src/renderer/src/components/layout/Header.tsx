import React from 'react'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  readonly onCreateProfile?: () => void
}

export const Header: React.FC<HeaderProps> = ({ onCreateProfile }) => {
  const navigate = useNavigate()

  return (
    <header
      className="flex justify-between items-center px-6 w-full fixed z-50 
        bg-surface border-b border-white/[0.05] shadow-modal h-[60px]"
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 group"
        >
          <span className="material-symbols-outlined text-primary text-2xl">shield</span>
          <div>
            <span className="text-lg font-black text-on-surface tracking-tighter uppercase">
              Anti-Detech
            </span>
            <span className="text-[10px] text-on-surface-variant font-mono ml-2">v1.0</span>
          </div>
        </button>
      </div>

      {/* Center: Global search */}
      <div className="flex-1 max-w-sm mx-8">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Quick search..."
            className="w-full bg-surface-container-highest/60 border border-outline-variant/30 
              placeholder:text-on-surface-variant text-on-surface text-sm rounded-lg
              pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary
              focus:shadow-glow transition-all duration-150"
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onCreateProfile}
          className="btn-primary flex items-center gap-1.5 text-sm"
          id="create-profile-btn"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Create Profile
        </button>

        <button
          className="p-2 text-on-surface-variant hover:bg-surface-container-high 
            hover:text-on-surface rounded-full transition-colors"
          aria-label="Notifications"
        >
          <span className="material-symbols-outlined text-[22px]">notifications</span>
        </button>

        <button
          onClick={() => navigate('/settings')}
          className="p-2 text-on-surface-variant hover:bg-surface-container-high 
            hover:text-on-surface rounded-full transition-colors"
          aria-label="Settings"
        >
          <span className="material-symbols-outlined text-[22px]">settings</span>
        </button>

        <div
          className="w-8 h-8 rounded-full bg-surface-container-highest 
            border border-outline-variant flex items-center justify-center overflow-hidden"
        >
          <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
            person
          </span>
        </div>
      </div>
    </header>
  )
}

export default Header
