
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isRemote?: boolean;
  isConnected?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, isRemote, isConnected }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line' },
    { id: 'signals', label: 'Signals', icon: 'fa-satellite-dish' },
    { id: 'backtest', label: 'Backtester', icon: 'fa-history' },
    { id: 'settings', label: 'Risk Rules', icon: 'fa-shield-halved' },
  ];

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3 text-emerald-400 mb-8">
            <i className="fa-solid fa-robot text-2xl"></i>
            <h1 className="text-xl font-bold tracking-tight text-white">QuantSentinel</h1>
          </div>
          
          <nav className="space-y-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <i className={`fa-solid ${tab.icon} w-5`}></i>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-800">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="text-xs text-slate-500 uppercase font-bold mb-2">Engine Mode</div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isRemote ? (isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500') : 'bg-yellow-500 animate-pulse'}`}></div>
              <span className="text-sm font-medium text-slate-300">
                {isRemote ? (isConnected ? 'Remote Node (Live)' : 'Node Disconnected') : 'Local Simulation'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-950 relative">
        <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-8 py-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold capitalize">{activeTab.replace('-', ' ')}</h2>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
                <span className="text-xs font-mono text-slate-400">NETWORK:</span>
                <span className={`text-xs font-mono font-bold uppercase ${isRemote ? 'text-emerald-400' : 'text-yellow-500'}`}>
                  {isRemote ? 'Binance_Mainnet' : 'Binance_Testnet'}
                </span>
             </div>
             <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
                <span className="text-xs font-mono text-slate-400">ENGINE:</span>
                <span className="text-xs font-mono text-emerald-400 uppercase">Quant_V2.5</span>
             </div>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
