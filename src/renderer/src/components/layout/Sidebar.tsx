import React from 'react'
import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '@renderer/data/mockData'

interface SidebarProps {
  readonly className?: string
}

export const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  return (
    <aside
      className={`fixed left-0 top-[60px] w-[240px] h-[calc(100vh-60px)] 
        bg-white/[0.04] backdrop-blur-[12px] border-r border-white/[0.05] 
        z-40 flex flex-col pt-4 ${className}`}
    >
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 py-3 px-4 rounded transition-all duration-200 text-sm font-medium
              ${
                isActive
                  ? 'text-primary bg-surface-container-high border-l-2 border-primary shadow-glow'
                  : 'text-on-surface-variant hover:bg-[rgba(0,255,255,0.08)] hover:text-primary border-l-2 border-transparent'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Version footer */}
      <div className="p-5 border-t border-white/[0.05]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-on-surface font-bold text-sm">Anti-Detech</p>
            <p className="text-on-surface-variant text-[10px] uppercase tracking-widest mt-0.5">
              Version v1.0
            </p>
          </div>
          <span className="status-dot-active animate-pulse" />
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
