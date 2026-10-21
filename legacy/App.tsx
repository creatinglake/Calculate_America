import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './components/Dashboard';
import Methodology from './components/Methodology';
import OnboardingModal from './components/OnboardingModal';
import { UserState, ViewState } from './types';

function App() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [showOnboarding, setShowOnboarding] = useState(true);
  
  const [userState, setUserState] = useState<UserState>({
    income: 45000,
    yearsWorked: 10,
    hasOnboarded: false
  });

  // Load state from local storage on mount (optional enhancement for future)
  // For now, simple state.

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard userState={userState} setUserState={setUserState} setShowOnboarding={setShowOnboarding} />;
      case 'distributions':
        return <Dashboard userState={userState} setUserState={setUserState} setShowOnboarding={setShowOnboarding} />; // Re-use dashboard for simplicity in V1
      case 'methodology':
        return <Methodology />;
      default:
        return <Dashboard userState={userState} setUserState={setUserState} setShowOnboarding={setShowOnboarding} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-800">
      
      {/* Sidebar Navigation */}
      <Sidebar 
        currentView={currentView} 
        onNavigate={setCurrentView}
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6 scroll-smooth">
           {renderContent()}
           
           <footer className="max-w-6xl mx-auto mt-12 mb-6 text-center text-slate-400 text-sm">
             <p>© {new Date().getFullYear()} FairShare. Educational visualization only.</p>
           </footer>
        </main>
      </div>

      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal onClose={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}

export default App;