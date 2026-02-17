
export type StrategyType = 'BAYESIAN_SENTIMENT' | 'MA_CROSSOVER' | 'CONSENSUS';

export interface Market {
  id: string;
  name: string;
  type: 'POLYMARKET' | 'CRYPTO_ALT' | 'SPREAD' | 'BINANCE_TESTNET';
  impliedProb: number;
  volume24h: number;
  liquidity: number;
  currentPrice?: number;
}

export interface WatchlistMarket extends Market {
  priceHistory: { timestamp: number; price: number }[];
  lastSignal: 'BUY' | 'SELL' | 'HOLD';
  probability: number;
}

export interface PricePoint {
  timestamp: number;
  price: number;
}

export interface TradingSignal {
  id: string;
  market: Market;
  modelProb: number;
  divergence: number;
  sentimentScore: number;
  timestamp: number;
  explanation: string;
  recommendedSize: number;
  confidence: number;
  strategy: StrategyType;
}

export interface Trade {
  id: string;
  timestamp: number;
  marketName: string;
  entryPrice: number;
  exitPrice?: number;
  size: number;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  pnl: number;
  type: 'LONG' | 'SHORT';
}

export interface EngineConfig {
  maxDrawdown: number;
  kellyFraction: number;
  minEdge: number;
  stopLoss: number;
  activeStrategy: StrategyType;
  maFast: number;
  maSlow: number;
  remoteNodeUrl: string;
  isRemoteMode: boolean;
}

export interface BotState {
  balance: number;
  equity: number;
  activePositions: Trade[];
  drawdown: number;
  isLive: boolean;
  isThrottled: boolean;
  isBackendConnected: boolean;
  watchlist: WatchlistMarket[];
}

export interface BacktestResult {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  finalBalance: number;
  expectancy: number;
  equityCurve: { name: string; bal: number }[];
}
