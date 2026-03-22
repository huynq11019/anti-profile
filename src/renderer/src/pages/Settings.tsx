import React from 'react'

export const Settings: React.FC = () => {
  return (
    <div className="p-8 mx-auto w-full h-full overflow-y-auto" style={{ maxWidth: '800px' }}>
      {/* ── Page Header ─────────────────────────────── */}
      <section className="mb-10 mt-4">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface mb-1">Global Settings</h1>
        <p className="text-sm text-on-surface-variant">Configure application behavior, licenses, and API keys</p>
      </section>

      {/* ── Settings Cards ─────────────────────────────── */}
      <div className="flex flex-col gap-6">
        
        {/* Card 1: License */}
        <div className="bg-surface-container border border-outline-variant/20 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/[0.03] to-transparent pointer-events-none" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-on-surface-variant mb-5">License Details</h2>
          
          <div className="flex justify-between items-center bg-surface-container-low p-4 rounded-lg border border-white/[0.04]">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-lg font-bold text-on-surface">Anti-Detech Pro Plan</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-tertiary/10 text-tertiary px-2 py-0.5 rounded-full border border-tertiary/20">Active</span>
              </div>
              <p className="text-xs text-on-surface-variant font-mono">Valid until: Dec 31, 2027</p>
            </div>
            <button className="btn-secondary">Renew License</button>
          </div>
        </div>

        {/* Card 2: General Application */}
        <div className="bg-surface-container border border-outline-variant/20 rounded-xl p-6 relative overflow-hidden">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-on-surface-variant mb-5">Application Settings</h2>
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-3 rounded hover:bg-surface-bright/50 transition-colors">
              <div>
                <p className="text-sm font-medium text-on-surface">Launch on startup</p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">Start Anti-Detech automatically when you log into your computer</p>
              </div>
              <div className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded hover:bg-surface-bright/50 transition-colors">
              <div>
                <p className="text-sm font-medium text-on-surface">Hardware Acceleration</p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">Use GPU to render profiles (recommended)</p>
              </div>
              <div className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
              </div>
            </div>

            <hr className="border-white/[0.05] my-2" />

            <div className="flex items-center justify-between p-3">
              <label className="text-sm font-medium text-on-surface w-1/3">Default Browser Core</label>
              <select className="w-2/3 bg-surface-container-highest border border-outline-variant/30 rounded px-4 py-2 text-sm text-on-surface focus:ring-1 focus:ring-primary">
                <option value="chrome-114">Chromium v114 (Recommended)</option>
                <option value="chrome-116">Chromium v116</option>
                <option value="firefox">Firefox ESR</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3">
              <label className="text-sm font-medium text-on-surface w-1/3">Local Data Directory</label>
              <div className="w-2/3 flex gap-2">
                <input type="text" readOnly value="/Users/helen/Library/Application Support/AntiDetech" className="flex-1 bg-surface-container-highest border border-outline-variant/30 rounded px-4 py-2 text-xs font-mono text-on-surface-variant focus:ring-1 focus:ring-primary" />
                <button className="btn-secondary">Browse</button>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: API Integration */}
        <div className="bg-surface-container border border-outline-variant/20 rounded-xl p-6 relative overflow-hidden">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-on-surface-variant mb-1">API Configuration</h2>
          <p className="text-xs text-on-surface-variant mb-5">Manage your local API port for external script integration (Playwright/Puppeteer)</p>
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-3">
              <label className="text-sm font-medium text-on-surface w-1/3">Local API Port</label>
              <input type="number" defaultValue={9222} className="w-2/3 bg-surface-container-highest border border-outline-variant/30 rounded px-4 py-2 text-sm font-mono text-on-surface focus:ring-1 focus:ring-primary" />
            </div>

            <div className="flex items-center justify-between p-3">
              <label className="text-sm font-medium text-on-surface w-1/3">Integration Key</label>
              <div className="w-2/3 flex gap-2">
                <div className="relative flex-1">
                  <input type="password" readOnly value="1234567812345678" className="w-full bg-surface-container-highest border border-outline-variant/30 rounded px-4 py-2 text-sm text-on-surface tracking-[0.2em] focus:ring-1 focus:ring-primary" />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-on-surface-variant hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  </button>
                </div>
                <button className="btn-secondary whitespace-nowrap">Regenerate</button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Bottom Actions ─────────────────────────────── */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/[0.05] pb-20">
        <button className="text-xs font-semibold text-error hover:underline underline-offset-4">Factory Reset Data</button>
        <button className="btn-primary flex items-center gap-2 px-8">
          <span className="material-symbols-outlined text-[18px]">save</span>
          Save Changes
        </button>
      </div>

    </div>
  )
}

export default Settings
