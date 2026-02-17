
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import SignalFeed from './components/SignalFeed';
import { useTradingEngine } from './hooks/useTradingEngine';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [backtestResult, setBacktestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>('50.00');
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  
  const { 
    state, 
    signals, 
    logs, 
    config, 
    setConfig, 
    processMarketData, 
    executeTrade, 
    runBacktest,
    depositFunds
  } = useTradingEngine();

  useEffect(() => {
    const marketEvents = [
      { id: 'btc', headline: "Federal Reserve hints at interest rate pause; liquidity improves." },
      { id: 'eth', headline: "Massive institutional accumulation detected in Ethereum spot markets." },
      { id: 'btc', headline: "Network hash rate hits record high; fundamental strength grows." }
    ];

    const interval = setInterval(() => {
      const evt = marketEvents[Math.floor(Math.random() * marketEvents.length)];
      processMarketData(evt.id, evt.headline);
    }, 10000);

    return () => clearInterval(interval);
  }, [processMarketData]);

  const handleRunBacktest = async () => {
    setIsTesting(true);
    const result = await runBacktest();
    setBacktestResult(result);
    setIsTesting(false);
  };

  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (!isNaN(amount) && amount > 0) {
      depositFunds(amount);
      setDepositAmount('50.00');
      setIsDepositOpen(false);
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      isRemote={config.isRemoteMode} 
      isConnected={state.isBackendConnected}
    >
      {activeTab === 'dashboard' && <Dashboard state={state} logs={logs} />}
      
      {activeTab === 'signals' && (
        <SignalFeed signals={signals} onExecute={executeTrade} />
      )}
      
      {activeTab === 'backtest' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col items-center text-center">
            <div className={`p-4 rounded-full mb-4 ${isTesting ? 'bg-emerald-500/20 text-emerald-400 animate-spin' : 'bg-slate-800 text-slate-400'}`}>
              <i className={`fa-solid ${isTesting ? 'fa-spinner' : 'fa-flask-vial'} text-3xl`}></i>
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">Monte Carlo Alpha Validation</h3>
            <p className="text-slate-400 mb-6 max-w-md text-sm">
              Simulating <span className="text-emerald-400 font-mono font-bold">{config.activeStrategy}</span> performance over high-volatility Binance epochs.
            </p>
            <button 
              onClick={handleRunBacktest}
              disabled={isTesting}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              {isTesting ? <i className="fa-solid fa-sync fa-spin"></i> : <i className="fa-solid fa-play"></i>}
              {isTesting ? 'SIMULATING...' : 'INITIATE BACKTEST'}
            </button>
          </div>

          {backtestResult && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
                <h4 className="font-bold mb-6 text-slate-300 uppercase text-xs tracking-widest flex items-center gap-2">
                  <i className="fa-solid fa-chart-line text-emerald-400"></i>
                  Equity Growth Projection
                </h4>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={backtestResult.equityCurve}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }} />
                      <Area type="monotone" dataKey="bal" stroke="#10b981" fill="#10b98111" strokeWidth={2} isAnimationActive={true} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                <h4 className="font-bold border-b border-slate-800 pb-2 text-slate-300 uppercase text-xs tracking-widest">Alpha Metrics</h4>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Win Rate</span>
                  <span className="font-mono text-emerald-400 font-bold">{backtestResult.winRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Profit Factor</span>
                  <span className="font-mono text-blue-400 font-bold">{backtestResult.profitFactor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Max DD</span>
                  <span className="font-mono text-rose-400 font-bold">{(backtestResult.maxDrawdown * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between pt-6 border-t border-slate-800 font-bold text-lg">
                  <span className="text-slate-100">Final ROI</span>
                  <span className="text-emerald-400">+{((backtestResult.finalBalance - 500) / 5).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
           <div className="space-y-6">
             <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="font-bold mb-6 flex items-center gap-2 text-white">
                  <i className="fa-solid fa-microchip text-emerald-400"></i>
                  Decision Engine
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => setConfig({...config, activeStrategy: 'CONSENSUS'})}
                    className={`p-4 rounded-xl border text-left transition-all ${config.activeStrategy === 'CONSENSUS' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-xs font-bold uppercase tracking-wider">Consensus Algorithm</div>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">ALPHA SHIELD</span>
                    </div>
                    <div className="text-[10px] leading-tight opacity-70">Ensemble strategy: MA Crossover AND AI Bayesian sentiment must align. Minimizes false positives and API quota consumption.</div>
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setConfig({...config, activeStrategy: 'BAYESIAN_SENTIMENT'})}
                      className={`p-4 rounded-xl border text-left transition-all ${config.activeStrategy === 'BAYESIAN_SENTIMENT' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                    >
                      <div className="text-xs font-bold uppercase mb-1">Pure Bayesian</div>
                      <div className="text-[10px] opacity-70">AI-only sentiment extraction.</div>
                    </button>
                    <button 
                      onClick={() => setConfig({...config, activeStrategy: 'MA_CROSSOVER'})}
                      className={`p-4 rounded-xl border text-left transition-all ${config.activeStrategy === 'MA_CROSSOVER' ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                    >
                      <div className="text-xs font-bold uppercase mb-1">Pure Technical</div>
                      <div className="text-[10px] opacity-70">Trend following. Zero API cost.</div>
                    </button>
                  </div>
                </div>
             </div>

             <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="font-bold mb-6 flex items-center gap-2 text-white">
                  <i className="fa-solid fa-sliders text-emerald-400"></i>
                  Risk Guardrails
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Equity Hard Stop</label>
                    <input 
                      type="range" min="5" max="30" step="1"
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                      value={config.maxDrawdown * 100}
                      onChange={(e) => setConfig({...config, maxDrawdown: Number(e.target.value)/100})}
                    />
                    <div className="flex justify-between text-xs mt-3 font-mono text-slate-400">
                      <span>5% (Strict)</span>
                      <span className="text-emerald-400 font-bold">{(config.maxDrawdown * 100).toFixed(0)}% Drawdown</span>
                      <span>30% (Loose)</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Fractional Kelly Multiplier</label>
                    <input 
                      type="range" min="5" max="50" step="5"
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                      value={config.kellyFraction * 100}
                      onChange={(e) => setConfig({...config, kellyFraction: Number(e.target.value)/100})}
                    />
                    <div className="flex justify-between text-xs mt-3 font-mono text-slate-400">
                      <span>Conservative (0.05)</span>
                      <span className="text-emerald-400 font-bold">{config.kellyFraction.toFixed(2)} Kelly</span>
                      <span>Aggressive (0.50)</span>
                    </div>
                  </div>
                </div>
             </div>
           </div>

           <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold mb-6 flex items-center gap-2 text-blue-400">
                    <i className="fa-solid fa-satellite-dish"></i>
                    Network & API Node
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Remote Backend Node</span>
                        <div className="flex items-center gap-2">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={config.isRemoteMode}
                              onChange={(e) => setConfig({...config, isRemoteMode: e.target.checked})}
                            />
                            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                          </label>
                          <span className="text-[10px] font-bold text-slate-200">{config.isRemoteMode ? 'REMOTE_ON' : 'LOCAL_ONLY'}</span>
                        </div>
                      </div>
                      <input 
                        type="text" 
                        value={config.remoteNodeUrl}
                        onChange={(e) => setConfig({...config, remoteNodeUrl: e.target.value})}
                        placeholder="http://localhost:8000"
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-[10px] font-mono text-emerald-400 focus:outline-none focus:border-emerald-500/50"
                      />
                      {config.isRemoteMode && !state.isBackendConnected && (
                        <p className="text-[9px] text-rose-400 flex items-center gap-1">
                          <i className="fa-solid fa-triangle-exclamation"></i>
                          Connecting to Remote Node... Ensure Backend script is running.
                        </p>
                      )}
                    </div>

                    <div className={`p-4 rounded-lg border transition-all duration-500 ${state.isThrottled ? 'bg-rose-500/5 border-rose-500/20' : 'bg-slate-950 border-slate-800'}`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Gemini Alpha Quota</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${state.isThrottled ? 'bg-rose-500 text-white' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {state.isThrottled ? 'COOLING DOWN (429)' : 'NOMINAL'}
                        </span>
                      </div>
                      <div className="h-1 w-full bg-slate-800 rounded-full mt-3 overflow-hidden">
                        <div className={`h-full transition-all duration-[2000ms] ${state.isThrottled ? 'w-full bg-rose-500' : 'w-1/4 bg-emerald-500 animate-pulse'}`}></div>
                      </div>
                      {state.isThrottled && <p className="text-[9px] text-rose-400/80 mt-2 italic font-mono uppercase tracking-tighter text-center">Engine protecting quota for 120s...</p>}
                    </div>
                  </div>
                </div>

                {/* Capital Management Accordion */}
                <div className="border border-slate-800 rounded-xl overflow-hidden shadow-lg bg-slate-950/20">
                  <button 
                    onClick={() => setIsDepositOpen(!isDepositOpen)}
                    className="w-full flex items-center justify-between p-4 bg-slate-800/40 hover:bg-slate-800/60 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                         <i className="fa-solid fa-piggy-bank text-sm"></i>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-200">Inject Capital 💵</span>
                    </div>
                    <i className={`fa-solid fa-chevron-${isDepositOpen ? 'up' : 'down'} text-[10px] text-slate-500 transition-transform`}></i>
                  </button>
                  {isDepositOpen && (
                    <div className="p-5 bg-slate-900/50 border-t border-slate-800 space-y-4 animate-in slide-in-from-top-2 duration-300">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Simulated Deposit ($)</label>
                        <div className="flex gap-2">
                          <input 
                            type="number"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono flex-1 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                          />
                          <button 
                            onClick={handleDeposit}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                          >
                            FUND
                          </button>
                        </div>
                      </div>
                      <p className="text-[9px] text-slate-500 italic leading-relaxed">Account credited instantly. Alpha signals will re-scale using new fractional leverage calculations.</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-8 p-6 bg-slate-950/80 border border-slate-800 rounded-xl shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <i className="fa-solid fa-wallet text-6xl text-emerald-400"></i>
                 </div>
                 <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-2">
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Total Portfolio Value</div>
                   </div>
                   <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20 font-bold tracking-widest">LIVE_SYNC</span>
                 </div>
                 <div className="text-3xl font-mono font-bold text-white mb-2 tabular-nums">
                    ${state.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                 </div>
                 <div className="flex justify-between items-center text-[10px] text-slate-500 uppercase tracking-widest">
                    <span>Unrealized PnL</span>
                    <span className={`font-bold ${state.equity >= state.balance ? 'text-emerald-400' : 'text-rose-400'}`}>
                       {state.equity >= state.balance ? '+' : ''}${(state.equity - state.balance).toFixed(2)}
                    </span>
                 </div>
              </div>
           </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
