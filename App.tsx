
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

  useEffect(() => {
    const events = [
      { 
        market: { id: 'bin-1', name: 'BTCUSDT Spot', type: 'BINANCE_TESTNET' as const, impliedProb: 0.5, currentPrice: 66400, volume24h: 1200000000, liquidity: 5000000 },
        headline: "Bitcoin testing key resistance levels amidst ETF inflow surge."
      },
      {
        market: { id: 'alt-1', name: 'ETHUSDT Perpetual', type: 'BINANCE_TESTNET' as const, impliedProb: 0.5, currentPrice: 3420, volume24h: 450000000, liquidity: 1200000 },
        headline: "Ethereum gas fees drop to 6-month lows as L2 adoption accelerates."
      },
      {
        market: { id: 'poly-1', name: 'US Election: Harris PA', type: 'POLYMARKET' as const, impliedProb: 0.51, volume24h: 1200000, liquidity: 50000 },
        headline: "New state-level data suggests demographic shifts in key PA counties."
      }
    ];

    const interval = setInterval(() => {
      const event = events[Math.floor(Math.random() * events.length)];
      if (event.market.currentPrice) {
        event.market.currentPrice *= (1 + (Math.random() - 0.5) * 0.003);
      }
      processMarketData(event.market, event.headline);
    }, 7000);

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
            <h3 className="text-xl font-bold mb-2">Quant Backtester v1.6</h3>
            <p className="text-slate-400 mb-6 max-w-md">
              Testing active alpha: <span className="text-emerald-400 font-mono font-bold">{config.activeStrategy}</span>. 
              Running Monte Carlo simulation using fractional Kelly sizing and exchange fee modeling.
            </p>
            <button 
              onClick={handleRunBacktest}
              disabled={isTesting}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-lg shadow-emerald-500/20"
            >
              {isTesting ? 'SIMULATING ALPHA...' : 'RUN MONTE CARLO SIM'}
            </button>
          </div>

          {backtestResult && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h4 className="font-bold mb-6">Simulated Equity Path</h4>
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
                <h4 className="font-bold border-b border-slate-800 pb-2">Backtest Performance</h4>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Win Rate</span>
                  <span className="font-mono text-emerald-400">{backtestResult.winRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Expectancy</span>
                  <span className="font-mono">${backtestResult.expectancy.toFixed(2)} / trade</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Max Drawdown</span>
                  <span className="font-mono text-rose-400">{(backtestResult.maxDrawdown * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between pt-4 border-t border-slate-800 font-bold">
                  <span>Sim Net Growth</span>
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
                  Strategy Selection
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setConfig({...config, activeStrategy: 'BAYESIAN_SENTIMENT'})}
                    className={`p-4 rounded-xl border text-left transition-all ${config.activeStrategy === 'BAYESIAN_SENTIMENT' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                  >
                    <div className="text-xs font-bold uppercase mb-1">Bayesian</div>
                    <div className="text-[10px] leading-tight opacity-70">Sentiment Catalyst Analysis via Gemini</div>
                  </button>
                  <button 
                    onClick={() => setConfig({...config, activeStrategy: 'MA_CROSSOVER'})}
                    className={`p-4 rounded-xl border text-left transition-all ${config.activeStrategy === 'MA_CROSSOVER' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                  >
                    <div className="text-xs font-bold uppercase mb-1">MA Crossover</div>
                    <div className="text-[10px] leading-tight opacity-70">Technical Trend Following (5/20 MA)</div>
                  </button>
                </div>
             </div>

             <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="font-bold mb-6 flex items-center gap-2">
                  <i className="fa-solid fa-sliders text-emerald-400"></i>
                  Risk Parameters
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Max Drawdown Ceiling</label>
                    <input 
                      type="range" min="5" max="30" step="1"
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                      value={config.maxDrawdown * 100}
                      onChange={(e) => setConfig({...config, maxDrawdown: Number(e.target.value)/100})}
                    />
                    <div className="flex justify-between text-xs mt-2 text-slate-400">
                      <span>5%</span>
                      <span className="text-emerald-400 font-mono">{(config.maxDrawdown * 100).toFixed(0)}%</span>
                      <span>30%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Fractional Kelly Multiplier</label>
                    <input 
                      type="range" min="5" max="50" step="5"
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                      value={config.kellyFraction * 100}
                      onChange={(e) => setConfig({...config, kellyFraction: Number(e.target.value)/100})}
                    />
                    <div className="flex justify-between text-xs mt-2 text-slate-400">
                      <span>Low Var (0.05)</span>
                      <span className="text-emerald-400 font-mono">{config.kellyFraction.toFixed(2)}</span>
                      <span>High Var (0.50)</span>
                    </div>
                  </div>
                </div>
             </div>
           </div>

           <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="font-bold mb-6 flex items-center gap-2">
                <i className="fa-solid fa-plug text-blue-400"></i>
                Exchange Integrations
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-[10px] text-black font-bold">B</div>
                    <span className="font-semibold text-sm">Binance Testnet</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20">OPERATIONAL</span>
                </div>
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold">PM</div>
                    <span className="font-semibold text-sm">Polymarket</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20">CONNECTED</span>
                </div>
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between opacity-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold">BB</div>
                    <span className="font-semibold text-sm">Bloomberg Term Feed</span>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-1 rounded border border-slate-700">INACTIVE</span>
                </div>
              </div>

              <div className="mt-8 p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                <div className="text-xs font-bold text-emerald-400 uppercase mb-2">Alpha Note</div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Engine is optimized for Micro-Alpha extraction. Bayesian Sentiment uses Gemini Flash-3 for real-time news digestion. 
                  Kelly sizing is capped at 0.50 to prevent tail risk in high-volatility environments.
                </p>
              </div>
           </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
