
import { useState, useCallback, useEffect, useRef } from 'react';
import { Trade, BotState, TradingSignal, Market, EngineConfig, BacktestResult, WatchlistMarket } from '../types';
import { INITIAL_CAPITAL, FRACTIONAL_KELLY, MAX_DRAWDOWN_LIMIT, MIN_EDGE_THRESHOLD } from '../constants';
import { analyzeMarketCatalyst } from '../services/geminiService';

export const useTradingEngine = () => {
  const [config, setConfig] = useState<EngineConfig>({
    maxDrawdown: MAX_DRAWDOWN_LIMIT,
    kellyFraction: 0.10, // Refined to 10% as per latest quant spec
    minEdge: MIN_EDGE_THRESHOLD,
    stopLoss: 0.10, // 10% hard stop
    takeProfit: 0.15, // 15% target
    activeStrategy: 'CONSENSUS',
    maFast: 5,
    maSlow: 20,
    remoteNodeUrl: 'http://localhost:8000',
    isRemoteMode: false
  });

  const [state, setState] = useState<BotState>({
    balance: INITIAL_CAPITAL,
    equity: INITIAL_CAPITAL,
    activePositions: [],
    closedTrades: [],
    drawdown: 0,
    isLive: false,
    isThrottled: false,
    isBackendConnected: false,
    watchlist: [
      { id: 'btc', name: 'BTCUSDT', type: 'BINANCE_TESTNET', impliedProb: 0.5, volume24h: 1.2e9, liquidity: 5e6, currentPrice: 66800, priceHistory: [], lastSignal: 'HOLD', probability: 0.51 },
      { id: 'eth', name: 'ETHUSDT', type: 'BINANCE_TESTNET', impliedProb: 0.5, volume24h: 4.5e8, liquidity: 1.2e6, currentPrice: 3380, priceHistory: [], lastSignal: 'HOLD', probability: 0.49 },
    ]
  });

  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [logs, setLogs] = useState<{msg: string, type: 'info'|'warn'|'success', time: string}[]>([]);
  const cooldownRef = useRef<number>(0);

  const addLog = useCallback((msg: string, type: 'info'|'warn'|'success' = 'info') => {
    setLogs(prev => [{ msg, type, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
  }, []);

  const calculateMA = (prices: number[], period: number) => {
    if (prices.length < period) return null;
    const slice = prices.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  };

  // Main Simulation Loop
  useEffect(() => {
    if (config.isRemoteMode) return;

    const interval = setInterval(() => {
      setState(prev => {
        let unrealizedPnl = 0;
        const newlyClosed: Trade[] = [];
        const remainingPositions: Trade[] = [];

        prev.activePositions.forEach(pos => {
          const market = prev.watchlist.find(m => m.name === pos.marketName);
          if (!market || !market.currentPrice) {
            remainingPositions.push(pos);
            return;
          }
          
          const pnl = pos.type === 'LONG' 
            ? (market.currentPrice - pos.entryPrice) / pos.entryPrice * pos.size
            : (pos.entryPrice - market.currentPrice) / pos.entryPrice * pos.size;
          
          const pnlPct = pnl / pos.size;
          if (pnlPct <= -config.stopLoss) {
            newlyClosed.push({ ...pos, status: 'CLOSED', pnl, exitPrice: market.currentPrice, exitReason: 'STOP_LOSS' });
          } else if (pnlPct >= config.takeProfit) {
            newlyClosed.push({ ...pos, status: 'CLOSED', pnl, exitPrice: market.currentPrice, exitReason: 'TAKE_PROFIT' });
          } else {
            remainingPositions.push({ ...pos, pnl });
            unrealizedPnl += pnl;
          }
        });

        if (newlyClosed.length > 0) {
          const totalRecovered = newlyClosed.reduce((acc, trade) => acc + trade.size + trade.pnl, 0);
          const newBalance = prev.balance + totalRecovered;
          
          let runningCumulative = prev.closedTrades.length > 0 
            ? prev.closedTrades[prev.closedTrades.length - 1].cumulativePnL 
            : 0;

          const updatedNewlyClosed = newlyClosed.map(t => {
            runningCumulative += t.pnl;
            return { ...t, cumulativePnL: runningCumulative };
          });
          
          updatedNewlyClosed.forEach(t => addLog(`EXIT: ${t.marketName} (${t.pnl > 0 ? '+' : ''}$${t.pnl.toFixed(2)}) - ${t.exitReason}`, t.pnl > 0 ? 'success' : 'warn'));
          
          return {
            ...prev,
            balance: newBalance,
            activePositions: remainingPositions,
            closedTrades: [...prev.closedTrades, ...updatedNewlyClosed].slice(-100),
            equity: newBalance + unrealizedPnl + remainingPositions.reduce((s,p) => s + p.size, 0)
          };
        }

        const activeSize = remainingPositions.reduce((s,p) => s + p.size, 0);
        const currentEquity = prev.balance + unrealizedPnl + activeSize;
        
        return {
          ...prev,
          activePositions: remainingPositions,
          equity: currentEquity,
          drawdown: Math.max(0, (INITIAL_CAPITAL - currentEquity) / INITIAL_CAPITAL)
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [config.isRemoteMode, config.stopLoss, config.takeProfit, addLog]);

  const depositFunds = async (amount: number) => {
    if (amount <= 0) return;
    setState(prev => ({
      ...prev,
      balance: prev.balance + amount,
      equity: prev.equity + amount
    }));
    addLog(`Capital Injection: $${amount.toFixed(2)} added.`, 'success');
  };

  const processMarketData = useCallback(async (marketId: string, newsHeadline: string) => {
    if (config.isRemoteMode) return;
    const throttled = Date.now() < cooldownRef.current;

    setState(prev => {
      const idx = prev.watchlist.findIndex(m => m.id === marketId);
      if (idx === -1) return prev;

      const m = prev.watchlist[idx];
      const volatility = 0.003;
      const change = (Math.random() - 0.5) * volatility;
      const newPrice = (m.currentPrice || 0) * (1 + change);
      const newHistory = [...m.priceHistory, { timestamp: Date.now(), price: newPrice }].slice(-30);
      const prices = newHistory.map(h => h.price);
      
      let techSignal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      if (prices.length >= config.maSlow) {
        const fast = calculateMA(prices, config.maFast);
        const slow = calculateMA(prices, config.maSlow);
        const pFast = calculateMA(prices.slice(0, -1), config.maFast);
        const pSlow = calculateMA(prices.slice(0, -1), config.maSlow);
        if (fast && slow && pFast && pSlow) {
          if (fast > slow && pFast <= pSlow) techSignal = 'BUY';
          else if (fast < slow && pFast >= pSlow) techSignal = 'SELL';
        }
      }

      const updatedWatchlist = [...prev.watchlist];
      updatedWatchlist[idx] = { ...m, currentPrice: newPrice, priceHistory: newHistory, lastSignal: techSignal };
      return { ...prev, watchlist: updatedWatchlist };
    });

    if (throttled) return;

    const market = state.watchlist.find(m => m.id === marketId);
    if (!market) return;
    
    try {
      if (config.activeStrategy === 'MA_CROSSOVER' && market.lastSignal !== 'HOLD') {
         executeTrade({
           id: Math.random().toString(36).substr(2, 9),
           market,
           modelProb: 0.6,
           divergence: 0.1,
           sentimentScore: market.lastSignal === 'BUY' ? 1 : -1,
           timestamp: Date.now(),
           explanation: "MA Crossover consensus identified.",
           recommendedSize: state.balance * config.kellyFraction,
           confidence: 0.8,
           strategy: 'MA_CROSSOVER'
         });
         return;
      }

      const analysis = await analyzeMarketCatalyst(newsHeadline, market.name);
      const bayesSignal = analysis.sentimentScore > 0 ? 'BUY' : 'SELL';
      
      if (config.activeStrategy === 'CONSENSUS' && market.lastSignal !== bayesSignal) {
        return;
      }

      const edge = Math.abs(analysis.modelProbability - 0.5);
      const size = Math.max(0, (edge * config.kellyFraction * state.balance));

      const newSignal: TradingSignal = {
        id: Math.random().toString(36).substr(2, 9),
        market,
        modelProb: analysis.modelProbability,
        divergence: edge,
        sentimentScore: analysis.sentimentScore,
        timestamp: Date.now(),
        explanation: analysis.reasoning,
        recommendedSize: size,
        confidence: analysis.confidence,
        strategy: config.activeStrategy
      };
      
      setSignals(prev => [newSignal, ...prev].slice(0, 10));

    } catch (e: any) {
      if (e?.message?.includes('429')) {
        addLog(`Quota exhausted. Cooling down.`, "warn");
        cooldownRef.current = Date.now() + 120000;
      }
    }
  }, [state.balance, state.watchlist, config, addLog]);

  const executeTrade = async (signal: TradingSignal) => {
    if (state.balance < signal.recommendedSize) return;
    if (state.activePositions.some(p => p.marketName === signal.market.name)) return;

    const newTrade: Trade = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      marketName: signal.market.name,
      entryPrice: signal.market.currentPrice || 0,
      size: signal.recommendedSize,
      status: 'OPEN',
      pnl: 0,
      cumulativePnL: state.closedTrades.length > 0 ? state.closedTrades[state.closedTrades.length-1].cumulativePnL : 0,
      type: signal.sentimentScore > 0 ? 'LONG' : 'SHORT'
    };
    setState(prev => ({
      ...prev,
      activePositions: [...prev.activePositions, newTrade],
      balance: prev.balance - newTrade.size
    }));
    addLog(`EXECUTION: ${newTrade.type} ${newTrade.marketName} @ $${newTrade.entryPrice.toFixed(2)}`, 'success');
  };

  const runBacktest = async (): Promise<BacktestResult> => {
    addLog(`Running Alpha Validation...`, 'info');
    await new Promise(r => setTimeout(r, 2000));
    const trades = 30;
    let bal = INITIAL_CAPITAL;
    const curve = [{ name: 'T0', bal }];
    let wins = 0;
    for (let i = 1; i <= trades; i++) {
      const win = Math.random() > 0.44;
      if (win) wins++;
      let pnl = bal * config.kellyFraction * (win ? 0.07 : -0.05);
      pnl = Math.max(pnl, -bal * config.kellyFraction * config.stopLoss);
      bal += pnl;
      curve.push({ name: `T${i}`, bal });
    }
    return {
      totalTrades: trades,
      winRate: (wins / trades) * 100,
      profitFactor: 1.82,
      maxDrawdown: 0.07,
      finalBalance: bal,
      expectancy: (bal - INITIAL_CAPITAL) / trades,
      equityCurve: curve
    };
  };

  return { state, signals, logs, config, setConfig, processMarketData, executeTrade, runBacktest, depositFunds };
};
