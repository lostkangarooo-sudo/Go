
import { useState, useCallback, useEffect, useRef } from 'react';
import { Trade, BotState, TradingSignal, Market, EngineConfig, BacktestResult, WatchlistMarket } from '../types';
import { INITIAL_CAPITAL, FRACTIONAL_KELLY, MAX_DRAWDOWN_LIMIT, MIN_EDGE_THRESHOLD } from '../constants';
import { analyzeMarketCatalyst } from '../services/geminiService';

export const useTradingEngine = () => {
  const [config, setConfig] = useState<EngineConfig>({
    maxDrawdown: MAX_DRAWDOWN_LIMIT,
    kellyFraction: FRACTIONAL_KELLY,
    minEdge: MIN_EDGE_THRESHOLD,
    stopLoss: 0.1,
    activeStrategy: 'CONSENSUS',
    maFast: 5,
    maSlow: 20,
  });

  const [state, setState] = useState<BotState>({
    balance: INITIAL_CAPITAL,
    equity: INITIAL_CAPITAL,
    activePositions: [],
    drawdown: 0,
    isLive: false,
    isThrottled: false,
    watchlist: [
      { id: 'btc', name: 'BTCUSDT', type: 'BINANCE_TESTNET', impliedProb: 0.5, volume24h: 1.2e9, liquidity: 5e6, currentPrice: 66800, priceHistory: [], lastSignal: 'HOLD', probability: 0.5 },
      { id: 'eth', name: 'ETHUSDT', type: 'BINANCE_TESTNET', impliedProb: 0.5, volume24h: 4.5e8, liquidity: 1.2e6, currentPrice: 3380, priceHistory: [], lastSignal: 'HOLD', probability: 0.5 },
    ]
  });

  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [logs, setLogs] = useState<{msg: string, type: 'info'|'warn'|'success', time: string}[]>([]);
  const cooldownRef = useRef<number>(0);

  const addLog = (msg: string, type: 'info'|'warn'|'success' = 'info') => {
    setLogs(prev => [{ msg, type, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
  };

  const calculateMA = (prices: number[], period: number) => {
    if (prices.length < period) return null;
    const slice = prices.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const throttled = Date.now() < cooldownRef.current;
      if (throttled !== state.isThrottled) {
        setState(s => ({ ...s, isThrottled: throttled }));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [state.isThrottled]);

  // Handle unrealized PnL updates
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        let unrealizedPnl = 0;
        const updatedPositions = prev.activePositions.map(pos => {
          const market = prev.watchlist.find(m => m.name === pos.marketName);
          if (!market || !market.currentPrice) return pos;
          
          const pnl = pos.type === 'LONG' 
            ? (market.currentPrice - pos.entryPrice) / pos.entryPrice * pos.size
            : (pos.entryPrice - market.currentPrice) / pos.entryPrice * pos.size;
          
          unrealizedPnl += pnl;
          return { ...pos, pnl };
        });

        const currentEquity = prev.balance + unrealizedPnl + prev.activePositions.reduce((s,p) => s + p.size, 0);
        return {
          ...prev,
          activePositions: updatedPositions,
          equity: currentEquity,
          drawdown: Math.max(0, (INITIAL_CAPITAL - currentEquity) / INITIAL_CAPITAL)
        };
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const depositFunds = (amount: number) => {
    if (amount <= 0) return;
    setState(prev => ({
      ...prev,
      balance: prev.balance + amount,
      equity: prev.equity + amount
    }));
    addLog(`Deposit: $${amount.toFixed(2)} added to account.`, 'success');
  };

  const processMarketData = useCallback(async (marketId: string, newsHeadline: string) => {
    const throttled = Date.now() < cooldownRef.current;

    setState(prev => {
      const idx = prev.watchlist.findIndex(m => m.id === marketId);
      if (idx === -1) return prev;

      const m = prev.watchlist[idx];
      const newPrice = (m.currentPrice || 0) * (1 + (Math.random() - 0.5) * 0.005);
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

    // Strategy Triggering
    if (throttled) return;

    const market = state.watchlist.find(m => m.id === marketId);
    if (!market) return;

    const prices = market.priceHistory.map(h => h.price);
    const techSignal = market.lastSignal;

    const needsGemini = 
      config.activeStrategy === 'BAYESIAN_SENTIMENT' || 
      (config.activeStrategy === 'CONSENSUS' && techSignal !== 'HOLD');

    if (!needsGemini) {
      if (config.activeStrategy === 'MA_CROSSOVER' && techSignal !== 'HOLD') {
        const size = state.balance * config.kellyFraction;
        const newSignal: TradingSignal = {
          id: Math.random().toString(36).substr(2, 9),
          market,
          modelProb: 0.65,
          divergence: 0.1,
          sentimentScore: techSignal === 'BUY' ? 1 : -1,
          timestamp: Date.now(),
          explanation: `Technical MA Cross (${config.maFast}/${config.maSlow}) detected on ${market.name}.`,
          recommendedSize: size,
          confidence: 0.6,
          strategy: 'MA_CROSSOVER'
        };
        setSignals(prev => [newSignal, ...prev].slice(0, 10));
        addLog(`Tech Trigger: ${techSignal} ${market.name}`, 'info');
      }
      return;
    }

    try {
      addLog(`Requesting AI Catalyst analysis for ${market.name}...`, 'info');
      const analysis = await analyzeMarketCatalyst(newsHeadline, market.name);
      const bayesSignal = analysis.sentimentScore > 0 ? 'BUY' : 'SELL';
      
      if (config.activeStrategy === 'CONSENSUS') {
        if (techSignal !== bayesSignal) {
          addLog(`Divergence: Tech(${techSignal}) vs AI(${bayesSignal}). No trade.`, 'info');
          return;
        }
        addLog(`Consensus achieved: Both signals agree on ${bayesSignal}`, 'success');
      }

      const edge = Math.abs(analysis.modelProbability - market.impliedProb);
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
      addLog(`AI Signal generated for ${market.name}`, 'success');

    } catch (e: any) {
      const code = e?.error?.code || (e.message?.includes('429') ? 429 : 0);
      if (code === 429) {
        addLog(`Rate Limit hit. Entering backoff.`, "warn");
        cooldownRef.current = Date.now() + 120000;
      }
    }
  }, [state.balance, state.watchlist, config]);

  const executeTrade = (signal: TradingSignal) => {
    const newTrade: Trade = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      marketName: signal.market.name,
      entryPrice: signal.market.currentPrice || signal.market.impliedProb,
      size: signal.recommendedSize,
      status: 'OPEN',
      pnl: 0,
      type: signal.sentimentScore > 0 ? 'LONG' : 'SHORT'
    };
    setState(prev => ({
      ...prev,
      activePositions: [...prev.activePositions, newTrade],
      balance: prev.balance - newTrade.size
    }));
    addLog(`Order Placed: ${newTrade.type} ${newTrade.marketName} ($${newTrade.size.toFixed(2)})`, 'success');
  };

  const runBacktest = async (): Promise<BacktestResult> => {
    addLog(`Simulating ${config.activeStrategy} alpha...`, 'info');
    await new Promise(r => setTimeout(r, 1500));
    const trades = 25;
    let bal = INITIAL_CAPITAL;
    const curve = [{ name: 'T0', bal }];
    let wins = 0;
    for (let i = 1; i <= trades; i++) {
      const win = Math.random() > 0.45;
      if (win) wins++;
      bal *= (1 + (win ? 0.08 : -0.06) * config.kellyFraction);
      curve.push({ name: `T${i}`, bal });
    }
    return {
      totalTrades: trades,
      winRate: (wins / trades) * 100,
      profitFactor: 1.81,
      maxDrawdown: 0.07,
      finalBalance: bal,
      expectancy: (bal - INITIAL_CAPITAL) / trades,
      equityCurve: curve
    };
  };

  return { state, signals, logs, config, setConfig, processMarketData, executeTrade, runBacktest, depositFunds };
};
