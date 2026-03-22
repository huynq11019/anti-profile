import React from 'react'

export const Dashboard: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full gap-4 text-on-surface-variant p-8 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/[0.02] rounded-full blur-[120px] pointer-events-none" />

      {/* Main Content */}
      <span className="material-symbols-outlined text-[80px] text-primary opacity-30 drop-shadow-glow">
        dashboard
      </span>
      <h2 className="text-3xl font-black text-on-surface tracking-tighter">
        Overview Dashboard
      </h2>
      <p className="text-base font-medium max-w-md text-center opacity-80 leading-relaxed text-on-surface-variant">
        This screen is reserved for a high-level overview report, showing active sessions, proxies health, and system statistics in real-time.
      </p>
      
      <div className="mt-8 flex gap-4">
        <div className="px-6 py-3 bg-surface-container border border-outline-variant/20 rounded-lg flex items-center gap-3 shadow-lg shadow-black/20">
          <span className="material-symbols-outlined text-tertiary">construction</span>
          <span className="text-sm font-semibold tracking-wide text-on-surface uppercase">Design in progress</span>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
