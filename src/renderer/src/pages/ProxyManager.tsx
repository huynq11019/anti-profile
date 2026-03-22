import React, { useState } from 'react'
import { Proxy } from '@shared/types'

// Mock Data
const PROXY_LIST: Proxy[] = [
  { id: '1', alias: 'US-NYC-Static-01', protocol: 'http', host: '192.168.1.142', port: 8080, username: 'usr', testStatus: 'active', lastTested: '2 mins ago' },
  { id: '2', alias: 'VN-HCM-Resi-99', protocol: 'socks5', host: '103.45.12.8', port: 1080, testStatus: 'failed', lastTested: 'Failed (Timeout)' },
  { id: '3', alias: 'DE-Berlin-Datacenter', protocol: 'http', host: '45.22.33.101', port: 3128, username: 'usr', testStatus: 'active', lastTested: '1 hour ago' },
  { id: '4', alias: 'JP-Tokyo-Mobile-04', protocol: 'socks5', host: '210.5.12.33', port: 443, username: 'usr', testStatus: 'active', lastTested: 'Just now' },
]

export const ProxyManager: React.FC = () => {
  const [proxies] = useState<Proxy[]>(PROXY_LIST)

  return (
    <div className="p-8 max-w-[1400px] mx-auto h-full flex flex-col">
      {/* ── Page Header ─────────────────────────────── */}
      <section className="h-[80px] flex items-center justify-between mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface headline-sm">Proxy Manager</h1>
          <p className="text-sm text-on-surface-variant body-md">Manage your centralized proxy pool</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary">Import List</button>
          <button className="btn-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">add</span>
            Add Proxy
          </button>
        </div>
      </section>

      {/* ── Stats Bar ─────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 shrink-0">
        {[
          { label: 'Total Proxies', value: '54', color: 'primary' },
          { label: 'Active', value: '36', color: 'tertiary', dot: true },
          { label: 'Failed', value: '3', color: 'error', dot: true },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface-container-low p-5 rounded-xl relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-${stat.color}/10 to-transparent`} />
            <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant mb-1">{stat.label}</p>
            <div className="flex items-end gap-2">
              <span className={`text-4xl font-black text-${stat.color === 'primary' ? 'on-surface' : stat.color} leading-none`}>
                {stat.value}
              </span>
              {stat.dot && <div className={`w-2.5 h-2.5 rounded-full bg-${stat.color} mb-2 shadow-glow`} />}
            </div>
          </div>
        ))}
      </section>

      {/* ── Proxy Table ─────────────────────────────── */}
      <section className="bg-surface-container-low rounded-xl overflow-hidden shadow-2xl flex-1 flex flex-col min-h-0">
        {/* Toolbar */}
        <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.05] bg-surface-container shrink-0">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
              <input
                type="text"
                placeholder="Search by alias, host or port..."
                className="w-full bg-surface-container-highest border border-outline-variant/20 focus:ring-1 focus:ring-primary/30 rounded-lg pl-10 pr-4 py-2 text-sm text-on-surface"
              />
            </div>
            <select className="bg-surface-container-highest border border-outline-variant/20 focus:ring-1 focus:ring-primary/30 rounded-lg py-2 pl-4 pr-10 text-sm text-on-surface cursor-pointer">
              <option>All Protocols</option>
              <option>HTTP</option>
              <option>SOCKS5</option>
            </select>
          </div>
          <button className="flex items-center gap-2 text-primary font-semibold text-sm hover:bg-primary/[0.05] border border-primary/20 px-4 py-2 rounded-lg transition-colors">
            <span className="material-symbols-outlined text-lg">science</span>
            Test All
          </button>
        </div>

        {/* Table Content */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-surface-container-low bg-opacity-95 backdrop-blur z-10">
              <tr>
                <th className="px-6 py-4 w-10">
                  <input type="checkbox" className="rounded border-outline-variant bg-surface-container-highest text-primary" />
                </th>
                {['Status', 'Alias', 'Protocol', 'Host', 'Port', 'Auth', 'Assigned', 'Last Tested', 'Actions'].map((col) => (
                  <th key={col} className={`px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ${col === 'Actions' ? 'text-right pr-6' : ''}`}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {proxies.map((proxy) => (
                <tr key={proxy.id} className="group hover:bg-surface-bright transition-colors">
                  <td className="px-6 py-4"><input type="checkbox" className="rounded border-outline-variant bg-surface-container-highest text-primary" /></td>
                  <td className="px-3 py-4">
                    <div className={`w-2.5 h-2.5 rounded-full ${proxy.testStatus === 'active' ? 'bg-tertiary shadow-glow-green' : 'bg-error'}`} />
                  </td>
                  <td className="px-4 py-4 font-medium text-on-surface text-sm">{proxy.alias}</td>
                  <td className="px-4 py-4">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${proxy.protocol === 'http' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-secondary-container text-secondary border-secondary/20'}`}>
                      {proxy.protocol.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-mono text-xs text-on-surface-variant">{proxy.host}</td>
                  <td className="px-4 py-4 font-mono text-xs text-on-surface-variant">{proxy.port}</td>
                  <td className="px-4 py-4 flex justify-center">
                    {proxy.username ? (
                      <span className="material-symbols-outlined text-tertiary text-lg">lock</span>
                    ) : (
                      <span className="material-symbols-outlined text-on-surface-variant/40 text-lg">lock_open</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className="bg-surface-container-highest px-2 py-0.5 rounded-full text-[10px] font-bold text-primary">0</span>
                  </td>
                  <td className={`px-4 py-4 text-[10px] font-medium ${proxy.testStatus === 'failed' ? 'text-error' : 'text-on-surface-variant'}`}>
                    {proxy.lastTested}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors"><span className="material-symbols-outlined text-lg">play_circle</span></button>
                      <button className="p-1.5 text-on-surface-variant hover:bg-surface-container-highest rounded-md transition-colors"><span className="material-symbols-outlined text-lg">edit</span></button>
                      <button className="p-1.5 text-error hover:bg-error/10 rounded-md transition-colors"><span className="material-symbols-outlined text-lg">delete</span></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-surface-container flex items-center justify-between text-[10px] font-semibold tracking-widest text-on-surface-variant uppercase shrink-0">
          <span>Showing {proxies.length} of 54 proxies</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-surface-container-highest rounded opacity-50 cursor-not-allowed">Prev</button>
            <button className="px-3 py-1 bg-surface-container-highest rounded hover:bg-primary hover:text-on-primary-fixed transition-colors">Next</button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default ProxyManager
