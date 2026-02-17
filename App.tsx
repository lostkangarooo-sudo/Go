
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
  
  const { 
    state, 
    signals, 
    logs, 
    config, 
    setConfig, 
    processMarketData, 
    executeTrade, 
    runBacktest 
  } = useTradingEngine();

  // Simulated Market Event Generator
  useEffect(() => {
    const events = [
      { 
        market: { id: 'poly-1', name: 'US Election: Harris Wins PA', type: 'POLYMARKET' as const, impliedProb: 0.52, volume24h: 1200000, liquidity: 50000 },
        headline: "New state-level polling indicates structural shift toward Democrats in key rust belt sectors."
      },
      {
        market: { id: 'alt-1', name: 'Solana Mobile 2 Orders', type: 'CRYPTO_ALT' as const, impliedProb: 0.65, volume24h: 450000, liquidity: 12000 },
        headline: "Pre-order numbers for Solana Mobile Chapter 2 exceed 100k, signaling massive ecosystem lock-in."
      },
      {
        market: { id: 'spread-1', name: 'CBETH/ETH Depeg Risk', type: 'SPREAD' as const, impliedProb: 0.05, volume24h: 5000000, liquidity: 1000000 },
        headline: "Major exchange unstaking queue drops to 0 days, reducing redemption liquidity pressure."
      }
    ];

    const interval = setInterval(() => {
      const event = events[Math.floor(Math.random() * events.length)];
      processMarketData(event.market, event.headline);
    }, 12000);

    return () => clearInterval(interval);
  }, [processMarketData]);

  const handleRunBacktest = async () => {
    setIsTesting(true);
    const result = await runBacktest();
    setBacktestResult(result);
    setIsTesting(false);
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
            <h3 className="text-xl font-bold mb-2">Backtest Engine v1.4</h3>
            <p className="text-slate-400 mb-6 max-w-md">
              Validate your Bayesian edge against historical volatility. Our engine calculates Kelly sizing slippage 
              and exchange fees per execution.
            </p>
            <button 
              onClick={handleRunBacktest}
              disabled={isTesting}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-lg shadow-emerald-500/20"
            >
              {isTesting ? 'SIMULATING...' : 'START MONTE CARLO SIM'}
            </button>
          </div>

          {backtestResult && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h4 className="font-bold mb-6">Equity Curve Simulation</h4>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={backtestResult.equityCurve}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" hide />
                      <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                      <Area type="stepAfter" dataKey="bal" stroke="#10b981" fill="#10b98122" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                <h4 className="font-bold border-b border-slate-800 pb-2">Results Overview</h4>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Win Rate</span>
                  <span className="font-mono text-emerald-400">{backtestResult.winRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Profit Factor</span>
                  <span className="font-mono">{backtestResult.profitFactor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Max DD</span>
                  <span className="font-mono text-rose-400">{(backtestResult.maxDrawdown * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between pt-4 border-t border-slate-800 font-bold">
                  <span>Net PnL</span>
                  <span className="text-emerald-400">+${(backtestResult.finalBalance - 500).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="font-bold mb-6 flex items-center gap-2">
                <i className="fa-solid fa-sliders text-emerald-400"></i>
                Risk Control Parameters
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Portfolio Drawdown Limit (Hard Stop)</label>
                  <input 
                    type="range" 
                    min="5" max="30" step="1"
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                    value={config.maxDrawdown * 100}
                    onChange={(e) => setConfig({...config, maxDrawdown: Number(e.target.value)/100})}
                  />
                  <div className="flex justify-between text-xs mt-2 text-slate-400">
                    <span>5%</span>
                    <span className="text-emerald-400 font-mono">Current: {(config.maxDrawdown * 100).toFixed(0)}%</span>
                    <span>30%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Fractional Kelly Multiplier</label>
                  <input 
                    type="range" 
                    min="5" max="50" step="5"
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                    value={config.kellyFraction * 100}
                    onChange={(e) => setConfig({...config, kellyFraction: Number(e.target.value)/100})}
                  />
                  <div className="flex justify-between text-xs mt-2 text-slate-400">
                    <span>Low Var (0.05)</span>
                    <span className="text-emerald-400 font-mono">Current: {config.kellyFraction.toFixed(2)}</span>
                    <span>Full Kelly (0.50)</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm">Auto-Stop Loss ({(config.stopLoss * 100).toFixed(0)}%)</span>
                    <div className="w-12 h-6 bg-emerald-500/20 rounded-full flex items-center px-1 border border-emerald-500/30">
                       <div className="w-4 h-4 bg-emerald-500 rounded-full ml-auto"></div>
                    </div>
                  </div>
                </div>
              </div>
           </div>

           <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="font-bold mb-6 flex items-center gap-2">
                <i className="fa-solid fa-plug text-blue-400"></i>
                API Connectivity
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs">PM</div>
                    <span className="font-semibold text-sm">Polymarket (CLOB)</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20">CONNECTED</span>
                </div>
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs">HL</div>
                    <span className="font-semibold text-sm">Hyperliquid DEX</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20">CONNECTED</span>
                </div>
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between opacity-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs">BB</div>
                    <span className="font-semibold text-sm">Bloomberg News Feed</span>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-1 rounded border border-slate-700">PAUSED</span>
                </div>
              </div>
           </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
