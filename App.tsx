
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
      { id: 'btc', headline: "Global liquidity injection fuels BTC institutional demand." },
      { id: 'eth', headline: "Ethereum L2 throughput reaches record highs." },
    ];

    // Simulate market ticks every 8 seconds
    const interval = setInterval(() => {
      marketEvents.forEach(evt => {
        processMarketData(evt.id, evt.headline);
      });
    }, 8000);

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
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && <Dashboard state={state} logs={logs} />}
      
      {activeTab === 'signals' && (
        <SignalFeed signals={signals} onExecute={executeTrade} />
      )}
      
      {activeTab === 'backtest' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col items-center text-center">
            <div className={`p-4 rounded-full mb-4 ${isTesting ? 'bg-emerald-500/20 text-emerald-400 animate-spin' : 'bg-slate-800 text-slate-400'}`}>
              <i className={`fa-solid ${isTesting ? 'fa-spinner' : 'fa-flask'} text-3xl`}></i>
            </div>
            <h3 className="text-xl font-bold mb-2">Quant Backtester v2.0</h3>
            <p className="text-slate-400 mb-6 max-w-md">
              Validating: <span className="text-emerald-400 font-mono font-bold">{config.activeStrategy}</span>. 
              Applying Monte Carlo analysis to historical Binance volatility clusters.
            </p>
            <button 
              onClick={handleRunBacktest}
              disabled={isTesting}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-lg shadow-emerald-600/20"
            >
              {isTesting ? 'CALCULATING...' : 'RUN SIMULATION'}
            </button>
          </div>

          {backtestResult && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h4 className="font-bold mb-6 text-slate-300 uppercase text-xs tracking-widest">Equity Trajectory</h4>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={backtestResult.equityCurve}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                      <Area type="monotone" dataKey="bal" stroke="#10b981" fill="#10b98111" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                <h4 className="font-bold border-b border-slate-800 pb-2 text-slate-300 uppercase text-xs tracking-widest">Performance KPIs</h4>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Win Rate</span>
                  <span className="font-mono text-emerald-400">{backtestResult.winRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Expectancy</span>
                  <span className="font-mono">${backtestResult.expectancy.toFixed(2)} / unit</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Profit Factor</span>
                  <span className="font-mono text-blue-400">{backtestResult.profitFactor}</span>
                </div>
                <div className="flex justify-between pt-4 border-t border-slate-800 font-bold">
                  <span>Cumulative ROI</span>
                  <span className="text-emerald-400">+{((backtestResult.finalBalance - 500) / 5).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-6">
             <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="font-bold mb-6 flex items-center gap-2">
                  <i className="fa-solid fa-microchip text-emerald-400"></i>
                  Active Strategy
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => setConfig({...config, activeStrategy: 'CONSENSUS'})}
                    className={`p-4 rounded-xl border text-left transition-all ${config.activeStrategy === 'CONSENSUS' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-xs font-bold uppercase">Consensus Mode</div>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">ULTRA-LOW RISK</span>
                    </div>
                    <div className="text-[10px] leading-tight opacity-70">Executes only when AI Bayesian sentiment aligns with Technical MA Crossovers. Minimum API usage.</div>
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setConfig({...config, activeStrategy: 'BAYESIAN_SENTIMENT'})}
                      className={`p-4 rounded-xl border text-left transition-all ${config.activeStrategy === 'BAYESIAN_SENTIMENT' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                    >
                      <div className="text-xs font-bold uppercase mb-1">Bayesian Only</div>
                      <div className="text-[10px] opacity-70">Pure AI News Catalyst digestion via Gemini.</div>
                    </button>
                    <button 
                      onClick={() => setConfig({...config, activeStrategy: 'MA_CROSSOVER'})}
                      className={`p-4 rounded-xl border text-left transition-all ${config.activeStrategy === 'MA_CROSSOVER' ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                    >
                      <div className="text-xs font-bold uppercase mb-1">Technical Only</div>
                      <div className="text-[10px] opacity-70">Pure MA Trend Following (Zero API).</div>
                    </button>
                  </div>
                </div>
             </div>

             <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="font-bold mb-6 flex items-center gap-2">
                  <i className="fa-solid fa-sliders text-emerald-400"></i>
                  Risk Guardrails
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Portfolio Hard Stop</label>
                    <input 
                      type="range" min="5" max="30" step="1"
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                      value={config.maxDrawdown * 100}
                      onChange={(e) => setConfig({...config, maxDrawdown: Number(e.target.value)/100})}
                    />
                    <div className="flex justify-between text-xs mt-2 font-mono text-slate-400">
                      <span>5%</span>
                      <span className="text-emerald-400">{(config.maxDrawdown * 100).toFixed(0)}%</span>
                      <span>30%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Kelly Leverage Multiplier</label>
                    <input 
                      type="range" min="5" max="50" step="5"
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                      value={config.kellyFraction * 100}
                      onChange={(e) => setConfig({...config, kellyFraction: Number(e.target.value)/100})}
                    />
                    <div className="flex justify-between text-xs mt-2 font-mono text-slate-400">
                      <span>0.05 (Safe)</span>
                      <span className="text-emerald-400">{config.kellyFraction.toFixed(2)}</span>
                      <span>0.50 (Aggressive)</span>
                    </div>
                  </div>
                </div>
             </div>
           </div>

           <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold mb-6 flex items-center gap-2 text-blue-400">
                    <i className="fa-solid fa-signal"></i>
                    Connectivity
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400">BINANCE TESTNET</span>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-400/10 px-2 py-1 rounded">ONLINE</span>
                    </div>
                    <div className={`p-4 rounded-lg border transition-all ${state.isThrottled ? 'bg-rose-500/5 border-rose-500/20' : 'bg-slate-950 border-slate-800'}`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-400">GEMINI QUOTA</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${state.isThrottled ? 'bg-rose-500 text-white' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {state.isThrottled ? 'THROTTLED' : 'HEALTHY'}
                        </span>
                      </div>
                      <div className="h-1 w-full bg-slate-800 rounded-full mt-2">
                        <div className={`h-full transition-all duration-1000 ${state.isThrottled ? 'w-full bg-rose-500' : 'w-1/4 bg-emerald-500 animate-pulse'}`}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deposit Accordion Mirroring User's Python Requirement */}
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <button 
                    onClick={() => setIsDepositOpen(!isDepositOpen)}
                    className="w-full flex items-center justify-between p-4 bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-money-bill-transfer text-emerald-400"></i>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Deposit Funds 💵</span>
                    </div>
                    <i className={`fa-solid fa-chevron-${isDepositOpen ? 'up' : 'down'} text-[10px] text-slate-500`}></i>
                  </button>
                  {isDepositOpen && (
                    <div className="p-4 bg-slate-950/50 border-t border-slate-800 space-y-4 animate-in slide-in-from-top-2 duration-200">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Amount ($)</label>
                        <div className="flex gap-2">
                          <input 
                            type="number"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm font-mono flex-1 text-white focus:outline-none focus:border-emerald-500/50"
                          />
                          <button 
                            onClick={handleDeposit}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-xs font-bold transition-all shadow-lg shadow-emerald-500/10"
                          >
                            DEPOSIT
                          </button>
                        </div>
                      </div>
                      <p className="text-[9px] text-slate-500 italic">Simulated deposit. Funds added to Testnet account balance instantly.</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-8 p-5 bg-slate-950/50 border border-slate-800 rounded-xl">
                 <div className="flex items-center justify-between mb-3">
                   <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                      <i className="fa-solid fa-wallet text-sm"></i>
                    </div>
                    <div className="text-xs font-bold uppercase tracking-wider">Account Balance</div>
                   </div>
                   <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">READY</span>
                 </div>
                 <div className="text-2xl font-mono font-bold text-white mb-2">${state.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                 <p className="text-[10px] text-slate-500 italic">Equity reflects unrealized PnL from active risk.</p>
              </div>
           </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
