"""
Generates ml/model_comparison.ipynb with markdown narrative, formulas,
feature engineering code, TimeSeriesSplit cross-validation, and empirical results.
"""
import json

notebook = {
    "cells": [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "# 📈 Stock Price Prediction & Model Comparison Benchmark\n",
                "### Comparing Naive Baseline vs. Linear Regression vs. Random Forest\n",
                "\n",
                "**Author / Project**: Stock Prophet AI System  \n",
                "**Key Machine Learning Concepts**:\n",
                "- **Naive Baseline (Persistence Model)**: $P_{t} = P_{t-1}$\n",
                "- **Feature Engineering**: Lagged prices ($t-1, t-2, t-3, t-5, t-10, t-20$), rolling moving averages (MA-5, MA-20), returns, rolling volatility\n",
                "- **Models Evaluated**: Naive Baseline, Linear Regression (OLS), Random Forest Regressor (`RandomForestRegressor`)\n",
                "- **Validation Strategy**: `sklearn.model_selection.TimeSeriesSplit` (5-fold forward-chaining cross-validation) to prevent data leakage and lookahead bias\n",
                "- **Evaluation Metrics**: Out-of-sample Root Mean Squared Error (RMSE) and Mean Absolute Error (MAE)\n"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 1. Setup & Imports"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": 1,
            "metadata": {},
            "outputs": [],
            "source": [
                "import json\n",
                "import urllib.request\n",
                "from datetime import datetime\n",
                "import numpy as np\n",
                "import pandas as pd\n",
                "from sklearn.linear_model import LinearRegression\n",
                "from sklearn.ensemble import RandomForestRegressor\n",
                "from sklearn.model_selection import TimeSeriesSplit\n",
                "from sklearn.metrics import mean_squared_error, mean_absolute_error\n",
                "\n",
                "# Visualization settings\n",
                "pd.set_option('display.max_columns', None)\n",
                "print('All dependencies successfully imported.')"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 2. Data Ingestion\n",
                "We pull 5 years of daily historical data directly from the public Yahoo Finance API without requiring external keys."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": 2,
            "metadata": {},
            "outputs": [],
            "source": [
                "def fetch_stock_history(ticker: str, range_str: str = '5y'):\n",
                "    url = f'https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range={range_str}&interval=1d&includePrePost=false'\n",
                "    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (compatible; StockPredictor/1.0)'})\n",
                "    with urllib.request.urlopen(req, timeout=15) as resp:\n",
                "        data = json.loads(resp.read().decode())\n",
                "    res = data['chart']['result'][0]\n",
                "    timestamps = res['timestamp']\n",
                "    closes = res['indicators']['quote'][0]['close']\n",
                "    currency = res['meta'].get('currency', 'USD')\n",
                "    \n",
                "    records = []\n",
                "    for ts, c in zip(timestamps, closes):\n",
                "        if c is not None and np.isfinite(c):\n",
                "            dt = datetime.utcfromtimestamp(ts).strftime('%Y-%m-%d')\n",
                "            records.append({'date': dt, 'close': float(c)})\n",
                "    df = pd.DataFrame(records)\n",
                "    df['date'] = pd.to_datetime(df['date'])\n",
                "    df = df.sort_values('date').reset_index(drop=True)\n",
                "    return df, currency\n",
                "\n",
                "df_aapl, currency = fetch_stock_history('AAPL', '5y')\n",
                "print(f'Fetched {len(df_aapl)} trading days for AAPL ({currency})')\n",
                "df_aapl.head()"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 3. Feature Engineering for Time-Series\n",
                "Stock prices exhibit non-stationarity and strong temporal autocorrelation. To prepare tabular features for machine learning models:\n",
                "1. **Lagged Features**: Historical closing prices from $t-1, t-2, t-3, t-5, t-10, t-20$.\n",
                "2. **Moving Averages**: 5-day short term and 20-day medium term trends.\n",
                "3. **Return Volatility**: 5-day standard deviation of daily percentage returns.\n",
                "4. **Supervised Target**: Next trading day's close price $P_{t+1}$."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": 3,
            "metadata": {},
            "outputs": [],
            "source": [
                "def engineer_features(df: pd.DataFrame, lags=(1, 2, 3, 5, 10, 20)):\n",
                "    df = df.copy()\n",
                "    for lag in lags:\n",
                "        df[f'lag_{lag}'] = df['close'].shift(lag)\n",
                "    df['ma_5'] = df['close'].rolling(5).mean()\n",
                "    df['ma_20'] = df['close'].rolling(20).mean()\n",
                "    df['return_1d'] = df['close'].pct_change(1)\n",
                "    df['volatility_5d'] = df['return_1d'].rolling(5).std()\n",
                "    # Target: Next day's price\n",
                "    df['target'] = df['close'].shift(-1)\n",
                "    return df.dropna().reset_index(drop=True)\n",
                "\n",
                "feat_df = engineer_features(df_aapl)\n",
                "print(f'Feature matrix dimensions: {feat_df.shape}')\n",
                "feat_df.head(3)"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 4. TimeSeriesSplit Validation Strategy\n",
                "> **Why Standard K-Fold Fails**: In temporal sequences, random shuffling shuffles future data into training sets (data leakage / lookahead bias), artificially inflating metrics.\n",
                "> **TimeSeriesSplit Solution**: Uses an expanding train window with strictly forward test folds:\n",
                "```\n",
                "Fold 1: [Train: Fold 0] -> [Test: Fold 1]\n",
                "Fold 2: [Train: Fold 0, 1] -> [Test: Fold 2]\n",
                "Fold 3: [Train: Fold 0, 1, 2] -> [Test: Fold 3]\n",
                "...\n",
                "```"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": 4,
            "metadata": {},
            "outputs": [],
            "source": [
                "feature_cols = [c for c in feat_df.columns if c not in ['date', 'target']]\n",
                "X = feat_df[feature_cols].values\n",
                "y = feat_df['target'].values\n",
                "current_prices = feat_df['close'].values\n",
                "\n",
                "tscv = TimeSeriesSplit(n_splits=5)\n",
                "\n",
                "results = {\n",
                "    'Naive Baseline': {'rmse': [], 'mae': []},\n",
                "    'Linear Regression': {'rmse': [], 'mae': []},\n",
                "    'Random Forest': {'rmse': [], 'mae': []},\n",
                "}\n",
                "\n",
                "for fold, (train_idx, test_idx) in enumerate(tscv.split(X)):\n",
                "    X_train, y_train = X[train_idx], y[train_idx]\n",
                "    X_test, y_test = X[test_idx], y[test_idx]\n",
                "    y_naive = current_prices[test_idx]  # Naive forecast: today's price\n",
                "    \n",
                "    # 1. Naive Baseline Evaluation\n",
                "    results['Naive Baseline']['rmse'].append(np.sqrt(mean_squared_error(y_test, y_naive)))\n",
                "    results['Naive Baseline']['mae'].append(mean_absolute_error(y_test, y_naive))\n",
                "    \n",
                "    # 2. Linear Regression (with features)\n",
                "    lr = LinearRegression().fit(X_train, y_train)\n",
                "    lr_pred = lr.predict(X_test)\n",
                "    results['Linear Regression']['rmse'].append(np.sqrt(mean_squared_error(y_test, lr_pred)))\n",
                "    results['Linear Regression']['mae'].append(mean_absolute_error(y_test, lr_pred))\n",
                "    \n",
                "    # 3. Random Forest (with features)\n",
                "    rf = RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42, n_jobs=-1)\n",
                "    rf.fit(X_train, y_train)\n",
                "    rf_pred = rf.predict(X_test)\n",
                "    results['Random Forest']['rmse'].append(np.sqrt(mean_squared_error(y_test, rf_pred)))\n",
                "    results['Random Forest']['mae'].append(mean_absolute_error(y_test, rf_pred))\n",
                "\n",
                "summary = pd.DataFrame({\n",
                "    'Model': ['Naive Baseline (P_t = P_{t-1})', 'Linear Regression (Lagged)', 'Random Forest (Lagged)'],\n",
                "    'Mean RMSE': [\n",
                "        np.mean(results['Naive Baseline']['rmse']),\n",
                "        np.mean(results['Linear Regression']['rmse']),\n",
                "        np.mean(results['Random Forest']['rmse']),\n",
                "    ],\n",
                "    'Mean MAE': [\n",
                "        np.mean(results['Naive Baseline']['mae']),\n",
                "        np.mean(results['Linear Regression']['mae']),\n",
                "        np.mean(results['Random Forest']['mae']),\n",
                "    ]\n",
                "})\n",
                "summary"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 5. Multi-Ticker Empirical Benchmark (5 Years)\n",
                "Below we benchmark 4 distinct tickers (`AAPL`, `MSFT`, `RELIANCE.NS`, `GOOGL`) across both:\n",
                "1. **80/20 Out-of-Sample Holdout Split** (matching the web client linear trend vs persistence)\n",
                "2. **5-Fold TimeSeriesSplit Cross-Validation** (testing feature-engineered models)"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": 5,
            "metadata": {},
            "outputs": [],
            "source": [
                "# Load benchmark results computed across all 4 tickers\n",
                "with open('benchmark_results.json', 'r') as f:\n",
                "    bench_data = json.load(f)\n",
                "\n",
                "rows = []\n",
                "for item in bench_data:\n",
                "    h = item['holdout']\n",
                "    cv = item['tscv_5fold']\n",
                "    rows.append({\n",
                "        'Ticker': item['ticker'],\n",
                "        'Currency': item['currency'],\n",
                "        'Holdout Naive RMSE': round(h['naive_rmse'], 2),\n",
                "        'Holdout Naive MAE': round(h['naive_mae'], 2),\n",
                "        'Holdout LinReg RMSE': round(h['trend_rmse'], 2),\n",
                "        'Holdout LinReg MAE': round(h['trend_mae'], 2),\n",
                "        'CV Naive RMSE': round(cv['naive_rmse_mean'], 2),\n",
                "        'CV LinReg RMSE': round(cv['lr_rmse_mean'], 2),\n",
                "        'CV RF RMSE': round(cv['rf_rmse_mean'], 2),\n",
                "    })\n",
                "\n",
                "benchmark_df = pd.DataFrame(rows)\n",
                "benchmark_df"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 6. Key ML Takeaways & Honest Model Analysis\n",
                "\n",
                "### 1. Why does the Naive Baseline ($P_t = P_{t-1}$) win?\n",
                "- Daily equity prices closely follow a **Martingale / Random Walk**: $E[P_{t+1} | \\mathcal{F}_t] \\approx P_t$.\n",
                "- Daily innovation $\\epsilon_t = P_{t+1} - P_t$ is driven by unpredictable news and order flow.\n",
                "- An unconstrained linear trend line ($y = a + bt$) trained on an early market regime fails to adapt when macro shifts or volatility spikes occur, causing out-of-sample error to compound.\n",
                "\n",
                "### 2. Why does Random Forest exhibit higher RMSE on raw prices?\n",
                "- **Tree Extrapolation Failure**: Decision trees and random forests partition feature space with orthogonal step functions. When a stock enters an all-time high regime during test folds, a random forest **cannot extrapolate** beyond the maximum target value seen in training, predicting the ceiling of the training split.\n",
                "- **Solution**: To deploy tree models in finance, one must train on **differenced stationarized targets** (e.g. logarithmic returns $\\log(P_t / P_{t-1})$) rather than raw price levels.\n",
                "\n",
                "### 3. Interview & Resume Value\n",
                "- Showing this side-by-side comparison demonstrates **real machine learning literacy**: understanding baseline benchmarks, time-series stationarity, and the hazards of data leakage."
            ]
        }
    ],
    "metadata": {
        "kernelspec": {
            "display_name": "Python 3",
            "language": "python",
            "name": "python3"
        },
        "language_info": {
            "name": "python",
            "version": "3.11.4"
        }
    },
    "nbformat": 4,
    "nbformat_minor": 5
}

with open("ml/model_comparison.ipynb", "w", encoding="utf-8") as f:
    json.dump(notebook, f, indent=2)

print("Generated ml/model_comparison.ipynb")
