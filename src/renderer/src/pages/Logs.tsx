import React, { useCallback, useEffect, useRef, useState } from 'react'

type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug'
type LogSource = 'system' | 'automation' | 'proxy' | 'profile' | 'cookie'

interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  source: LogSource
  message: string
}

const LEVEL_STYLES: Record<LogLevel, { dot: string; text: string; label: string }> = {
  info: { dot: 'bg-primary', text: 'text-primary', label: 'INFO' },
  warn: { dot: 'bg-[#ffb74d]', text: 'text-[#ffb74d]', label: 'WARN' },
  error: { dot: 'bg-error', text: 'text-error', label: 'ERROR' },
  success: { dot: 'bg-tertiary', text: 'text-tertiary', label: 'OK' },
  debug: { dot: 'bg-on-surface-variant', text: 'text-on-surface-variant', label: 'DEBUG' },
}

const SOURCE_LABELS: Record<LogSource, { icon: string; label: string }> = {
  system: { icon: 'memory', label: 'System' },
  automation: { icon: 'auto_mode', label: 'Automation' },
  proxy: { icon: 'vpn_lock', label: 'Proxy' },
  profile: { icon: 'person_pin', label: 'Profile' },
  cookie: { icon: 'cookie', label: 'Cookie' },
}

const MOCK_LOGS: LogEntry[] = [
  { id: '1', timestamp: '14:02:01', level: 'info', source: 'system', message: 'Anti-Detech engine initialized. Version 1.0.0-alpha.' },
  { id: '2', timestamp: '14:02:02', level: 'success', source: 'system', message: 'Database connection established (SQLite).' },
  { id: '3', timestamp: '14:02:04', level: 'info', source: 'profile', message: 'Loading 128 profiles from database...' },
  { id: '4', timestamp: '14:02:05', level: 'success', source: 'profile', message: '128 profiles loaded successfully.' },
  { id: '5', timestamp: '14:02:08', level: 'info', source: 'proxy', message: 'Proxy pool initialized: 54 proxies (36 active, 3 failed, 15 untested).' },
  { id: '6', timestamp: '14:02:10', level: 'info', source: 'automation', message: 'Starting script worker (PID 8392)...' },
  { id: '7', timestamp: '14:02:12', level: 'info', source: 'automation', message: 'Connecting to CDP port 9222 for profile FB_Shop_Account_01.' },
  { id: '8', timestamp: '14:02:14', level: 'success', source: 'automation', message: 'Playwright attached to browser context.' },
  { id: '9', timestamp: '14:02:15', level: 'info', source: 'automation', message: 'Navigating to https://amazon.com ...' },
  { id: '10', timestamp: '14:02:18', level: 'info', source: 'profile', message: 'Profile FB_Shop_Account_01 launched (Chrome v114, Proxy: US-NYC-Static-01).' },
  { id: '11', timestamp: '14:02:20', level: 'warn', source: 'proxy', message: 'Proxy DE-Berlin-Datacenter latency high (450ms). Consider switching.' },
  { id: '12', timestamp: '14:02:22', level: 'info', source: 'automation', message: 'Searching query "gaming mouse" on Amazon...' },
  { id: '13', timestamp: '14:02:25', level: 'error', source: 'automation', message: 'Captcha detected on Amazon. Awaiting manual resolution or 2captcha API.' },
  { id: '14', timestamp: '14:02:28', level: 'info', source: 'profile', message: 'Profile ShopeeVN_Seller_02 launched (Chrome v114, Proxy: VN-HCM-Resi-99).' },
  { id: '15', timestamp: '14:02:30', level: 'error', source: 'proxy', message: 'Proxy VN-HCM-Resi-99 connection failed: ETIMEDOUT after 10s.' },
  { id: '16', timestamp: '14:02:32', level: 'warn', source: 'profile', message: 'Profile ShopeeVN_Seller_02 running without proxy (direct connection).' },
  { id: '17', timestamp: '14:02:35', level: 'info', source: 'cookie', message: 'Imported 142 cookies for FB_Shop_Account_01 (JSON format).' },
  { id: '18', timestamp: '14:02:38', level: 'success', source: 'cookie', message: 'Cookie import verified — all 142 entries persisted.' },
  { id: '19', timestamp: '14:02:40', level: 'info', source: 'system', message: 'System metrics: CPU 34%, RAM 6.2 GB / 16 GB (38%).' },
  { id: '20', timestamp: '14:02:42', level: 'debug', source: 'system', message: 'Garbage collection completed. Freed 128 MB.' },
  { id: '21', timestamp: '14:02:45', level: 'info', source: 'automation', message: 'Script Amazon_Auto_Review.js completed task 1/5.' },
  { id: '22', timestamp: '14:02:48', level: 'warn', source: 'system', message: 'License expires in 30 days. Renew at Settings > License.' },
  { id: '23', timestamp: '14:02:50', level: 'error', source: 'automation', message: 'Script Etsy_Mass_Listing.js crashed: Unhandled rejection — element not found.' },
  { id: '24', timestamp: '14:02:52', level: 'info', source: 'profile', message: 'Profile Ads_Master_UK_01 stopped by user.' },
]

export const Logs: React.FC = () => {
  const [logs] = useState<LogEntry[]>(MOCK_LOGS)
  const [searchQuery, setSearchQuery] = useState('')
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all')
  const [sourceFilter, setSourceFilter] = useState<LogSource | 'all'>('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const filteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      if (levelFilter !== 'all' && log.level !== levelFilter) return false
      if (sourceFilter !== 'all' && log.source !== sourceFilter) return false
      if (searchQuery.trim()) {
        const keyword = searchQuery.trim().toLowerCase()
        return log.message.toLowerCase().includes(keyword)
      }
      return true
    })
  }, [logs, levelFilter, sourceFilter, searchQuery])

  const stats = React.useMemo(() => {
    const total = logs.length
    const errors = logs.filter((l) => l.level === 'error').length
    const warnings = logs.filter((l) => l.level === 'warn').length
    return { total, errors, warnings }
  }, [logs])

  const scrollToBottom = useCallback(() => {
    if (autoScroll) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [autoScroll])

  useEffect(() => {
    scrollToBottom()
  }, [filteredLogs, scrollToBottom])

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <section
        className="flex items-center justify-between px-10 h-[120px] border-b border-outline-variant/10 relative overflow-hidden shrink-0"
        style={{ background: 'linear-gradient(135deg, #111318 0%, #0c0e12 100%)' }}
      >
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/[0.04] to-transparent pointer-events-none" />

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">System Logs</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Real-time system, automation, and profile activity logs
          </p>
        </div>

        <div className="flex gap-4">
          {[
            { label: 'Total Entries', value: stats.total.toString(), color: 'on-surface' },
            { label: 'Errors', value: stats.errors.toString(), color: 'error', dot: stats.errors > 0 },
            { label: 'Warnings', value: stats.warnings.toString(), color: '[#ffb74d]', dot: stats.warnings > 0 },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-surface-container-high border border-outline-variant/20
                px-5 py-3 rounded-lg min-w-[120px] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-primary/[0.06] to-transparent" />
              <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                {stat.label}
              </p>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-bold text-${stat.color} leading-none`}>
                  {stat.value}
                </span>
                {stat.dot && <span className={`w-2 h-2 rounded-full bg-${stat.color} animate-pulse`} />}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Main Content */}
      <section className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="px-6 py-3 flex items-center justify-between gap-4 border-b border-white/[0.05] bg-surface-container shrink-0">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-sm">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-container-highest border border-outline-variant/20
                  focus:ring-1 focus:ring-primary/30 rounded-lg pl-10 pr-4 py-2 text-sm text-on-surface
                  placeholder:text-on-surface-variant"
              />
            </div>

            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as LogLevel | 'all')}
              className="bg-surface-container-highest border border-outline-variant/20
                focus:ring-1 focus:ring-primary/30 rounded-lg py-2 pl-3 pr-8 text-sm text-on-surface cursor-pointer"
            >
              <option value="all">All Levels</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
              <option value="debug">Debug</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as LogSource | 'all')}
              className="bg-surface-container-highest border border-outline-variant/20
                focus:ring-1 focus:ring-primary/30 rounded-lg py-2 pl-3 pr-8 text-sm text-on-surface cursor-pointer"
            >
              <option value="all">All Sources</option>
              <option value="system">System</option>
              <option value="automation">Automation</option>
              <option value="proxy">Proxy</option>
              <option value="profile">Profile</option>
              <option value="cookie">Cookie</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${
                autoScroll
                  ? 'border-primary/30 text-primary bg-primary/[0.08]'
                  : 'border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-highest'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {autoScroll ? 'vertical_align_bottom' : 'pause'}
              </span>
              Auto-scroll
            </button>

            <button className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface
              px-3 py-2 rounded-lg border border-outline-variant/20 hover:bg-surface-container-highest transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Export
            </button>

            <button className="flex items-center gap-1.5 text-xs font-semibold text-error hover:bg-error/10
              px-3 py-2 rounded-lg border border-error/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
              Clear
            </button>
          </div>
        </div>

        {/* Log Entries */}
        <div className="flex-1 overflow-y-auto bg-[#090b0e] font-mono text-xs">
          {filteredLogs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-on-surface-variant">
              <span className="material-symbols-outlined text-[48px] opacity-20">
                find_in_page
              </span>
              <p className="text-sm font-sans">No log entries match your filters.</p>
            </div>
          )}

          <div className="divide-y divide-white/[0.03]">
            {filteredLogs.map((log) => {
              const levelStyle = LEVEL_STYLES[log.level]
              const sourceInfo = SOURCE_LABELS[log.source]

              return (
                <div
                  key={log.id}
                  className={`flex items-start gap-4 px-6 py-2.5 hover:bg-white/[0.02] transition-colors group ${
                    log.level === 'error' ? 'bg-error/[0.03]' : ''
                  }`}
                >
                  {/* Timestamp */}
                  <span className="text-primary/70 shrink-0 w-[72px] pt-0.5 select-all">
                    [{log.timestamp}]
                  </span>

                  {/* Level Badge */}
                  <span
                    className={`shrink-0 w-[52px] text-center font-bold text-[10px] tracking-wider py-0.5 rounded ${levelStyle.text}`}
                  >
                    {levelStyle.label}
                  </span>

                  {/* Source Tag */}
                  <span className="shrink-0 flex items-center gap-1 w-[100px]">
                    <span className="material-symbols-outlined text-[14px] text-on-surface-variant/60">
                      {sourceInfo.icon}
                    </span>
                    <span className="text-on-surface-variant/80 text-[10px] uppercase tracking-widest font-sans font-semibold">
                      {sourceInfo.label}
                    </span>
                  </span>

                  {/* Message */}
                  <span
                    className={`flex-1 leading-relaxed ${
                      log.level === 'error'
                        ? 'text-error/90'
                        : log.level === 'warn'
                          ? 'text-[#ffb74d]/90'
                          : log.level === 'success'
                            ? 'text-tertiary/90'
                            : 'text-on-surface-variant/90'
                    }`}
                  >
                    {log.message}
                  </span>
                </div>
              )
            })}
          </div>
          <div ref={logsEndRef} />
        </div>

        {/* Footer */}
        <div className="px-6 py-2.5 bg-surface-container flex items-center justify-between text-[10px] font-semibold tracking-widest text-on-surface-variant uppercase shrink-0 border-t border-white/[0.05]">
          <span>
            Showing {filteredLogs.length} of {logs.length} entries
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
              Live
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Logs
