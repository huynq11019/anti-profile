import React, { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Header } from '@renderer/components/layout/Header'
import { Sidebar } from '@renderer/components/layout/Sidebar'
import { Dashboard } from '@renderer/pages/Dashboard'
import { Profiles } from '@renderer/pages/Profiles'
import { ProxyManager } from '@renderer/pages/ProxyManager'
import { Automation } from '@renderer/pages/Automation'
import { CookiesManager } from '@renderer/pages/CookiesManager'
import { Settings } from '@renderer/pages/Settings'
import { CreateProfileModal } from '@renderer/components/modals/CreateProfileModal'

// Lazy placeholder pages for other routes
const PlaceholderPage: React.FC<{ title: string; icon: string }> = ({ title, icon }) => (
  <div className="flex flex-col items-center justify-center h-full gap-4 text-on-surface-variant">
    <span className="material-symbols-outlined text-[64px] text-primary opacity-30">{icon}</span>
    <p className="text-headline-sm font-bold text-on-surface opacity-50">{title}</p>
    <p className="text-sm">Coming soon — designs ready, implementation next.</p>
  </div>
)

const App: React.FC = () => {
  const [isCreateModalOpen, setCreateModalOpen] = useState(false)

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-surface overflow-hidden">
        {/* Fixed header */}
        <Header onCreateProfile={() => setCreateModalOpen(true)} />

        {/* Fixed sidebar */}
        <Sidebar />

        {/* Main scrollable content */}
        <main className="ml-[240px] pt-[60px] flex-1 overflow-hidden bg-surface-container-low">
          <div className="h-full overflow-auto">
            <Routes>
              <Route
                path="/"
                element={<Dashboard />}
              />
              <Route
                path="/profiles"
                element={<Profiles onCreateProfile={() => setCreateModalOpen(true)} />}
              />
              <Route
                path="/proxy"
                element={<ProxyManager />}
              />
              <Route
                path="/automation"
                element={<Automation />}
              />
              <Route
                path="/cookies"
                element={<CookiesManager />}
              />
              <Route
                path="/extensions"
                element={<PlaceholderPage title="Extensions" icon="extension" />}
              />
              <Route
                path="/logs"
                element={<PlaceholderPage title="Logs" icon="terminal" />}
              />
              <Route
                path="/settings"
                element={<Settings />}
              />
            </Routes>
          </div>
        </main>

        {/* Create Profile Modal */}
        <CreateProfileModal
          isOpen={isCreateModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSubmit={(data) => console.log('Create profile:', data)}
        />
      </div>
    </BrowserRouter>
  )
}

export default App
