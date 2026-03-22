import React from 'react'

export const Automation: React.FC = () => {
  return (
    <div className="h-full flex flex-col pt-4">
      <div className="px-8 pb-4 border-b border-white/[0.05] shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface mb-1">Automation Scripts</h1>
        <p className="text-sm text-on-surface-variant">Manage and monitor your external Playwright/Puppeteer tasks</p>
      </div>

      {/* Two pane layout */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Pane - Scripts List */}
        <div className="w-[320px] max-w-[35%] flex flex-col border-r border-white/[0.05] bg-surface-container-low/50">
          <div className="p-4 shrink-0 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Scripts</h3>
            <button className="p-1 rounded hover:bg-surface-bright text-primary transition-colors">
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
          </div>
          
          <div className="overflow-y-auto flex-1 divide-y divide-white/[0.03]">
            {/* Active Script Item */}
            <div className="p-4 bg-surface-bright/50 border-l-2 border-primary cursor-pointer hover:bg-surface-bright">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-semibold text-on-surface">Amazon_Auto_Review.js</span>
                <span className="status-dot-active animate-pulse mt-1" />
              </div>
              <p className="text-xs text-on-surface-variant line-clamp-2">Navigates to Amazon, adds item to cart, leaves 5-star review using Profile Group A.</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[10px] font-mono bg-surface-container-highest px-1.5 py-0.5 rounded text-primary">Node.js</span>
                <span className="text-[10px] text-tertiary font-medium bg-tertiary/10 px-1.5 py-0.5 rounded border border-tertiary/20">Running (12m)</span>
              </div>
            </div>

            {/* Inactive Script Item */}
            <div className="p-4 hover:bg-surface-bright/30 border-l-2 border-transparent cursor-pointer transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-semibold text-on-surface">Shopee_Farm_Coins.py</span>
                <span className="w-2 h-2 rounded-full bg-outline-variant mt-1" />
              </div>
              <p className="text-xs text-on-surface-variant line-clamp-2">Daily login script to collect Shopee coins on all VN profiles.</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[10px] font-mono bg-surface-container-highest px-1.5 py-0.5 rounded text-blue-400">Python</span>
                <span className="text-[10px] text-on-surface-variant font-medium">Idle</span>
              </div>
            </div>
            
            <div className="p-4 hover:bg-surface-bright/30 border-l-2 border-transparent cursor-pointer transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-semibold text-error">Etsy_Mass_Listing.js</span>
                <span className="w-2 h-2 rounded-full bg-error mt-1" />
              </div>
              <p className="text-xs text-on-surface-variant line-clamp-2">Uploads CSV product list to multiple Etsy accounts simultaneously.</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[10px] font-mono bg-surface-container-highest px-1.5 py-0.5 rounded text-primary">Node.js</span>
                <span className="text-[10px] text-error font-medium">Failed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Pane - Details & Terminal */}
        <div className="flex-1 flex flex-col bg-surface">
          <div className="p-6 shrink-0 flex justify-between items-start border-b border-white/[0.05] bg-surface-container-highest/20">
            <div>
              <h2 className="text-lg font-bold text-on-surface mb-1">Amazon_Auto_Review.js</h2>
              <p className="text-xs text-on-surface-variant font-mono">/Users/helen/scripts/amazon_bot/main.js</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary text-xs flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">stop</span> Stop
              </button>
              <button className="btn-primary text-xs flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">edit</span> Edit Config
              </button>
            </div>
          </div>
          
          <div className="flex-1 p-6 relative bg-[#090b0e] overflow-hidden font-mono flex flex-col">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <span className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold font-sans">Execution Logs</span>
              <button className="text-on-surface-variant hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto text-xs text-on-surface-variant space-y-2 pb-10">
              <p><span className="text-primary mr-3">14:02:11</span> [INFO] Starting script worker (PID 8392)...</p>
              <p><span className="text-primary mr-3">14:02:12</span> [INFO] Connecting to CDP port 9222 for profile p1 (FB_Shop_Account_01)</p>
              <p><span className="text-tertiary mr-3">14:02:14</span> [SUCCESS] Playwright attached to browser context.</p>
              <p><span className="text-primary mr-3">14:02:15</span> [INFO] Navigating to https://amazon.com ...</p>
              <p><span className="text-primary mr-3">14:02:18</span> [INFO] Page loaded. Searching query "gaming mouse".</p>
              <p><span className="text-primary mr-3">14:02:22</span> [INFO] Clicking product id #B082XXXXX</p>
              <p><span className="text-error mr-3">14:02:25</span> [WARN] Captcha detected. Awaiting manual resolution or 2captcha API...</p>
              <p className="mt-4"><span className="animate-pulse flex gap-1"><span>.</span><span>.</span><span>.</span></span></p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Automation
