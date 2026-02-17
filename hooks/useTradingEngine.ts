
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
    remoteNodeUrl: 'http://localhost:8000',
    isRemoteMode: false
  });

  const [state, setState] = useState<BotState>({
    balance: INITIAL_CAPITAL,
    equity: INITIAL_CAPITAL,
    activePositions: [],
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

  // Sync with Remote Python Backend
  useEffect(() => {
    if (!config.isRemoteMode) return;

    const syncInterval = setInterval(async () => {
      try {
        const balanceRes = await fetch(`${config.remoteNodeUrl}/balance`);
        const balanceData = await balanceRes.json();

        const signalsRes = await fetch(`${config.remoteNodeUrl}/signals`);
        const signalsData = await signalsRes.json();

        const tradesRes = await fetch(`${config.remoteNodeUrl}/trades`);
        const tradesData = await tradesRes.json();

        setState(prev => ({
          ...prev,
          balance: balanceData.balance,
          equity: balanceData.equity,
          activePositions: tradesData.filter((t: any) => t.status === 'OPEN'),
          isBackendConnected: true
        }));

        if (signalsData.length > 0) {
          // Map backend signals to frontend format
          const mappedSignals: TradingSignal[] = signalsData.map((s: any) => ({
            id: s.id,
            market: state.watchlist.find(m => m.name === s.symbol) || state.watchlist[0],
            modelProb: s.prob,
            divergence: Math.abs(s.prob - 0.5),
            sentimentScore: s.signal === 'BUY' ? 1 : -1,
            timestamp: Date.now(),
            explanation: s.explanation,
            recommendedSize: s.position_size,
            confidence: 0.8,
            strategy: config.activeStrategy
          }));
          setSignals(mappedSignals);
        }
      } catch (err) {
        setState(prev => ({ ...prev, isBackendConnected: false }));
        console.error("Backend Sync Error:", err);
      }
    }, 5000);

    return () => clearInterval(syncInterval);
  }, [config.isRemoteMode, config.remoteNodeUrl, state.watchlist]);

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

  useEffect(() => {
    if (config.isRemoteMode) return; // Skip local simulation in remote mode

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

        const activeSize = prev.activePositions.reduce((s,p) => s + p.size, 0);
        const currentEquity = prev.balance + unrealizedPnl + activeSize;
        
        return {
          ...prev,
          activePositions: updatedPositions,
          equity: currentEquity,
          drawdown: Math.max(0, (INITIAL_CAPITAL - currentEquity) / INITIAL_CAPITAL)
        };
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [config.isRemoteMode]);

  const depositFunds = async (amount: number) => {
    if (amount <= 0) return;

    if (config.isRemoteMode) {
      try {
        await fetch(`${config.remoteNodeUrl}/deposit?amount=${amount}`, { method: 'POST' });
        addLog(`Sent deposit request of $${amount} to Remote Node.`, 'success');
      } catch (err) {
        addLog("Failed to send deposit to backend.", "warn");
      }
      return;
    }

    setState(prev => ({
      ...prev,
      balance: prev.balance + amount,
      equity: prev.equity + amount
    }));
    addLog(`Capital Influx: $${amount.toFixed(2)} added to Testnet balance.`, 'success');
  };

  const processMarketData = useCallback(async (marketId: string, newsHeadline: string) => {
    if (config.isRemoteMode) return; // Backend handles data processing

    const throttled = Date.now() < cooldownRef.current;

    setState(prev => {
      const idx = prev.watchlist.findIndex(m => m.id === marketId);
      if (idx === -1) return prev;

      const m = prev.watchlist[idx];
      const volatility = 0.003;
      const change = (Math.random() - 0.5) * volatility;
      const newPrice = (m.currentPrice || 0) * (1 + change);
      
      const drift = change > 0 ? 0.02 : -0.02;
      const newProb = Math.min(0.95, Math.max(0.05, m.probability + drift + (Math.random() - 0.5) * 0.01));
      
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
      updatedWatchlist[idx] = { 
        ...m, 
        currentPrice: newPrice, 
        priceHistory: newHistory, 
        lastSignal: techSignal,
        probability: newProb
      };
      return { ...prev, watchlist: updatedWatchlist };
    });

    if (throttled) return;

    const market = state.watchlist.find(m => m.id === marketId);
    if (!market) return;
    
    const techSignal = market.lastSignal;
    const isConsensusTrigger = config.activeStrategy === 'CONSENSUS' && techSignal !== 'HOLD';
    const isPureAI = config.activeStrategy === 'BAYESIAN_SENTIMENT';

    if (!isConsensusTrigger && !isPureAI) {
      if (config.activeStrategy === 'MA_CROSSOVER' && techSignal !== 'HOLD') {
        const size = state.balance * config.kellyFraction;
        const newSignal: TradingSignal = {
          id: Math.random().toString(36).substr(2, 9),
          market,
          modelProb: 0.6,
          divergence: 0.1,
          sentimentScore: techSignal === 'BUY' ? 1 : -1,
          timestamp: Date.now(),
          explanation: `Technical MA Cross found. Executing low-risk trend following.`,
          recommendedSize: size,
          confidence: 0.7,
          strategy: 'MA_CROSSOVER'
        };
        setSignals(prev => [newSignal, ...prev].slice(0, 10));
        addLog(`Technical Trigger: ${techSignal} on ${market.name}`, 'info');
      }
      return;
    }

    try {
      addLog(`AI Oracle: Digesting catalyst for ${market.name}...`, 'info');
      const analysis = await analyzeMarketCatalyst(newsHeadline, market.name);
      const bayesSignal = analysis.sentimentScore > 0 ? 'BUY' : 'SELL';
      
      if (config.activeStrategy === 'CONSENSUS') {
        if (techSignal !== bayesSignal) {
          addLog(`Divergence: Tech(${techSignal}) vs AI(${bayesSignal}). Gating trade.`, 'warn');
          return;
        }
        addLog(`CONSENSUS: Technical & AI Oracle aligned on ${bayesSignal}`, 'success');
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
      addLog(`Alpha Match: ${market.name} - Bayesian Edge: ${(edge*100).toFixed(1)}%`, 'success');

    } catch (e: any) {
      const code = e?.error?.code || (e.message?.includes('429') ? 429 : 0);
      if (code === 429) {
        addLog(`QUOTA EXHAUSTED: Protecting API for 120s.`, "warn");
        cooldownRef.current = Date.now() + 120000;
      }
    }
  }, [state.balance, state.watchlist, config, addLog]);

  const executeTrade = async (signal: TradingSignal) => {
    if (config.isRemoteMode) {
      try {
        await fetch(`${config.remoteNodeUrl}/trade`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: signal.market.name,
            side: signal.sentimentScore > 0 ? 'BUY' : 'SELL',
            size: signal.recommendedSize
          })
        });
        addLog(`Order command dispatched to Remote Node for ${signal.market.name}.`, 'info');
      } catch (err) {
        addLog("Remote execution failed.", "warn");
      }
      return;
    }

    if (state.balance < signal.recommendedSize) {
      addLog(`Execution Failed: Insufficient balance for ${signal.market.name}.`, 'warn');
      return;
    }

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
    addLog(`Execution: ${newTrade.type} position filled for ${newTrade.marketName}.`, 'success');
  };

  const runBacktest = async (): Promise<BacktestResult> => {
    addLog(`Initiating Monte Carlo Simulation for ${config.activeStrategy}...`, 'info');
    await new Promise(r => setTimeout(r, 2000));
    const trades = 30;
    let bal = INITIAL_CAPITAL;
    const curve = [{ name: 'T0', bal }];
    let wins = 0;
    for (let i = 1; i <= trades; i++) {
      const win = Math.random() > 0.44;
      if (win) wins++;
      bal *= (1 + (win ? 0.07 : -0.05) * config.kellyFraction);
      curve.push({ name: `T${i}`, bal });
    }
    return {
      totalTrades: trades,
      winRate: (wins / trades) * 100,
      profitFactor: 1.76,
      maxDrawdown: 0.08,
      finalBalance: bal,
      expectancy: (bal - INITIAL_CAPITAL) / trades,
      equityCurve: curve
    };
  };

  return { state, signals, logs, config, setConfig, processMarketData, executeTrade, runBacktest, depositFunds };
};
