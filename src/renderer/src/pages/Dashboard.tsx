import React from 'react'
import { useDashboard } from '@renderer/hooks/useDashboard'
import { handleIpcError } from '@renderer/utils/errorHandler'

export const Dashboard: React.FC = () => {
  const { profiles, isLoading, error, handleLaunch, handleStop } = useDashboard()

  const runningCount = profiles.filter((profile) => profile.status === 'running').length
  const idleCount = profiles.filter((profile) => profile.status === 'idle').length

  const runProfileAction = async (action: () => Promise<void>) => {
    try {
      await action()
    } catch (err) {
      handleIpcError(err, {
        title: 'Profile action failed',
        fallbackMessage: 'Unable to run profile action.',
        context: 'dashboard.profileAction'
      })
    }
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto h-full flex flex-col gap-6">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-container p-5 rounded-xl border border-outline-variant/20">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Total Profiles</p>
          <p className="text-3xl font-black text-on-surface mt-2">{profiles.length}</p>
        </div>
        <div className="bg-surface-container p-5 rounded-xl border border-outline-variant/20">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Running</p>
          <p className="text-3xl font-black text-tertiary mt-2">{runningCount}</p>
        </div>
        <div className="bg-surface-container p-5 rounded-xl border border-outline-variant/20">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Closed</p>
          <p className="text-3xl font-black text-on-surface mt-2">{idleCount}</p>
        </div>
      </section>

      <section className="bg-surface-container-low rounded-xl border border-outline-variant/10 overflow-hidden flex-1">
        <div className="px-5 py-4 border-b border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface">Runtime Status</h2>
          <p className="text-sm text-on-surface-variant">Start/stop profiles and monitor real-time state updates.</p>
        </div>

        {error && (
          <div className="mx-5 mt-4 px-4 py-3 text-sm text-error rounded-lg border border-error/30 bg-error/10">
            {error}
          </div>
        )}

        <div className="overflow-auto max-h-[520px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-high/50">
              <tr>
                <th className="px-5 py-3 text-xs uppercase tracking-widest text-on-surface-variant">Profile</th>
                <th className="px-5 py-3 text-xs uppercase tracking-widest text-on-surface-variant">Status</th>
                <th className="px-5 py-3 text-xs uppercase tracking-widest text-on-surface-variant">Last Opened</th>
                <th className="px-5 py-3 text-xs uppercase tracking-widest text-on-surface-variant text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {isLoading && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-on-surface-variant">
                    Loading profiles...
                  </td>
                </tr>
              )}

              {!isLoading && profiles.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-on-surface-variant">
                    No profiles yet.
                  </td>
                </tr>
              )}

              {profiles.map((profile) => {
                const isRunning = profile.status === 'running'

                return (
                  <tr key={profile.id} className="hover:bg-surface-bright/40 transition-colors">
                    <td className="px-5 py-4 text-sm font-semibold text-on-surface">{profile.name}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={isRunning ? 'status-dot-active animate-pulse' : 'status-dot-idle'} />
                        <span className={`text-xs font-semibold ${isRunning ? 'text-tertiary' : 'text-on-surface-variant'}`}>
                          {isRunning ? 'Running' : 'Closed'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-on-surface-variant">{profile.lastOpened ?? '—'}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => {
                          void runProfileAction(() => (isRunning ? handleStop(profile.id) : handleLaunch(profile.id)))
                        }}
                        className={`text-xs font-bold px-3 py-1 rounded transition-opacity hover:opacity-80 ${
                          isRunning ? 'bg-error text-white' : 'btn-primary'
                        }`}
                      >
                        {isRunning ? 'Stop' : 'Start'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default Dashboard
