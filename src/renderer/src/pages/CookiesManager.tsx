import React from 'react'

export const CookiesManager: React.FC = () => {
  return (
    <div className="h-full flex flex-col pt-4">
      <div className="px-8 pb-4 border-b border-white/[0.05] shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface mb-1">Cookies Management</h1>
        <p className="text-sm text-on-surface-variant">Import, export, and manage session cookies for isolated profiles</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Pane - Profile Selector */}
        <div className="w-[280px] max-w-[30%] flex flex-col border-r border-white/[0.05] bg-surface-container-low/50">
          <div className="p-4 shrink-0">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">search</span>
              <input type="text" placeholder="Filter profiles..." className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary rounded pl-9 pr-3 py-1.5 text-xs text-on-surface" />
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 divide-y divide-white/[0.03]">
            <div className="px-4 py-3 bg-surface-bright/50 border-l-2 border-primary cursor-pointer hover:bg-surface-bright/70">
              <span className="text-sm font-semibold text-on-surface block mb-1">FB_Shop_Account_01</span>
              <span className="text-[10px] text-tertiary/80 rounded block">182 Cookies Stored</span>
            </div>
            <div className="px-4 py-3 hover:bg-surface-bright/30 border-l-2 border-transparent cursor-pointer transition-colors">
              <span className="text-sm font-medium text-on-surface-variant block mb-1">ShopeeVN_Seller_02</span>
              <span className="text-[10px] text-on-surface-variant/70 rounded block">45 Cookies Stored</span>
            </div>
            <div className="px-4 py-3 hover:bg-surface-bright/30 border-l-2 border-transparent cursor-pointer transition-colors">
              <span className="text-sm font-medium text-on-surface-variant block mb-1">Ads_Master_UK_01</span>
              <span className="text-[10px] text-on-surface-variant/70 rounded block">0 Cookies Stored</span>
            </div>
            <div className="px-4 py-3 hover:bg-surface-bright/30 border-l-2 border-transparent cursor-pointer transition-colors">
              <span className="text-sm font-medium text-on-surface-variant block mb-1">Amazon_Review_Gen_04</span>
              <span className="text-[10px] text-on-surface-variant/70 rounded block">301 Cookies Stored</span>
            </div>
          </div>
        </div>

        {/* Right Pane - Cookie Editor */}
        <div className="flex-1 flex flex-col p-8 bg-surface overflow-y-auto">
          
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-on-surface">Cookies Data</h2>
            <div className="flex gap-3">
              <button className="btn-secondary text-sm flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">delete</span> Clear All
              </button>
              <button className="btn-secondary text-sm flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">download</span> Export JSON
              </button>
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div className="border-2 border-dashed border-outline-variant/50 hover:border-primary/50 transition-colors rounded-xl p-10 flex flex-col items-center justify-center bg-surface-container-low mb-8">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-4">cloud_upload</span>
            <p className="text-sm text-on-surface font-semibold mb-1">Drag and drop Cookie file here</p>
            <p className="text-xs text-on-surface-variant mb-4 flex gap-1">Supports <span className="font-mono bg-surface-container-highest px-1 rounded">JSON</span> and <span className="font-mono bg-surface-container-highest px-1 rounded">Netscape/TXT</span> formats</p>
            <button className="btn-primary text-xs">Browse Files</button>
          </div>

          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">Preview (FB_Shop_Account_01)</p>
          <div className="bg-surface-container-highest/20 rounded-lg border border-outline-variant/20 overflow-hidden font-mono text-[11px] p-0 flex-1 min-h-[300px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container/50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-on-surface-variant font-semibold">Domain</th>
                  <th className="px-4 py-2 text-on-surface-variant font-semibold">Name</th>
                  <th className="px-4 py-2 text-on-surface-variant font-semibold">Value</th>
                  <th className="px-4 py-2 text-on-surface-variant font-semibold w-24">Path</th>
                  <th className="px-4 py-2 text-on-surface-variant font-semibold w-24">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                <tr className="hover:bg-surface-bright/30">
                  <td className="px-4 py-3 text-secondary">.facebook.com</td>
                  <td className="px-4 py-3 text-primary">c_user</td>
                  <td className="px-4 py-3 text-on-surface-variant truncate max-w-[150px]">100083234912234</td>
                  <td className="px-4 py-3 text-on-surface-variant">/</td>
                  <td className="px-4 py-3 text-on-surface-variant opacity-50">2027-01-01</td>
                </tr>
                <tr className="hover:bg-surface-bright/30">
                  <td className="px-4 py-3 text-secondary">.facebook.com</td>
                  <td className="px-4 py-3 text-primary">xs</td>
                  <td className="px-4 py-3 text-on-surface-variant truncate max-w-[150px]">45%3ATr7X2dJpA...</td>
                  <td className="px-4 py-3 text-on-surface-variant">/</td>
                  <td className="px-4 py-3 text-on-surface-variant opacity-50">2027-01-01</td>
                </tr>
                <tr className="hover:bg-surface-bright/30">
                  <td className="px-4 py-3 text-secondary">.facebook.com</td>
                  <td className="px-4 py-3 text-primary">fr</td>
                  <td className="px-4 py-3 text-on-surface-variant truncate max-w-[150px]">0X1Y2Z3A4B5C.D6...</td>
                  <td className="px-4 py-3 text-on-surface-variant">/</td>
                  <td className="px-4 py-3 text-on-surface-variant opacity-50">2026-06-01</td>
                </tr>
                <tr className="hover:bg-surface-bright/30">
                  <td className="px-4 py-3 text-secondary">google.com</td>
                  <td className="px-4 py-3 text-primary">NID</td>
                  <td className="px-4 py-3 text-on-surface-variant truncate max-w-[150px]">511=abCDEfGHIjk...</td>
                  <td className="px-4 py-3 text-on-surface-variant">/</td>
                  <td className="px-4 py-3 text-on-surface-variant opacity-50">2026-09-12</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}

export default CookiesManager
