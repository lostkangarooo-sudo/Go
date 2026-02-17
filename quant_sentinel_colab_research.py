
"""
QuantSentinel: Professional Alpha Research Suite (v2.6)
Senior Quantitative Engineer Edition

This script provides a high-fidelity simulation of the QuantSentinel trading engine.
Features: 
- Bayesian Consensus & MA Crossover Logic
- Fractional Kelly Sizing (Optimized for low-risk)
- Hard Stop-Loss Guardrails
- Monte Carlo Alpha Validation
- Interactive Visual Dashboard for Google Colab
"""

import time
import uuid
import random
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime
from typing import List, Dict, Optional, Tuple

# Colab/IPython specific imports for interactive widgets
try:
    from IPython.display import clear_output, display
    import ipywidgets as widgets
except ImportError:
    widgets = None

# --- 1. QUANTITATIVE CONFIGURATION ---
INITIAL_CAPITAL = 500.0
FRACTIONAL_KELLY = 0.10     # 10% Kelly sizing for conservative growth
STOP_LOSS_PCT = 0.10        # 10% hard stop on allocated trade size
TAKE_PROFIT_PCT = 0.15      # 15% target profit on allocated trade size
MAX_DRAWDOWN_LIMIT = 0.15   # 15% Portfolio-wide circuit breaker
MA_FAST = 5
MA_SLOW = 20
SYMBOLS = ["BTCUSDT", "ETHUSDT"]

# --- 2. ENGINE ARCHITECTURE ---
class QuantSentinelEngine:
    def __init__(self, balance: float = INITIAL_CAPITAL):
        self.balance = balance
        self.equity = balance
        self.peak_equity = balance
        self.active_positions: List[Dict] = []
        self.trade_logs: List[Dict] = []
        self.system_logs: List[str] = []
        self.equity_history = [balance]
        self.progress = 0.0
        
        # Market State
        self.market_data = {
            s: {
                "price": 66000.0 if "BTC" in s else 3400.0,
                "history": [],
                "prob": 0.50
            } for s in SYMBOLS
        }
        
        self.update_progress(0.1, "Engine Initialized. Bayesian Oracle Online.")

    def update_progress(self, step: float, description: str):
        self.progress = min(1.0, self.progress + step)
        timestamp = datetime.now().strftime("%H:%M:%S")
        msg = f"[{timestamp}] Progress: {self.progress*100:.1f}% - {description}"
        self.system_logs.append(msg)
        if len(self.system_logs) > 30: self.system_logs.pop(0)

    def calculate_ma(self, prices: List[float], period: int) -> Optional[float]:
        if len(prices) < period: return None
        return sum(prices[-period:]) / period

    def get_signals(self, symbol: str, headline: str = "") -> Tuple[str, float]:
        history = self.market_data[symbol]["history"]
        
        # 1. Technical Signal (MA Crossover)
        tech_sig = "HOLD"
        if len(history) >= MA_SLOW + 1:
            fast = self.calculate_ma(history, MA_FAST)
            slow = self.calculate_ma(history, MA_SLOW)
            prev_fast = self.calculate_ma(history[:-1], MA_FAST)
            prev_slow = self.calculate_ma(history[:-1], MA_SLOW)
            if fast and slow and prev_fast and prev_slow:
                if fast > slow and prev_fast <= prev_slow: tech_sig = "BUY"
                elif fast < slow and prev_fast >= prev_slow: tech_sig = "SELL"

        # 2. Bayesian Sentiment Oracle
        drift = (random.random() - 0.5) * 0.1
        if "bullish" in headline.lower() or "growth" in headline.lower(): drift += 0.06
        elif "bearish" in headline.lower() or "drain" in headline.lower(): drift -= 0.06
            
        prob = np.clip(self.market_data[symbol]["prob"] + drift, 0.1, 0.9)
        self.market_data[symbol]["prob"] = prob
        
        ai_sig = "BUY" if prob > 0.55 else "SELL" if prob < 0.45 else "HOLD"
        
        # 3. Consensus Logic
        final_sig = tech_sig if tech_sig == ai_sig else "HOLD"
        return final_sig, prob

    def execute_trade(self, symbol: str, signal: str, prob: float):
        if any(p["symbol"] == symbol for p in self.active_positions):
            return

        edge = abs(prob - 0.5)
        # Fractional Kelly Sizing
        size = self.balance * FRACTIONAL_KELLY * (edge / 0.5)
        
        if size < 5.0: return # Min order guard
        if size > self.balance: size = self.balance * 0.9

        price = self.market_data[symbol]["price"]
        trade = {
            "id": str(uuid.uuid4())[:8],
            "symbol": symbol,
            "type": "LONG" if signal == "BUY" else "SHORT",
            "entry_price": price,
            "size": size,
            "status": "OPEN",
            "pnl": 0.0,
            "max_loss": size * STOP_LOSS_PCT,
            "target_profit": size * TAKE_PROFIT_PCT,
            "timestamp": time.time()
        }
        
        self.active_positions.append(trade)
        self.balance -= size
        self.update_progress(0.02, f"EXECUTION: {trade['type']} {symbol} filled at ${price:.2f}")

    def tick(self):
        unrealized_pnl = 0
        for s in SYMBOLS:
            # Simulated random walk with slight trend
            vol = 0.003
            change = (random.random() - 0.5) * vol
            self.market_data[s]["price"] *= (1 + change)
            self.market_data[s]["history"].append(self.market_data[s]["price"])
            if len(self.market_data[s]["history"]) > 100: self.market_data[s]["history"].pop(0)

            # Monitor positions
            for pos in self.active_positions[:]:
                if pos["symbol"] == s:
                    mult = 1 if pos["type"] == "LONG" else -1
                    pos["pnl"] = (self.market_data[s]["price"] - pos["entry_price"]) / pos["entry_price"] * pos["size"] * mult
                    unrealized_pnl += pos["pnl"]
                    
                    # Stop-Loss Guardrail
                    if pos["pnl"] <= -pos["max_loss"]:
                        self.close_position(pos, "STOP LOSS HIT")
                    # Take-Profit Target
                    elif pos["pnl"] >= pos["target_profit"]:
                        self.close_position(pos, "TARGET REACHED")

        self.equity = self.balance + unrealized_pnl + sum(p["size"] for p in self.active_positions)
        self.equity_history.append(self.equity)
        
        # Drawdown Circuit Breaker
        self.peak_equity = max(self.peak_equity, self.equity)
        dd = (self.peak_equity - self.equity) / self.peak_equity
        if dd > MAX_DRAWDOWN_LIMIT:
            self.update_progress(0.0, "CRITICAL DRAWDOWN: Emergency Liquidation.")
            self.liquidate_all()

    def close_position(self, pos: Dict, reason: str):
        self.balance += pos["size"] + pos["pnl"]
        pos["status"] = "CLOSED"
        pos["close_price"] = self.market_data[pos["symbol"]]["price"]
        pos["exit_reason"] = reason
        self.trade_logs.append(pos)
        self.active_positions.remove(pos)
        self.update_progress(0.01, f"CLOSED {pos['symbol']}: {reason} (${pos['pnl']:+.2f})")

    def liquidate_all(self):
        for pos in self.active_positions[:]:
            self.close_position(pos, "EMERGENCY_LIQ")

    def run_monte_carlo(self, n_trades: int = 30) -> Dict:
        self.update_progress(0.05, f"Running {n_trades}-step Monte Carlo Simulation...")
        sim_bal = INITIAL_CAPITAL
        curve = [sim_bal]
        wins = 0
        
        for i in range(n_trades):
            win = random.random() > 0.44 # Matching user logic (~56% win rate)
            size = sim_bal * FRACTIONAL_KELLY
            pnl = (0.07 if win else -0.05) * size
            # Hard stop loss check
            pnl = max(pnl, -size * STOP_LOSS_PCT)
            sim_bal += pnl
            curve.append(sim_bal)
            if win: wins += 1
            
        return {
            "win_rate": (wins / n_trades) * 100,
            "roi": ((sim_bal - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100,
            "final": sim_bal,
            "curve": curve
        }

# --- 3. DASHBOARD RENDERER ---
def display_dashboard(engine: QuantSentinelEngine, backtest: Optional[Dict] = None):
    if widgets: clear_output(wait=True)
    
    fig = plt.figure(figsize=(15, 8), constrained_layout=True)
    fig.patch.set_facecolor('#0f172a')
    gs = fig.add_gridspec(2, 2)

    # 1. Live Equity Curve
    ax1 = fig.add_subplot(gs[0, 0])
    ax1.plot(engine.equity_history, color='#10b981', linewidth=2, label="Live Equity")
    ax1.set_title("Real-Time Portfolio Equity", color='white', fontsize=12)
    ax1.set_facecolor('#1e293b')
    ax1.tick_params(colors='white')
    ax1.grid(True, alpha=0.1)

    # 2. Monte Carlo Projection
    ax2 = fig.add_subplot(gs[0, 1])
    if backtest:
        ax2.plot(backtest['curve'], color='#3b82f6', linewidth=2, label="MC Projection")
        ax2.set_title(f"Monte Carlo ROI: {backtest['roi']:.1f}% (Win Rate: {backtest['win_rate']:.1f}%)", color='white')
    ax2.set_facecolor('#1e293b')
    ax2.tick_params(colors='white')
    ax2.grid(True, alpha=0.1)

    # 3. Market Monitor
    ax3 = fig.add_subplot(gs[1, :])
    for s in SYMBOLS:
        if engine.market_data[s]["history"]:
            h = engine.market_data[s]["history"]
            norm = np.array(h) / h[0]
            ax3.plot(norm, label=s)
    ax3.legend()
    ax3.set_title("Asset Relative Performance", color='white')
    ax3.set_facecolor('#1e293b')
    ax3.tick_params(colors='white')

    plt.show()

    # --- CLI Report ---
    print(f"\n{'='*85}")
    print(f" QUANTSENTINEL v2.6 | EQUITY: ${engine.equity:.2f} | BALANCE: ${engine.balance:.2f} | PROGRESS: {engine.progress*100:.1f}%")
    print(f"{'='*85}")
    
    if engine.active_positions:
        print("\n ACTIVE RISK:")
        df_active = pd.DataFrame(engine.active_positions)[["symbol", "type", "size", "pnl", "entry_price"]]
        print(df_active.to_string(index=False))
    
    if engine.trade_logs:
        print("\n RECENT TRADE LOGS:")
        df_history = pd.DataFrame(engine.trade_logs).tail(5)[["symbol", "type", "size", "pnl", "exit_reason"]]
        print(df_history.to_string(index=False))

    print("\n SYSTEM EVENTS:")
    for log in engine.system_logs[-5:]:
        print(f" {log}")
    print(f"{'='*85}\n")

# --- 4. EXECUTION LOOP ---
def run_simulation():
    engine = QuantSentinelEngine()
    
    # Pre-simulation warm-up
    for _ in range(30):
        engine.tick()
        
    backtest = engine.run_monte_carlo(40)
    
    headlines = [
        "Bullish institutional flows detected in BTC ETFs.",
        "Regulatory clarity improves; altcoin sentiment shifts positive.",
        "Market volatility spike expected due to liquidity drain.",
        "Federal Reserve maintains rates; macro environment stable."
    ]

    try:
        step = 0
        while step < 100:
            engine.tick()
            
            # Every 5 ticks, evaluate news and signals
            if step % 5 == 0:
                s = random.choice(SYMBOLS)
                h = random.choice(headlines)
                sig, prob = engine.get_signals(s, h)
                if sig != "HOLD":
                    engine.execute_trade(s, sig, prob)
            
            display_dashboard(engine, backtest)
            time.sleep(1)
            step += 1
            
    except KeyboardInterrupt:
        print("\n[!] Simulation halted by operator.")

if __name__ == "__main__":
    run_simulation()
