# 🧪 Machine Learning Benchmark Suite

This directory contains the Python machine learning benchmark suite comparing statistical and ML models against a naive persistence baseline on financial time-series data.

## 📊 Models Compared

1. **Naive Baseline (Persistence Model)**:
   - Prediction: Tomorrow's price equals today's price ($P_{t} = P_{t-1}$).
   - Represents the theoretical random walk benchmark in financial econometrics.
2. **Linear Regression (Trend & Lagged Features)**:
   - Evaluated as both parametric trend line extrapolation ($y = a + b \cdot t$) and multivariate regression on lagged prices ($t-1, \dots, t-20$).
3. **Random Forest Regressor**:
   - Ensemble of 100 decision trees trained with lagged price features and rolling indicators.

## 🛡️ Validation Methodology

- **Avoid Lookahead Bias / Data Leakage**: Standard k-fold cross-validation with random shuffling breaks the temporal ordering of time-series, leaking future data into past splits.
- **`sklearn.model_selection.TimeSeriesSplit`**: Employs a forward-chaining, rolling/expanding train window over 5 folds to evaluate out-of-sample predictive power.

## 🏃 Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the automated multi-ticker benchmark
python compare_models.py

# 3. Launch the interactive Jupyter notebook
jupyter notebook model_comparison.ipynb
```

## 📈 Empirical Results Summary (5-Year History)

| Ticker          | Currency | Holdout Naive RMSE | Holdout Naive MAE | Holdout Trend RMSE | Holdout Trend MAE |
| --------------- | -------- | ------------------ | ----------------- | ------------------ | ----------------- |
| **AAPL**        | USD      | **$4.50**          | **$3.16**         | $48.03             | $42.91            |
| **MSFT**        | USD      | **$8.85**          | **$6.13**         | $79.84             | $65.97            |
| **RELIANCE.NS** | INR      | **₹18.11**         | **₹13.48**        | ₹142.49            | ₹122.01           |
| **GOOGL**       | USD      | **$6.58**          | **$4.74**         | $134.90            | $130.86           |
