
export interface Market {
  id: string;
  name: string;
  type: 'POLYMARKET' | 'CRYPTO_ALT' | 'SPREAD';
  impliedProb: number; // Market price (e.g. 0.65)
  volume24h: number;
  liquidity: number;
  currentPrice?: number;
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
}

export interface BotState {
  balance: number;
  equity: number;
  activePositions: Trade[];
  drawdown: number;
  isLive: boolean;
}

export interface BacktestResult {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  finalBalance: number;
  equityCurve: { name: string; bal: number }[];
}
