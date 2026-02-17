
import React from 'react';
import { TradingSignal } from '../types';

interface SignalFeedProps {
  signals: TradingSignal[];
  onExecute: (signal: TradingSignal) => void;
}

const SignalFeed: React.FC<SignalFeedProps> = ({ signals, onExecute }) => {
  return (
    <div className="space-y-6">
      {signals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <i className="fa-solid fa-satellite fa-3x mb-4 animate-pulse"></i>
          <p>Listening for structural inefficiencies...</p>
          <p className="text-xs mt-2">Connecting to Binance Testnet & Gemini</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {signals.map(signal => (
            <div key={signal.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all group">
              <div className="p-5 flex flex-col md:flex-row gap-6">
                <div className="md:w-1/4 border-r border-slate-800 pr-6">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{signal.market.type}</div>
                  <h4 className="font-bold text-lg mb-2">{signal.market.name}</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 uppercase font-mono">
                      Entry: {signal.market.currentPrice ? signal.market.currentPrice.toFixed(2) : signal.market.impliedProb.toFixed(2)}
                    </span>
                    <span className="text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded text-emerald-400 uppercase font-mono">
                      {signal.strategy === 'MA_CROSSOVER' ? 'Technical' : `Prob: ${signal.modelProb.toFixed(2)}`}
                    </span>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 text-emerald-400">
                    <i className={`fa-solid ${signal.strategy === 'MA_CROSSOVER' ? 'fa-chart-simple' : 'fa-brain-circuit'} text-xs`}></i>
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {signal.strategy.replace('_', ' ')} Logic
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed mb-4">
                    {signal.explanation}
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Signal</div>
                      <div className={`text-sm font-mono ${signal.sentimentScore > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {signal.sentimentScore > 0 ? 'BUY / LONG' : 'SELL / SHORT'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Confidence</div>
                      <div className="text-sm font-mono">{(signal.confidence * 100).toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Volatility</div>
                      <div className="text-sm font-mono text-blue-400">Medium</div>
                    </div>
                  </div>
                </div>

                <div className="md:w-1/5 flex flex-col justify-center items-center bg-slate-800/30 rounded-lg p-4 border border-slate-800/50">
                   <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Kelly Size</div>
                   <div className="text-xl font-mono font-bold text-emerald-400 mb-4">${signal.recommendedSize.toFixed(2)}</div>
                   <button 
                    onClick={() => onExecute(signal)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 py-2 rounded font-bold text-xs transition-colors shadow-lg shadow-emerald-500/10"
                   >
                     EXECUTE ON TESTNET
                   </button>
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
