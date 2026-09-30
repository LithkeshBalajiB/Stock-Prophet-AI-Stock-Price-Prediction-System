"""
Model Comparison: Baseline vs Linear Regression vs Random Forest
================================================================
This script evaluates three models on 5 years of daily stock prices:
1. Naive Baseline (Persistence: P_t = P_{t-1})
2. Linear Regression (Trend & Lagged Features)
3. Random Forest Regressor (with Lagged Features & Technical Indicators)

Validation Strategy:
- Out-of-sample 80/20 Holdout Split (same as client-side web application)
- Purged / Expanding TimeSeriesSplit (5 folds) via scikit-learn to prevent lookahead bias / data leakage
"""

import json
import urllib.request
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error
from sklearn.model_selection import TimeSeriesSplit

TICKERS = ["AAPL", "MSFT", "RELIANCE.NS", "GOOGL"]

def fetch_yahoo_history(ticker: str, range_str: str = "5y"):
    """Fetch daily close prices from Yahoo Finance chart API."""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range={range_str}&interval=1d&includePrePost=false"
    headers = {"User-Agent": "Mozilla/5.0 (compatible; StockPredictor/1.0)"}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
        res = data["chart"]["result"][0]
        timestamps = res["timestamp"]
        closes = res["indicators"]["quote"][0]["close"]
        currency = res["meta"].get("currency", "USD")
        
        records = []
        for ts, c in zip(timestamps, closes):
            if c is not None and np.isfinite(c):
                dt = datetime.utcfromtimestamp(ts).strftime("%Y-%m-%d")
                records.append({"date": dt, "close": float(c)})
        df = pd.DataFrame(records)
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values("date").reset_index(drop=True)
        return df, currency
    except Exception as e:
        print(f"Error fetching {ticker}: {e}")
        return None, "USD"

def create_features(df: pd.DataFrame, lags=(1, 2, 3, 5, 10, 20)):
    """Engineers time-series features (lagged prices, rolling averages, return volatility)."""
    df = df.copy()
    for lag in lags:
        df[f"lag_{lag}"] = df["close"].shift(lag)
    
    df["ma_5"] = df["close"].rolling(5).mean()
    df["ma_20"] = df["close"].rolling(20).mean()
    df["return_1d"] = df["close"].pct_change(1)
    df["volatility_5d"] = df["return_1d"].rolling(5).std()
    
    # Target: Next day's price (P_{t+1})
    df["target"] = df["close"].shift(-1)
    
    # Drop rows with NaN from rolling / lagging and the last row (target is NaN)
    df_clean = df.dropna().reset_index(drop=True)
    return df_clean

def evaluate_ticker(ticker: str):
    print(f"\n================ Evaluating {ticker} (5y) ================")
    df_raw, currency = fetch_yahoo_history(ticker, "5y")
    if df_raw is None or len(df_raw) < 100:
        print(f"Insufficient data for {ticker}")
        return None
    
    closes = df_raw["close"].values
    n = len(closes)
    cutoff = int(n * 0.8)
    
    # ----------------------------------------------------
    # 1. Client-Side Equivalent OLS vs Naive on 80/20 split
    # ----------------------------------------------------
    # OLS on day index: y = a + b * t
    train_closes = closes[:cutoff]
    test_actual = closes[cutoff:]
    
    t_train = np.arange(cutoff)
    reg = LinearRegression().fit(t_train.reshape(-1, 1), train_closes)
    t_test = np.arange(cutoff, n)
    linear_trend_pred = reg.predict(t_test.reshape(-1, 1))
    
    # Naive Baseline: today's price predicts tomorrow's price (y_hat_t = y_{t-1})
    # For testActual[0] (day cutoff), yesterday is closes[cutoff - 1]
    # For testActual[i], yesterday is closes[cutoff - 1 + i]
    naive_pred = closes[cutoff - 1 : n - 1]
    
    trend_rmse = np.sqrt(mean_squared_error(test_actual, linear_trend_pred))
    trend_mae = mean_absolute_error(test_actual, linear_trend_pred)
    
    naive_rmse = np.sqrt(mean_squared_error(test_actual, naive_pred))
    naive_mae = mean_absolute_error(test_actual, naive_pred)
    
    print(f"Holdout Test Size: {len(test_actual)} days ({len(train_closes)} train)")
    print(f"Naive Baseline (P_t = P_t-1) -> RMSE: {naive_rmse:.3f} {currency}, MAE: {naive_mae:.3f} {currency}")
    print(f"Linear Trend (OLS y=a+bt)    -> RMSE: {trend_rmse:.3f} {currency}, MAE: {trend_mae:.3f} {currency}")
    
    # ----------------------------------------------------
    # 2. Advanced Feature-Engineered ML with TimeSeriesSplit
    # ----------------------------------------------------
    feat_df = create_features(df_raw)
    feature_cols = [c for c in feat_df.columns if c not in ["date", "target"]]
    X = feat_df[feature_cols].values
    y = feat_df["target"].values
    
    # Naive baseline on feature dataset: target is next day, so naive baseline predicts current day close
    # Current day close is at feat_df['close']
    current_closes = feat_df["close"].values
    
    tscv = TimeSeriesSplit(n_splits=5)
    
    fold_results = {
        "naive_rmse": [], "naive_mae": [],
        "lr_rmse": [], "lr_mae": [],
        "rf_rmse": [], "rf_mae": []
    }
    
    for fold, (train_idx, test_idx) in enumerate(tscv.split(X)):
        X_tr, y_tr = X[train_idx], y[train_idx]
        X_te, y_te = X[test_idx], y[test_idx]
        current_te = current_closes[test_idx]
        
        # Naive baseline on test fold
        naive_fold_rmse = np.sqrt(mean_squared_error(y_te, current_te))
        naive_fold_mae = mean_absolute_error(y_te, current_te)
        
        # Linear Regression with features
        lr = LinearRegression()
        lr.fit(X_tr, y_tr)
        lr_pred = lr.predict(X_te)
        lr_fold_rmse = np.sqrt(mean_squared_error(y_te, lr_pred))
        lr_fold_mae = mean_absolute_error(y_te, lr_pred)
        
        # Random Forest with features
        rf = RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42, n_jobs=-1)
        rf.fit(X_tr, y_tr)
        rf_pred = rf.predict(X_te)
        rf_fold_rmse = np.sqrt(mean_squared_error(y_te, rf_pred))
        rf_fold_mae = mean_absolute_error(y_te, rf_pred)
        
        fold_results["naive_rmse"].append(naive_fold_rmse)
        fold_results["naive_mae"].append(naive_fold_mae)
        fold_results["lr_rmse"].append(lr_fold_rmse)
        fold_results["lr_mae"].append(lr_fold_mae)
        fold_results["rf_rmse"].append(rf_fold_rmse)
        fold_results["rf_mae"].append(rf_fold_mae)
    
    cv_summary = {
        "naive_rmse_mean": np.mean(fold_results["naive_rmse"]),
        "naive_mae_mean": np.mean(fold_results["naive_mae"]),
        "lr_rmse_mean": np.mean(fold_results["lr_rmse"]),
        "lr_mae_mean": np.mean(fold_results["lr_mae"]),
        "rf_rmse_mean": np.mean(fold_results["rf_rmse"]),
        "rf_mae_mean": np.mean(fold_results["rf_mae"]),
    }
    
    print("\nTimeSeriesSplit (5-fold Cross-Validation) Averages:")
    print(f"  Naive Baseline: RMSE = {cv_summary['naive_rmse_mean']:.3f}, MAE = {cv_summary['naive_mae_mean']:.3f}")
    print(f"  Linear Reg (Lagged Feats): RMSE = {cv_summary['lr_rmse_mean']:.3f}, MAE = {cv_summary['lr_mae_mean']:.3f}")
    print(f"  Random Forest (Lagged Feats): RMSE = {cv_summary['rf_rmse_mean']:.3f}, MAE = {cv_summary['rf_mae_mean']:.3f}")
    
    return {
        "ticker": ticker,
        "currency": currency,
        "total_days": n,
        "holdout": {
            "test_days": len(test_actual),
            "naive_rmse": naive_rmse,
            "naive_mae": naive_mae,
            "trend_rmse": trend_rmse,
            "trend_mae": trend_mae,
        },
        "tscv_5fold": cv_summary,
    }

if __name__ == "__main__":
    all_results = []
    for ticker in TICKERS:
        res = evaluate_ticker(ticker)
        if res:
            all_results.append(res)
    
    print("\n================ FINAL SUMMARY TABLE (80/20 Out-of-Sample Holdout) ================")
    print(f"{'Ticker':<12} | {'Currency':<8} | {'Naive RMSE':<12} | {'Naive MAE':<12} | {'Trend RMSE':<12} | {'Trend MAE':<12}")
    print("-" * 80)
    for r in all_results:
        h = r["holdout"]
        print(f"{r['ticker']:<12} | {r['currency']:<8} | {h['naive_rmse']:<12.2f} | {h['naive_mae']:<12.2f} | {h['trend_rmse']:<12.2f} | {h['trend_mae']:<12.2f}")
    
    with open("ml/benchmark_results.json", "w") as f:
        json.dump(all_results, f, indent=2)
    print("\nSaved benchmark results to ml/benchmark_results.json")
