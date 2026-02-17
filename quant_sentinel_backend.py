
"""
QuantSentinel Python Backend
Deploy on Google Colab or Local Server
Required: pip install fastapi uvicorn pandas numpy pydantic
"""

import time
import uuid
import random
import pandas as pd
import numpy as np
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="QuantSentinel Remote Node")

# Enable CORS for the React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ENGINE STATE ---
class EngineState:
    balance = 500.0
    equity = 500.0
    trades = []
    watchlist = {
        "BTCUSDT": {"price": 66000.0, "history": []},
        "ETHUSDT": {"price": 3300.0, "history": []}
    }
    kelly_fraction = 0.15

state = EngineState()

# --- MODELS ---
class Trade(BaseModel):
    id: str
    symbol: str
    side: str
    entry_price: float
    size: float
    status: str
    pnl: float
    timestamp: float

class Signal(BaseModel):
    id: str
    symbol: str
    signal: str
    prob: float
    explanation: str
    position_size: float

# --- LOGIC ---
def get_consensus_signal(symbol: str):
    # Simulated Price Update
    change = (random.random() - 0.5) * 0.005
    state.watchlist[symbol]["price"] *= (1 + change)
    hist = state.watchlist[symbol]["history"]
    hist.append(state.watchlist[symbol]["price"])
    if len(hist) > 50: hist.pop(0)

    # MA Crossover
    df = pd.Series(hist)
    ma5 = df.rolling(5).mean().iloc[-1] if len(df) >= 5 else 0
    ma20 = df.rolling(20).mean().iloc[-1] if len(df) >= 20 else 0
    
    tech_signal = "HOLD"
    if ma5 > ma20: tech_signal = "BUY"
    elif ma5 < ma20: tech_signal = "SELL"

    # Bayesian Prob (Simulated return analysis)
    prob = 0.5 + (random.random() - 0.5) * 0.2
    bayes_signal = "BUY" if prob > 0.55 else "SELL" if prob < 0.45 else "HOLD"

    # Consensus
    final_signal = tech_signal if tech_signal == bayes_signal else "HOLD"
    
    # Kelly Sizing
    edge = abs(prob - 0.5)
    size = state.balance * state.kelly_fraction * (edge / 0.5) if final_signal != "HOLD" else 0

    return Signal(
        id=str(uuid.uuid4())[:8],
        symbol=symbol,
        signal=final_signal,
        prob=prob,
        explanation=f"Ensemble Consensus: Tech(MA) matched Bayes({prob:.2f}).",
        position_size=size
    )

# --- ENDPOINTS ---
@app.get("/balance")
def get_balance():
    # Update equity based on open trades
    unrealized = 0
    for trade in state.trades:
        if trade["status"] == "OPEN":
            current_price = state.watchlist[trade["symbol"]]["price"]
            multiplier = 1 if trade["side"] == "BUY" else -1
            trade["pnl"] = (current_price - trade["entry_price"]) / trade["entry_price"] * trade["size"] * multiplier
            unrealized += trade["pnl"]
    
    state.equity = state.balance + unrealized
    return {"balance": state.balance, "equity": state.equity}

@app.get("/signals", response_model=List[Signal])
def get_signals():
    signals = []
    for symbol in state.watchlist:
        sig = get_consensus_signal(symbol)
        if sig.signal != "HOLD":
            signals.append(sig)
    return signals

@app.get("/trades")
def get_trades():
    return state.trades

@app.post("/deposit")
def deposit(amount: float):
    if amount <= 0: raise HTTPException(status_code=400)
    state.balance += amount
    state.equity += amount
    return {"status": "success", "new_balance": state.balance}

@app.post("/trade")
def place_trade(symbol: str, side: str, size: float):
    if size > state.balance: raise HTTPException(status_code=400, detail="Insufficient Balance")
    
    trade = {
        "id": str(uuid.uuid4())[:8],
        "symbol": symbol,
        "side": side,
        "entry_price": state.watchlist[symbol]["price"],
        "size": size,
        "status": "OPEN",
        "pnl": 0.0,
        "timestamp": time.time()
    }
    state.trades.append(trade)
    state.balance -= size
    return {"status": "executed", "trade": trade}

if __name__ == "__main__":
    import uvicorn
    # In Colab, you might use 'pytunnel' or just hit the public URL uvicorn provides
    print("🚀 Starting QuantSentinel Remote Node...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
