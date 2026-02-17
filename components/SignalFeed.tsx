
import React from 'react';
import { TradingSignal } from '../types';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface SignalFeedProps {
  signals: TradingSignal[];
  onExecute: (signal: TradingSignal) => void;
}

const SignalFeed: React.FC<SignalFeedProps> = ({ signals, onExecute }) => {
  return (
    <div className="space-y-6">
      {signals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-600 border border-dashed border-slate-800 rounded-2xl bg-slate-900/50">
          <i className="fa-solid fa-satellite fa-3x mb-6 animate-pulse opacity-20"></i>
          <p className="font-medium">No algorithmic triggers identified in current tick.</p>
          <p className="text-xs mt-2 opacity-60">Consensus Engine is monitoring Watchlist & Global News feeds...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {signals.map(signal => (
            <div key={signal.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-emerald-500/40 transition-all group animate-in slide-in-from-bottom-2">
              <div className="p-5 flex flex-col md:flex-row gap-8">
                <div className="md:w-1/4 border-r border-slate-800 pr-6">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{signal.market.name}</span>
                    <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">#{signal.id.slice(0,4)}</span>
                  </div>
                  <div className="text-2xl font-bold mb-4 font-mono">${signal.market.currentPrice?.toFixed(2)}</div>
                  
                  <div className="h-12 w-full mb-4">
                     {/* Simplified chart if data available */}
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={(signal.market as any).priceHistory || []}>
                           <Line type="monotone" dataKey="price" stroke="#10b981" dot={false} strokeWidth={2} isAnimationActive={false} />
                        </LineChart>
                     </ResponsiveContainer>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded text-emerald-400 uppercase font-mono border border-emerald-500/20">
                      {signal.strategy === 'CONSENSUS' ? 'Safe Consensus' : signal.strategy.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-1.5 h-1.5 rounded-full ${signal.sentimentScore > 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${signal.sentimentScore > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {signal.sentimentScore > 0 ? 'Positive Alpha Trigger' : 'Negative Alpha Trigger'}
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed mb-6 font-medium">
                      {signal.explanation}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-6 py-4 border-t border-slate-800">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Signal</div>
                      <div className={`text-sm font-bold font-mono ${signal.sentimentScore > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {signal.sentimentScore > 0 ? 'BUY/LONG' : 'SELL/SHORT'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Model Prob</div>
                      <div className="text-sm font-mono font-bold text-blue-400">{(signal.modelProb * 100).toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Confidence</div>
                      <div className="text-sm font-mono font-bold text-slate-200">{(signal.confidence * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                </div>

                <div className="md:w-1/5 flex flex-col justify-center items-center bg-slate-800/20 rounded-xl p-5 border border-slate-800/50 shadow-inner">
                   <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Recommended Size</div>
                   <div className="text-2xl font-mono font-bold text-white mb-6 tracking-tighter">${signal.recommendedSize.toFixed(2)}</div>
                   <button 
                    onClick={() => onExecute(signal)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-lg font-bold text-xs transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
                   >
                     EXECUTE TRADE
                   </button>
                   <p className="text-[9px] text-slate-500 mt-3 text-center">Fractional Kelly Sizing applied to base portfolio.</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SignalFeed;
