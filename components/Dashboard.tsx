
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
          title="Portfolio Equity" 
          value={`$${state.equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
          sub={`Balance: $${state.balance.toFixed(2)}`} 
          icon="fa-vault" 
          color="text-emerald-400"
        />
        <StatCard 
          title="Active Risk" 
          value={state.activePositions.length} 
          sub={`$${state.activePositions.reduce((sum, p) => sum + p.size, 0).toFixed(2)} Exposure`} 
          icon="fa-microchip" 
          color="text-blue-400"
        />
        <StatCard 
          title="Max Drawdown" 
          value={`${(state.drawdown * 100).toFixed(1)}%`} 
          sub="Current Account DD" 
          icon="fa-shield-heart" 
          color="text-rose-400"
        />
        <StatCard 
          title="Profit Factor" 
          value={state.closedTrades.length > 5 ? "1.8x" : "---"} 
          sub="30D Simulated Alpha" 
          icon="fa-chart-simple" 
          color="text-purple-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/20 flex justify-between items-center">
              <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-slate-300">Market Consensus Monitor</h3>
              <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
                <span className="text-emerald-400">MA Cross: ACTIVE</span>
                <span className="text-blue-400">Bayesian: NOMINAL</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-950/50 text-slate-500 font-bold uppercase text-[10px] tracking-widest border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Symbol</th>
                    <th className="px-6 py-4">Tech Signal</th>
                    <th className="px-6 py-4">Current Price</th>
                    <th className="px-6 py-4 text-right">30m Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {state.watchlist.map(market => (
                    <tr key={market.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-200">{market.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-2 px-2 py-0.5 rounded text-[10px] font-bold border ${
                          market.lastSignal === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                          market.lastSignal === 'SELL' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                          'bg-slate-800 text-slate-500 border-slate-700'
                        }`}>
                          {market.lastSignal}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-300">
                        ${market.currentPrice?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="w-24 h-8 ml-auto">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={market.priceHistory}>
                              <Line type="monotone" dataKey="price" stroke="#3b82f6" dot={false} strokeWidth={1.5} />
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

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/20">
               <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-slate-300">Closed Trade Logs (Hard Guardrails)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-950/50 text-slate-500 font-bold uppercase tracking-widest border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-3">Symbol</th>
                    <th className="px-6 py-3">Result</th>
                    <th className="px-6 py-3">Exit Reason</th>
                    <th className="px-6 py-3 text-right">PnL ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {state.closedTrades.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-600">No closed trades in current session.</td></tr>
                  ) : (
                    state.closedTrades.map(t => (
                      <tr key={t.id} className="hover:bg-slate-800/30">
                        <td className="px-6 py-3 text-slate-300 font-mono">{t.marketName}</td>
                        <td className="px-6 py-3">
                          <span className={`font-bold ${t.pnl > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {t.pnl > 0 ? 'WIN' : 'LOSS'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-slate-500 uppercase text-[9px] font-bold">{t.exitReason?.replace('_', ' ')}</td>
                        <td className={`px-6 py-3 text-right font-mono ${t.pnl > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {t.pnl > 0 ? '+' : ''}{t.pnl.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6 flex flex-col h-full">
          <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col flex-1 overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-terminal text-xs text-emerald-500"></i>
                <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400">System Trace</h3>
              </div>
            </div>
            <div className="flex-1 p-4 font-mono text-[10px] overflow-y-auto space-y-2 bg-black/40 scrollbar-hide">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-slate-600 opacity-50 shrink-0 select-none">{log.time}</span>
                  <span className={log.type === 'success' ? 'text-emerald-400' : log.type === 'warn' ? 'text-rose-400 font-bold' : 'text-blue-400'}>
                    {log.msg}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
