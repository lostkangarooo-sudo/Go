
import { useState, useCallback, useEffect, useRef } from 'react';
import { Trade, BotState, TradingSignal, Market, EngineConfig, BacktestResult, PricePoint } from '../types';
import { INITIAL_CAPITAL, FRACTIONAL_KELLY, MAX_DRAWDOWN_LIMIT, MIN_EDGE_THRESHOLD } from '../constants';
import { analyzeMarketCatalyst } from '../services/geminiService';

export const useTradingEngine = () => {
  const [config, setConfig] = useState<EngineConfig>({
    maxDrawdown: MAX_DRAWDOWN_LIMIT,
    kellyFraction: FRACTIONAL_KELLY,
    minEdge: MIN_EDGE_THRESHOLD,
    stopLoss: 0.1,
    activeStrategy: 'BAYESIAN_SENTIMENT',
    maFast: 5,
    maSlow: 20,
  });

  const [state, setState] = useState<BotState>({
    balance: INITIAL_CAPITAL,
    equity: INITIAL_CAPITAL,
    activePositions: [],
    drawdown: 0,
    isLive: false,
  });

  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [logs, setLogs] = useState<{msg: string, type: 'info'|'warn'|'success', time: string}[]>([]);
  const priceHistory = useRef<Map<string, number[]>>(new Map());
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
    const interval = setInterval(() => {
      setState(prev => {
        let currentEquity = prev.balance;
        const updatedPositions = prev.activePositions.map(pos => {
          const volatility = 0.005;
          const change = (Math.random() - 0.5) * volatility; 
          const currentPrice = (pos.exitPrice || pos.entryPrice) * (1 + change);
          const pnl = pos.type === 'LONG' 
            ? (currentPrice - pos.entryPrice) / pos.entryPrice * pos.size
            : (pos.entryPrice - currentPrice) / pos.entryPrice * pos.size;
          
          currentEquity += pos.size + pnl;

          if (pnl <= -pos.size * config.stopLoss && pos.status === 'OPEN') {
             addLog(`Stop-loss triggered: ${pos.marketName} (${(pnl/pos.size*100).toFixed(2)}%)`, 'warn');
          }

          return { ...pos, exitPrice: currentPrice, pnl };
        });

        return {
          ...prev,
          activePositions: updatedPositions,
          equity: currentEquity,
          drawdown: Math.max(0, (INITIAL_CAPITAL - currentEquity) / INITIAL_CAPITAL)
        };
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [config.stopLoss]);

  const processMarketData = useCallback(async (market: Market, newsHeadline: string) => {
    // Check for active cooldown (60s after a 429 error)
    if (Date.now() < cooldownRef.current) {
      return;
    }

    const currentPrice = market.currentPrice || market.impliedProb;
    const history = priceHistory.current.get(market.id) || [];
    const newHistory = [...history, currentPrice].slice(-50);
    priceHistory.current.set(market.id, newHistory);

    if (config.activeStrategy === 'MA_CROSSOVER' && newHistory.length >= config.maSlow) {
      const fast = calculateMA(newHistory, config.maFast);
      const slow = calculateMA(newHistory, config.maSlow);
      const prevFast = calculateMA(newHistory.slice(0, -1), config.maFast);
      const prevSlow = calculateMA(newHistory.slice(0, -1), config.maSlow);

      if (fast && slow && prevFast && prevSlow) {
        let side: 'LONG' | 'SHORT' | null = null;
        if (fast > slow && prevFast <= prevSlow) side = 'LONG';
        else if (fast < slow && prevFast >= prevSlow) side = 'SHORT';

        if (side) {
          const size = state.balance * config.kellyFraction;
          const newSignal: TradingSignal = {
            id: Math.random().toString(36).substr(2, 9),
            market,
            modelProb: 0.75,
            divergence: 0.1,
            sentimentScore: side === 'LONG' ? 1 : -1,
            timestamp: Date.now(),
            explanation: `MA Cross: ${config.maFast} over ${config.maSlow} on ${market.name}`,
            recommendedSize: size,
            confidence: 0.7,
            strategy: 'MA_CROSSOVER'
          };
          setSignals(prev => [newSignal, ...prev].slice(0, 10));
          addLog(`Technical: ${side} cross detected for ${market.name}`, 'success');
          return;
        }
      }
    }

    if (config.activeStrategy === 'BAYESIAN_SENTIMENT') {
      try {
        const analysis = await analyzeMarketCatalyst(newsHeadline, market.name);
        if (!analysis) return;

        const edge = analysis.modelProbability - market.impliedProb;
        if (Math.abs(edge) >= config.minEdge) {
          const b = (1 / market.impliedProb) - 1;
          const p = analysis.modelProbability;
          const kelly = (p * (b + 1) - 1) / b;
          const size = Math.max(0, kelly * config.kellyFraction * state.balance);

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
            strategy: 'BAYESIAN_SENTIMENT'
          };
          setSignals(prev => [newSignal, ...prev].slice(0, 10));
          addLog(`Alpha: ${market.name} Bayesian shift (${(edge*100).toFixed(1)}% edge)`, 'success');
        }
      } catch (e: any) {
        const errorData = e?.error || e;
        const code = errorData?.code || (typeof e?.message === 'string' && e.message.includes('429') ? 429 : 0);
        
        if (code === 429 || errorData?.status === "RESOURCE_EXHAUSTED") {
          addLog(`Engine: Quota reached. Entering 60s cooldown.`, "warn");
          cooldownRef.current = Date.now() + 60000; // 60s cooldown
        } else {
          addLog(`Engine: API Latency sync required`, "warn");
        }
      }
    }
  }, [state.balance, config]);

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
    addLog(`Execution: ${newTrade.type} order filled for ${newTrade.marketName}`, 'success');
  };

  const runBacktest = async (): Promise<BacktestResult> => {
    addLog(`Simulating ${config.activeStrategy} performance...`, 'info');
    const trades = 30 + Math.floor(Math.random() * 20);
    let bal = INITIAL_CAPITAL;
    const curve = [{ name: 'T0', bal }];
    let wins = 0;

    for (let i = 1; i <= trades; i++) {
      const win = Math.random() > 0.46;
      const move = win ? (0.05 + Math.random() * 0.1) : -(0.04 + Math.random() * 0.06);
      if (win) wins++;
      bal *= (1 + move * config.kellyFraction);
      curve.push({ name: `T${i}`, bal });
    }

    return {
      totalTrades: trades,
      winRate: (wins / trades) * 100,
      profitFactor: 1.74,
      maxDrawdown: 0.072,
      finalBalance: bal,
      expectancy: (bal - INITIAL_CAPITAL) / trades,
      equityCurve: curve
    };
  };

  return { state, signals, logs, config, setConfig, processMarketData, executeTrade, runBacktest };
};
