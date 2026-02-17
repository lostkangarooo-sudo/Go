
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { BotState, WatchlistMarket } from '../types';

interface DashboardProps {
  state: BotState;
  logs: {msg: string, type: string, time: string}[];
}

const StatCard = ({ title, value, sub, icon, color, active }: any) => (
  <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 transition-all ${active ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/5' : ''}`}>
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2 bg-slate-800 rounded-lg ${color || 'text-emerald-400'}`}>
        <i className={`fa-solid ${icon}`}></i>
      </div>
    </div>
    <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{title}</div>
    <div className="text-2xl font-bold mt-1 text-white">{value}</div>
    <div className="text-slate-500 text-xs mt-1">{sub}</div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ state, logs }) => {
  const equityData = [
    { name: 'T-60', bal: 500 },
    { name: 'T-45', bal: 512 },
    { name: 'T-30', bal: 508 },
    { name: 'T-15', bal: 535 },
    { name: 'Now', bal: state.equity },
  ];

  return (
    <div className="space-y-6">
      {/* Top Level Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Portfolio Value" 
          value={`$${state.equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
          sub={`Available: $${state.balance.toFixed(2)}`} 
          icon="fa-vault" 
          color="text-emerald-400"
        />
        <StatCard 
          title="Consensus Exposure" 
          value={state.activePositions.length} 
          sub={`$${state.activePositions.reduce((sum, p) => sum + p.size, 0).toFixed(2)} Active Risk`} 
          icon="fa-microchip" 
          color="text-blue-400"
        />
        <StatCard 
          title="Quota Health" 
          value={state.isThrottled ? 'Cooling' : 'Optimal'} 
          sub={state.isThrottled ? '429 Rate Limit Active' : 'Low-latency API access'} 
          icon={state.isThrottled ? "fa-snowflake" : "fa-bolt"} 
          color={state.isThrottled ? 'text-rose-400' : 'text-yellow-400'}
          active={state.isThrottled}
        />
        <StatCard 
          title="Alpha Edge" 
          value="+4.2%" 
          sub="30D Expected Win-rate" 
          icon="fa-chart-simple" 
          color="text-purple-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Monitor Table - Mirrors Python DF output */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/20 flex justify-between items-center">
              <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-slate-300">Alpha Monitor (Consensus Engine)</h3>
              <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Tech: MA(5/20)
                </span>
                <span className="flex items-center gap-1.5 text-blue-400">
                   <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                   AI: Bayesian
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-950/50 text-slate-500 font-bold uppercase text-[10px] tracking-widest border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Symbol</th>
                    <th className="px-6 py-4">Consensus Signal</th>
                    <th className="px-6 py-4">Bayes Prob</th>
                    <th className="px-6 py-4">Last Close</th>
                    <th className="px-6 py-4 text-right">Trend (30m)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {state.watchlist.map(market => (
                    <tr key={market.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-200">{market.name}</span>
                          <span className="text-[9px] text-slate-500 font-mono">BINANCE_TESTNET</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                          market.lastSignal === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                          market.lastSignal === 'SELL' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                          'bg-slate-800 text-slate-500 border-slate-700'
                        }`}>
                          <i className={`fa-solid ${market.lastSignal === 'BUY' ? 'fa-arrow-trend-up' : market.lastSignal === 'SELL' ? 'fa-arrow-trend-down' : 'fa-minus'}`}></i>
                          {market.lastSignal}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-blue-400">
                        {((market.probability || 0.5) * 100).toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-300">
                        ${market.currentPrice?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="w-24 h-8 ml-auto">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={market.priceHistory}>
                              <Line 
                                type="monotone" 
                                dataKey="price" 
                                stroke={market.lastSignal === 'BUY' ? '#10b981' : market.lastSignal === 'SELL' ? '#f43f5e' : '#3b82f6'} 
                                dot={false} 
                                strokeWidth={1.5} 
                                isAnimationActive={false} 
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Equity Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-widest mb-6 flex items-center gap-2">
              <i className="fa-solid fa-chart-area text-emerald-400"></i>
              Real-time Equity Curve
            </h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityData}>
                  <defs>
                    <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" hide />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} labelStyle={{ display: 'none' }} />
                  <Area type="monotone" dataKey="bal" stroke="#10b981" fill="url(#colorBal)" strokeWidth={3} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Terminal & Quick Deposit */}
        <div className="space-y-6 flex flex-col h-full">
          {/* Terminal Component */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col flex-1 overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-terminal text-xs text-emerald-500"></i>
                <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400">Live Strategy Log</h3>
              </div>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono border border-emerald-500/20">v2.1</span>
            </div>
            <div className="flex-1 p-4 font-mono text-[10px] overflow-y-auto space-y-2 bg-black/40 scrollbar-hide">
              {logs.length === 0 ? (
                <div className="text-slate-700 italic flex items-center gap-2">
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  Listening for market anomalies...
                </div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                    <span className="text-slate-600 opacity-50 shrink-0 select-none">{log.time}</span>
                    <span className={
                      log.type === 'success' ? 'text-emerald-400' : 
                      log.type === 'warn' ? 'text-rose-400 font-bold' : 'text-blue-400'
                    }>
                      {log.msg}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Balance Summary */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-opacity group-hover:opacity-10">
              <i className="fa-solid fa-wallet text-6xl text-emerald-400"></i>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                <i className="fa-solid fa-dollar-sign text-sm"></i>
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Trading Balance</div>
            </div>
            <div className="text-3xl font-mono font-bold text-white mb-4 tabular-nums">
              ${state.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex gap-2">
               <div className="flex-1 text-[9px] text-slate-500 uppercase font-bold tracking-widest border-t border-slate-800 pt-3">
                 Liquidity: High
               </div>
               <div className="flex-1 text-[9px] text-emerald-500 text-right uppercase font-bold tracking-widest border-t border-slate-800 pt-3">
                 Synced
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
