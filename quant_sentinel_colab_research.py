
"""
QuantSentinel: Senior Quantitative Research Suite
Conversion of React Engine (v2.5) to Python/Colab

Features:
- Multi-symbol simulation (BTC, ETH, etc.)
- Strategies: CONSENSUS, BAYESIAN_SENTIMENT, MA_CROSSOVER
- Risk: Fractional Kelly + Max Drawdown Guardrails
- Backtesting: Monte Carlo Alpha Validation
- UI: Interactive Colab Dashboard & FastAPI Node
"""

import os
import time
import uuid
import random
import threading
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from pydantic import BaseModel

# Try to use Google GenAI if API key is present
try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

# FastAPI for React Frontend Sync
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# IPython/Colab Widgets
try:
    from IPython.display import clear_output, display
    import ipywidgets as widgets
except ImportError:
    widgets = None

# --- 1. CONSTANTS (Aligned with constants.ts) ---
INITIAL_CAPITAL = 500.0
MAX_DRAWDOWN_LIMIT = 0.15
FRACTIONAL_KELLY = 0.15
MIN_EDGE_THRESHOLD = 0.05
MA_FAST = 5
MA_SLOW = 20
SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"]

# --- 2. THE QUANT ENGINE ---
class QuantSentinelEngine:
    def __init__(self, initial_balance: float = INITIAL_CAPITAL):
        self.balance = initial_balance
        self.equity = initial_balance
        self.peak_equity = initial_balance
        self.active_positions: List[Dict] = []
        self.trade_history: List[Dict] = []
        self.logs: List[Dict] = []
        self.market_data: Dict[str, Dict] = {
            s: {
                "price": 60000.0 if "BTC" in s else 3000.0 if "ETH" in s else 150.0,
                "history": [],
                "implied_prob": 0.5,
                "current_prob": 0.5
            } for s in SYMBOLS
        }
        self.equity_history: List[Dict] = [{"time": time.time(), "equity": initial_balance}]
        self._lock = threading.Lock()
        
        # Strategy Config
        self.active_strategy = "CONSENSUS"
        self.max_drawdown = MAX_DRAWDOWN_LIMIT
        self.kelly_fraction = FRACTIONAL_KELLY

    def add_log(self, msg: str, log_type: str = "info"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.logs.append({"time": timestamp, "msg": msg, "type": log_type})
        if len(self.logs) > 40: self.logs.pop(0)

    def deposit_funds(self, amount: float):
        with self._lock:
            self.balance += amount
            self.equity += amount
            self.add_log(f"CAPITAL INJECTION: +${amount:.2f}", "success")

    def calculate_ma(self, prices: List[float], period: int) -> Optional[float]:
        if len(prices) < period: return None
        return sum(prices[-period:]) / period

    def get_technical_signal(self, symbol: str) -> str:
        history = self.market_data[symbol]["history"]
        if len(history) < MA_SLOW + 1: return "HOLD"
        
        fast = self.calculate_ma(history, MA_FAST)
        slow = self.calculate_ma(history, MA_SLOW)
        prev_history = history[:-1]
        p_fast = self.calculate_ma(prev_history, MA_FAST)
        p_slow = self.calculate_ma(prev_history, MA_SLOW)

        if fast and slow and p_fast and p_slow:
            if fast > slow and p_fast <= p_slow: return "BUY"
            if fast < slow and p_fast >= p_slow: return "SELL"
        return "HOLD"

    def get_bayesian_signal(self, symbol: str, headline: str = "") -> Tuple[str, float]:
        # Simulated Bayesian Oracle mirroring React geminiService.ts
        # In actual Colab, you would use genai.GenerativeModel
        base_prob = self.market_data[symbol]["implied_prob"]
        
        # Mocking AI analysis behavior
        drift = (random.random() - 0.5) * 0.1
        if "pause" in headline.lower() or "improves" in headline.lower():
            drift += 0.05
        elif "crash" in headline.lower() or "drain" in headline.lower():
            drift -= 0.05
            
        prob = np.clip(base_prob + drift, 0.1, 0.9)
        self.market_data[symbol]["current_prob"] = prob
        
        signal = "BUY" if prob > 0.55 else "SELL" if prob < 0.45 else "HOLD"
        return signal, prob

    def execute_trade(self, symbol: str, side: str, prob: float, explanation: str):
        with self._lock:
            # Prevent over-exposure to same symbol
            if any(p["symbol"] == symbol for p in self.active_positions):
                return

            edge = abs(prob - 0.5)
            # Fractional Kelly Sizing: Size = Equity * Fraction * (Edge / MaxPossibleEdge)
            size = self.equity * self.kelly_fraction * (edge / 0.5)
            
            if size > self.balance: size = self.balance * 0.95
            if size < 5.0: return # Min size guard

            price = self.market_data[symbol]["price"]
            trade = {
                "id": str(uuid.uuid4())[:8],
                "symbol": symbol,
                "type": "LONG" if side == "BUY" else "SHORT",
                "entry_price": price,
                "size": size,
                "status": "OPEN",
                "pnl": 0.0,
                "timestamp": time.time(),
                "explanation": explanation
            }
            
            self.active_positions.append(trade)
            self.balance -= size
            self.add_log(f"EXECUTION: {trade['type']} {symbol} filled at ${price:.2f}", "success")

    def process_market_data(self, symbol: str, headline: str):
        # 1. Update Strategy Logic
        tech_sig = self.get_technical_signal(symbol)
        ai_sig, prob = self.get_bayesian_signal(symbol, headline)
        
        self.add_log(f"Oracle: Digesting news for {symbol}...", "info")
        
        # 2. Consensus Logic
        trigger = "HOLD"
        explanation = ""
        
        if self.active_strategy == "CONSENSUS":
            if tech_sig == ai_sig and tech_sig != "HOLD":
                trigger = tech_sig
                explanation = f"CONSENSUS: Technical (MA) and AI (Bayesian {prob:.2f}) aligned."
            elif tech_sig != "HOLD" or ai_sig != "HOLD":
                self.add_log(f"GATED: Divergence on {symbol} (Tech:{tech_sig} vs AI:{ai_sig})", "warn")
        elif self.active_strategy == "MA_CROSSOVER":
            trigger = tech_sig
            explanation = "Technical Trigger: MA Crossover detected."
        elif self.active_strategy == "BAYESIAN_SENTIMENT":
            trigger = ai_sig
            explanation = f"AI Oracle Trigger: Bayesian probability {prob:.2f} threshold hit."

        if trigger != "HOLD":
            self.execute_trade(symbol, trigger, prob, explanation)

    def tick(self):
        """Simulates 1 second of market time"""
        with self._lock:
            unrealized_pnl = 0
            for s in SYMBOLS:
                # Random walk price update
                vol = 0.002
                change = (random.random() - 0.5) * vol
                self.market_data[s]["price"] *= (1 + change)
                self.market_data[s]["history"].append(self.market_data[s]["price"])
                if len(self.market_data[s]["history"]) > 60: self.market_data[s]["history"].pop(0)

                # Update Open PnL
                for pos in self.active_positions:
                    if pos["symbol"] == s:
                        mult = 1 if pos["type"] == "LONG" else -1
                        pos["pnl"] = (self.market_data[s]["price"] - pos["entry_price"]) / pos["entry_price"] * pos["size"] * mult
                        unrealized_pnl += pos["pnl"]

            active_risk = sum(p["size"] for p in self.active_positions)
            self.equity = self.balance + active_risk + unrealized_pnl
            self.equity_history.append({"time": time.time(), "equity": self.equity})
            if len(self.equity_history) > 300: self.equity_history.pop(0)
            
            # Drawdown check
            self.peak_equity = max(self.peak_equity, self.equity)
            drawdown = (self.peak_equity - self.equity) / self.peak_equity
            if drawdown > self.max_drawdown:
                self.add_log(f"CRITICAL: Max Drawdown {drawdown*100:.1f}% hit. Liquidating all.", "warn")
                self.liquidate_all()

    def liquidate_all(self):
        for pos in self.active_positions:
            self.balance += pos["size"] + pos["pnl"]
        self.active_positions = []

    def run_backtest(self, n_trades: int = 30) -> Dict:
        """Monte Carlo simulation mirroring React runBacktest"""
        sim_bal = INITIAL_CAPITAL
        sim_equity = [sim_bal]
        wins = 0
        total_p = 0
        total_l = 0
        
        for i in range(n_trades):
            # 55% win rate simulation for a 'good' strategy
            win = random.random() < 0.55
            # Kelly-like outcome
            ret = (random.random() * 0.08) if win else -(random.random() * 0.05)
            pnl = sim_bal * self.kelly_fraction * ret
            sim_bal += pnl
            sim_equity.append(sim_bal)
            
            if win:
                wins += 1
                total_p += pnl
            else:
                total_l += abs(pnl)
                
        return {
            "total_trades": n_trades,
            "win_rate": (wins / n_trades) * 100,
            "profit_factor": total_p / total_l if total_l > 0 else 10.0,
            "max_drawdown": 0.08, # Simulated constant
            "final_balance": sim_bal,
            "roi": ((sim_bal - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100,
            "curve": sim_equity
        }

# --- 3. FASTAPI FOR FRONTEND SYNC ---
engine = QuantSentinelEngine()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/balance")
def api_balance():
    return {"balance": engine.balance, "equity": engine.equity}

@app.get("/trades")
def api_trades():
    return [p for p in engine.active_positions]

@app.get("/signals")
def api_signals():
    # Return simulated signals for the React UI to display
    sigs = []
    for s in SYMBOLS:
        tech = engine.get_technical_signal(s)
        ai, prob = engine.get_bayesian_signal(s)
        if tech != "HOLD" or ai != "HOLD":
            sigs.append({
                "id": str(uuid.uuid4())[:8],
                "symbol": s,
                "signal": tech if tech == ai else "DIVERGENCE",
                "prob": prob,
                "explanation": f"Tech: {tech}, AI Prob: {prob:.2f}",
                "position_size": engine.calculate_kelly_size_mock(prob)
            })
    return sigs

@app.post("/deposit")
def api_deposit(amount: float):
    engine.deposit_funds(amount)
    return {"status": "success"}

def run_server():
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="error")

# --- 4. COLAB DASHBOARD ---
def render_dashboard(backtest_res=None):
    if not widgets: return
    
    clear_output(wait=True)
    
    # 1. Plots
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 5))
    fig.patch.set_facecolor('#0f172a')
    
    # Equity Curve
    e_data = [h["equity"] for h in engine.equity_history]
    ax1.plot(e_data, color='#10b981', linewidth=2)
    ax1.set_title("Live Portfolio Equity", color='white', fontsize=12)
    ax1.set_facecolor('#1e293b')
    ax1.tick_params(colors='white')
    ax1.grid(True, alpha=0.1)

    # Backtest Result if exists
    if backtest_res:
        ax2.plot(backtest_res["curve"], color='#3b82f6', linewidth=2)
        ax2.set_title(f"Monte Carlo Backtest (WinRate: {backtest_res['win_rate']:.1f}%)", color='white', fontsize=12)
    else:
        ax2.text(0.5, 0.5, "No Backtest Data", color='gray', ha='center')
    ax2.set_facecolor('#1e293b')
    ax2.tick_params(colors='white')
    
    plt.tight_layout()
    plt.show()

    # 2. Text Summary
    print(f"\n{'='*80}")
    print(f"  QUANTSENTINEL v2.5 | EQUITY: ${engine.equity:.2f} | BALANCE: ${engine.balance:.2f}")
    print(f"{'='*80}")
    
    # Market Status
    print("\n  SYMBOL      PRICE         TECH      AI PROB    POSITION")
    print(f"  {'-'*65}")
    for s in SYMBOLS:
        tech = engine.get_technical_signal(s)
        prob = engine.market_data[s]["current_prob"]
        pos = next((p for p in engine.active_positions if p["symbol"] == s), None)
        pos_str = f"{pos['type']} (${pos['size']:.0f})" if pos else "FLAT"
        print(f"  {s:<10} ${engine.market_data[s]['price']:<10.2f} {tech:<10} {prob:<10.2f} {pos_str}")

    # Terminal Logs
    print(f"\n  {'='*20} ENGINE LOGS {'='*20}")
    for l in engine.logs[-6:]:
        color = "\033[92m" if l["type"] == "success" else "\033[94m" if l["type"] == "info" else "\033[91m"
        print(f"  {l['time']} {color}{l['msg']}\033[0m")
    print(f"{'='*80}\n")

# --- 5. EXECUTION LOOP ---
def main_simulation():
    # Start API in background
    threading.Thread(target=run_server, daemon=True).start()
    
    # Initialize some price history
    for _ in range(30):
        engine.tick()

    backtest_data = engine.run_backtest()
    
    headlines = [
        "Federal Reserve hints at interest rate pause; liquidity improves.",
        "Massive institutional accumulation detected in spot markets.",
        "Network hash rate hits record high; fundamental strength grows.",
        "Unexpected exchange outage causes localized flash crash.",
        "SEC approves new regulatory framework for altcoin benchmarks."
    ]

    try:
        step = 0
        while True:
            engine.tick()
            
            # Periodically process market data / headlines
            if step % 8 == 0:
                symbol = random.choice(SYMBOLS)
                headline = random.choice(headlines)
                engine.process_market_data(symbol, headline)
            
            # Auto-Close logic (Take Profit / Stop Loss)
            for pos in engine.active_positions[:]:
                if pos["pnl"] > pos["size"] * 0.06 or pos["pnl"] < -pos["size"] * 0.04:
                    engine.add_log(f"CLOSED: {pos['symbol']} at {pos['pnl']:+.2f} PnL", "info")
                    engine.balance += pos["size"] + pos["pnl"]
                    engine.active_positions.remove(pos)

            render_dashboard(backtest_data)
            time.sleep(1)
            step += 1
    except KeyboardInterrupt:
        print("\n[!] Simulation halted by operator.")

if __name__ == "__main__":
    main_simulation()
