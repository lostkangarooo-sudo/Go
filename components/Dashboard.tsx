
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Net Equity" 
          value={`$${state.equity.toFixed(2)}`} 
          sub={`Balance: $${state.balance.toFixed(2)}`} 
          icon="fa-wallet" 
        />
        <StatCard 
          title="Positions" 
          value={state.activePositions.length} 
          sub={`$${state.activePositions.reduce((sum, p) => sum + p.size, 0).toFixed(2)} at risk`} 
          icon="fa-layer-group" 
          color="text-blue-400"
        />
        <StatCard 
          title="Market Health" 
          value={state.isThrottled ? 'Sleeping' : 'Ready'} 
          sub={state.isThrottled ? '429 Recovery Mode' : 'Low Latency'} 
          icon={state.isThrottled ? "fa-bolt-lightning" : "fa-satellite"} 
          color={state.isThrottled ? 'text-rose-400' : 'text-emerald-400'}
        />
        <StatCard 
          title="Current Drawdown" 
          value={`${(state.drawdown * 100).toFixed(1)}%`} 
          sub="Risk Limits: Nominal" 
          icon="fa-shield-halved" 
          color="text-purple-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-xs font-bold uppercase text-slate-500 tracking-widest mb-6">Equity Growth</h3>
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
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} labelStyle={{ display: 'none' }} />
                    <Area type="monotone" dataKey="bal" stroke="#10b981" fill="url(#colorBal)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-xs font-bold uppercase text-slate-500 tracking-widest mb-4">Market Watchlist</h3>
              <div className="space-y-4">
                {state.watchlist.map(market => (
                  <div key={market.id} className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg border border-slate-800">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{market.name}</span>
                      <span className="text-[10px] text-slate-500 uppercase">{market.type}</span>
                    </div>
                    <div className="w-24 h-10">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={market.priceHistory}>
                          <Line type="monotone" dataKey="price" stroke="#3b82f6" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono font-bold">${market.currentPrice?.toFixed(2)}</div>
                      <div className={`text-[10px] font-bold ${market.lastSignal === 'BUY' ? 'text-emerald-400' : market.lastSignal === 'SELL' ? 'text-rose-400' : 'text-slate-500'}`}>
                        {market.lastSignal}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/20">
              <h3 className="font-bold text-xs uppercase tracking-widest text-slate-300">Live Exposure</h3>
              <div className="flex gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                 <span className="text-[9px] font-bold text-emerald-400">ACTIVE</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800/50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Symbol</th>
                    <th className="px-6 py-4">Side</th>
                    <th className="px-6 py-4">Size</th>
                    <th className="px-6 py-4">Entry</th>
                    <th className="px-6 py-4 text-right">Net PnL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {state.activePositions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-600 italic text-xs">
                        Scanning watchlist for alpha opportunities...
                      </td>
                    </tr>
                  ) : (
                    state.activePositions.map(pos => (
                      <tr key={pos.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-200">{pos.marketName}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${pos.type === 'LONG' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                            {pos.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-400 text-xs">${pos.size.toFixed(2)}</td>
                        <td className="px-6 py-4 font-mono text-slate-400 text-xs">${pos.entryPrice.toFixed(2)}</td>
                        <td className={`px-6 py-4 text-right font-mono font-bold ${pos.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-full overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400">System Logs</h3>
            <i className="fa-solid fa-terminal text-xs text-slate-600"></i>
          </div>
          <div className="flex-1 p-4 font-mono text-[10px] overflow-y-auto space-y-2 bg-black/20">
            {logs.length === 0 ? (
              <div className="text-slate-700 italic">No system activity detected...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="flex gap-2 animate-in fade-in slide-in-from-left-2">
                  <span className="text-slate-600 opacity-50 shrink-0">{log.time}</span>
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
      </div>
    </div>
  );
};

export default Dashboard;
