
"""
QuantSentinel: Micro-Alpha Simulation Suite
Senior Quant Engineer Version - Commit 17df014f Alignment
Designed for: Google Colab / Google Studio / Local Python 3.10+
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
from typing import List, Dict, Optional
from pydantic import BaseModel

# FastAPI for Frontend Connectivity
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Colab/IPython specific imports
try:
    from IPython.display import clear_output, display
    import ipywidgets as widgets
except ImportError:
    pass

# --- 1. CONFIGURATION & CONSTANTS ---
INITIAL_CAPITAL = 500.0
MAX_DRAWDOWN = 0.15
FRACTIONAL_KELLY = 0.15
MA_FAST = 5
MA_SLOW = 20
SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"]

# --- 2. DATA MODELS ---
class Trade(BaseModel):
    id: str
    timestamp: str
    symbol: str
    type: str  # LONG / SHORT
    entry_price: float
    exit_price: Optional[float] = None
    size: float
    pnl: float = 0.0
    status: str = "OPEN"

class Signal(BaseModel):
    symbol: str
    signal: str # BUY / SELL / HOLD
    prob: float
    explanation: str
    position_size: float

# --- 3. CORE ENGINE ---
class QuantSentinelEngine:
    def __init__(self, initial_balance=INITIAL_CAPITAL):
        self.balance = initial_balance
        self.equity = initial_balance
        self.trades: List[Dict] = []
        self.history: List[Dict] = [{"timestamp": datetime.now(), "equity": initial_balance}]
        self.market_data: Dict[str, pd.DataFrame] = {
            s: pd.DataFrame(columns=["timestamp", "price"]) for s in SYMBOLS
        }
        self.logs: List[str] = []
        self._lock = threading.Lock()

    def add_log(self, msg: str):
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.logs.append(f"[{timestamp}] {msg}")
        if len(self.logs) > 20: self.logs.pop(0)

    def deposit_funds(self, amount: float):
        with self._lock:
            self.balance += amount
            self.equity += amount
            self.add_log(f"CAPITAL INFLUX: +${amount:.2f} credited to engine.")

    def get_ma_signal(self, symbol: str) -> str:
        df = self.market_data[symbol]
        if len(df) < MA_SLOW: return "HOLD"
        
        prices = df["price"]
        ma_fast = prices.rolling(window=MA_FAST).mean()
        ma_slow = prices.rolling(window=MA_SLOW).mean()
        
        last_fast, prev_fast = ma_fast.iloc[-1], ma_fast.iloc[-2]
        last_slow, prev_slow = ma_slow.iloc[-1], ma_slow.iloc[-2]
        
        if last_fast > last_slow and prev_fast <= prev_slow: return "BUY"
        if last_fast < last_slow and prev_fast >= prev_slow: return "SELL"
        return "HOLD"

    def get_bayesian_signal(self, symbol: str, headline: Optional[str] = None):
        """Simulates Bayesian Sentiment Update from News"""
        # In a production environment, this would call Gemini API
        # Here we simulate the AI's probability score
        base_prob = 0.5
        if headline:
            sentiment_shift = (random.random() - 0.5) * 0.2
            prob = np.clip(base_prob + sentiment_shift, 0.1, 0.9)
        else:
            prob = base_prob + (random.random() - 0.5) * 0.05
            
        signal = "BUY" if prob > 0.55 else "SELL" if prob < 0.45 else "HOLD"
        return signal, prob

    def calculate_kelly_size(self, prob: float) -> float:
        edge = abs(prob - 0.5)
        # Size = Balance * KellyFraction * (Edge / MaxPossibleEdge)
        notional = self.balance * FRACTIONAL_KELLY * (edge / 0.5)
        return round(notional, 2)

    def process_market_tick(self):
        with self._lock:
            unrealized_pnl = 0
            for symbol in SYMBOLS:
                # 1. Update Prices
                volatility = 0.002
                current_price = self.market_data[symbol]["price"].iloc[-1] if not self.market_data[symbol].empty else 60000.0
                new_price = current_price * (1 + (random.random() - 0.5) * volatility)
                
                new_row = pd.DataFrame([{"timestamp": datetime.now(), "price": new_price}])
                self.market_data[symbol] = pd.concat([self.market_data[symbol], new_row], ignore_index=True).tail(100)
                
                # 2. Update Position PnL
                for trade in self.trades:
                    if trade["status"] == "OPEN" and trade["symbol"] == symbol:
                        side_mult = 1 if trade["type"] == "LONG" else -1
                        trade["pnl"] = (new_price - trade["entry_price"]) / trade["entry_price"] * trade["size"] * side_mult
                        unrealized_pnl += trade["pnl"]

            self.equity = self.balance + unrealized_pnl
            self.history.append({"timestamp": datetime.now(), "equity": self.equity})
            if len(self.history) > 200: self.history.pop(0)

    def execute_trade(self, symbol: str, side: str, prob: float):
        with self._lock:
            # Check for existing position
            if any(t["symbol"] == symbol and t["status"] == "OPEN" for t in self.trades):
                return
            
            size = self.calculate_kelly_size(prob)
            if size > self.balance * 0.5: # Margin safety
                size = self.balance * 0.5

            if size < 10.0: return # Min order size
            
            price = self.market_data[symbol]["price"].iloc[-1]
            trade = {
                "id": str(uuid.uuid4())[:8],
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "symbol": symbol,
                "type": "LONG" if side == "BUY" else "SHORT",
                "entry_price": price,
                "size": size,
                "pnl": 0.0,
                "status": "OPEN"
            }
            self.trades.append(trade)
            self.balance -= size
            self.add_log(f"EXECUTION: {trade['type']} {symbol} filled at ${price:.2f} (Size: ${size})")

# --- 4. FASTAPI BACKEND SERVER ---
engine = QuantSentinelEngine()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/balance")
def get_balance():
    return {"balance": engine.balance, "equity": engine.equity}

@app.get("/trades")
def get_trades():
    return engine.trades

@app.get("/signals")
def get_signals():
    results = []
    for s in SYMBOLS:
        tech = engine.get_ma_signal(s)
        ai_sig, prob = engine.get_bayesian_signal(s)
        
        # Consensus
        final = tech if tech == ai_sig else "HOLD"
        
        results.append({
            "id": str(uuid.uuid4())[:4],
            "symbol": s,
            "signal": final,
            "prob": prob,
            "explanation": f"Tech: {tech} | AI: {ai_sig} ({prob:.2f})",
            "position_size": engine.calculate_kelly_size(prob) if final != "HOLD" else 0
        })
    return results

@app.post("/deposit")
def api_deposit(amount: float):
    engine.deposit_funds(amount)
    return {"status": "success"}

def run_server():
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="error")

# --- 5. DASHBOARD & LOOP ---
def start_simulation():
    # Start API server in thread
    threading.Thread(target=run_server, daemon=True).start()
    
    # Initialize some prices
    for s in SYMBOLS:
        engine.market_data[s] = pd.DataFrame([{"timestamp": datetime.now(), "price": 50000 + random.random()*5000}])

    # Simulation Loop
    try:
        while True:
            engine.process_market_tick()
            
            # Logic: Periodically generate news headlines and check signals
            if random.random() > 0.8:
                symbol = random.choice(SYMBOLS)
                tech = engine.get_ma_signal(symbol)
                ai_sig, prob = engine.get_bayesian_signal(symbol, "Positive liquidity shift detected")
                
                if tech == ai_sig and tech != "HOLD":
                    engine.execute_trade(symbol, tech, prob)

            # Auto-Close logic (Take Profit / Stop Loss)
            for trade in engine.trades:
                if trade["status"] == "OPEN":
                    if trade["pnl"] > trade["size"] * 0.1 or trade["pnl"] < -trade["size"] * 0.05:
                        trade["status"] = "CLOSED"
                        trade["exit_price"] = engine.market_data[trade["symbol"]]["price"].iloc[-1]
                        engine.balance += (trade["size"] + trade["pnl"])
                        engine.add_log(f"CLOSED: {trade['symbol']} for PnL: ${trade['pnl']:.2f}")

            # Visualization
            render_dashboard()
            time.sleep(1)
    except KeyboardInterrupt:
        print("Simulation Halted.")

def render_dashboard():
    clear_output(wait=True)
    fig, ax = plt.subplots(1, 1, figsize=(10, 4))
    
    # Plot Equity
    hist_df = pd.DataFrame(engine.history)
    ax.plot(hist_df.index, hist_df['equity'], color='#10b981', linewidth=2)
    ax.set_title("QuantSentinel Real-time Equity Curve", fontsize=12, fontweight='bold', color='white')
    ax.set_facecolor('#0f172a')
    fig.patch.set_facecolor('#0f172a')
    ax.grid(True, alpha=0.1)
    ax.tick_params(colors='white')
    
    plt.show()

    # Print Summary Table
    print(f"\n{'='*60}")
    print(f" PORTFOLIO SUMMARY | EQUITY: ${engine.equity:.2f} | BALANCE: ${engine.balance:.2f}")
    print(f"{'='*60}")
    
    # Open Positions
    open_p = [t for t in engine.trades if t["status"] == "OPEN"]
    if open_p:
        print("\nACTIVE RISK:")
        pdf = pd.DataFrame(open_p)[["symbol", "type", "entry_price", "size", "pnl"]]
        print(pdf.to_string(index=False))
    else:
        print("\nNO ACTIVE EXPOSURE")

    # Logs
    print(f"\n{'='*60}")
    print("LIVE TERMINAL LOGS:")
    for l in engine.logs[-5:]:
        print(l)
    print(f"{'='*60}\n")

if __name__ == "__main__":
    print("Initializing Simulation Engine...")
    start_simulation()
