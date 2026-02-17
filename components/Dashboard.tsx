
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BotState, Trade } from '../types';

interface DashboardProps {
  state: BotState;
  logs: {msg: string, type: string, time: string}[];
}

const StatCard = ({ title, value, sub, icon, trend }: any) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-emerald-500/30 transition-all">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-slate-800 rounded-lg text-emerald-400">
        <i className={`fa-solid ${icon}`}></i>
      </div>
      {trend && (
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${trend > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{title}</div>
    <div className="text-2xl font-bold mt-1 text-white">{value}</div>
    <div className="text-slate-500 text-xs mt-1">{sub}</div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ state, logs }) => {
  const data = [
    { name: '00:00', bal: 500 },
    { name: '04:00', bal: 512 },
    { name: '08:00', bal: 508 },
    { name: '12:00', bal: 535 },
    { name: '16:00', bal: 528 },
    { name: '20:00', bal: 560 },
    { name: 'Now', bal: state.equity },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Portfolio Equity" 
          value={`$${state.equity.toFixed(2)}`} 
          sub={`Cash: $${state.balance.toFixed(2)}`} 
          icon="fa-wallet" 
          trend={((state.equity - 500) / 500 * 100).toFixed(1)}
        />
        <StatCard 
          title="Active Risk" 
          value={`$${state.activePositions.reduce((sum, p) => sum + p.size, 0).toFixed(2)}`} 
          sub={`${state.activePositions.length} Open Positions`} 
          icon="fa-triangle-exclamation" 
        />
        <StatCard 
          title="Current Drawdown" 
          value={`${(state.drawdown * 100).toFixed(2)}%`} 
          sub="Peak: $585.00" 
          icon="fa-shield-heart" 
        />
        <StatCard 
          title="Engine Latency" 
          value="42ms" 
          sub="WebSocket Sync: OK" 
          icon="fa-bolt-lightning" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-6">Real-time Performance</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                  <Area type="monotone" dataKey="bal" stroke="#10b981" fill="url(#colorBal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold">Active Positions</h3>
              <span className="text-xs text-slate-500 font-mono">LIVE CLOB DATA</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800/50 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Market</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Size</th>
                    <th className="px-6 py-3">Entry</th>
                    <th className="px-6 py-3 text-right">PnL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {state.activePositions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-500 italic">No open risk detected. Bot is scanning...</td>
                    </tr>
                  ) : (
                    state.activePositions.map(pos => (
                      <tr key={pos.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 font-medium">{pos.marketName}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${pos.type === 'LONG' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {pos.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-300">${pos.size.toFixed(2)}</td>
                        <td className="px-6 py-4 font-mono text-slate-300">{pos.entryPrice.toFixed(2)}</td>
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
          <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <h3 className="font-bold text-sm uppercase tracking-widest">Live Terminal</h3>
          </div>
          <div className="flex-1 p-4 font-mono text-[11px] overflow-y-auto space-y-2 bg-slate-950/50">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-slate-600">[{log.time}]</span>
                <span className={
                  log.type === 'success' ? 'text-emerald-400' : 
                  log.type === 'warn' ? 'text-rose-400' : 'text-blue-400'
                }>
                  {log.msg}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
