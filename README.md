# 📈 Stock Prophet — AI Stock Price Prediction System

> Fetch live stock data, visualise moving averages, and forecast future prices using linear regression benchmarked against a naive persistence model — all client-side in the browser, plus a Python ML benchmarking suite.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vitest](https://img.shields.io/badge/Tests-12%20Passing-brightgreen?logo=vitest&logoColor=white)](package.json)
[![scikit-learn](https://img.shields.io/badge/ML-scikit--learn%20%7C%20TimeSeriesSplit-orange?logo=scikit-learn&logoColor=white)](ml/)
[![TanStack Start](https://img.shields.io/badge/TanStack_Start-1.x-FF4154?logo=reactquery&logoColor=white)](https://tanstack.com/start)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Cloudflare Workers](https://img.shields.io/badge/Deployed_on-Cloudflare_Workers-F6821F?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)

---

## ✨ Features

- **Live ticker lookup** — Pulls historical daily closes directly from Yahoo Finance (no API key needed)
- **CSV upload** — Import your own price history; supports Yahoo Finance exports and any generic CSV with a date + price column
- **Moving averages** — Plots MA-50 and MA-100 overlays on the price chart in $O(n)$ sliding window time
- **Linear regression forecast** — Ordinary-least-squares trend line extrapolated $N$ trading days into the future (weekends skipped automatically)
- **Naive baseline benchmark** — Side-by-side comparison against a persistence baseline ($P_t = P_{t-1}$) to evaluate whether parametric trend models outperform a random walk
- **Error metrics** — Out-of-sample RMSE and MAE computed on a strict 80/20 train/test split
- **Scale-invariant trend detection** — Classifies trend as ↑ Up, ↓ Down, or → Flat using percentage change per day ($b / \text{Price} \times 100$), ensuring consistent behavior across $5 vs $500 stocks
- **Comprehensive unit tests** — 12 automated Vitest unit tests verifying moving averages, closed-form regression slopes, test metric calculations, and scale invariance
- **Python ML comparison suite** — Python module & Jupyter notebook evaluating Linear Regression vs. Random Forest vs. Naive Baseline using lagged features and `TimeSeriesSplit` cross-validation
- **Multiple time ranges** — 1 year, 2 years, 5 years, 10 years, or max available history
- **Adjustable forecast horizon** — Interactive slider from 1 day to custom trading day horizons
- **Chart export** — Download the rendered chart as an image or export tabular forecasts as CSV

---

## 📊 Empirical Results (5-Year Benchmark)

To establish honest model performance, we benchmarked 4 major equities over 5 years of daily historical data on an 80/20 out-of-sample holdout split (last 20% held out as test data):

| Ticker          | Asset Name          | Currency | Naive Baseline RMSE ($P_t = P_{t-1}$) | Naive Baseline MAE | Linear Trend RMSE (OLS) | Linear Trend MAE | Split (Train / Test)   |
| --------------- | ------------------- | -------- | ------------------------------------- | ------------------ | ----------------------- | ---------------- | ---------------------- |
| **AAPL**        | Apple Inc.          | USD      | **$4.50**                             | **$3.16**          | $48.03                  | $42.91           | 1,003 train / 251 test |
| **MSFT**        | Microsoft Corp.     | USD      | **$8.85**                             | **$6.13**          | $79.84                  | $65.97           | 1,003 train / 251 test |
| **RELIANCE.NS** | Reliance Industries | INR      | **₹18.11**                            | **₹13.48**         | ₹142.49                 | ₹122.01          | 992 train / 249 test   |
| **GOOGL**       | Alphabet Inc.       | USD      | **$6.58**                             | **$4.74**          | $134.90                 | $130.86          | 1,003 train / 251 test |

### 💡 Why Compare Against a Naive Baseline?

In financial econometrics, asset prices closely approximate a **martingale / random walk** ($E[P_t \mid \mathcal{F}_{t-1}] = P_{t-1}$). A naive persistence model predicts tomorrow's price using today's price. When evaluated on 1-step ahead out-of-sample data, the naive baseline produces an MAE of **$3.16 on AAPL** and **$6.13 on MSFT**, comfortably outperforming a static linear trend extrapolation ($42.91 and $65.97 respectively).

Reporting an honest comparison against a naive baseline demonstrates ML literacy: showing model limitations, avoiding deceptive metrics, and acknowledging financial regime shifts.

---

## 🛠️ Tech Stack

| Layer                     | Technology                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| Framework                 | [TanStack Start](https://tanstack.com/start) (SSR / full-stack React)                           |
| UI Library                | [React 19](https://react.dev/)                                                                  |
| Routing                   | [TanStack Router](https://tanstack.com/router)                                                  |
| Styling                   | [Tailwind CSS v4](https://tailwindcss.com/)                                                     |
| Component Library         | [shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives)                                       |
| Charting                  | [Recharts](https://recharts.org/)                                                               |
| Unit Testing              | [Vitest](https://vitest.dev/) (12 passing tests)                                                |
| Machine Learning          | [scikit-learn](https://scikit-learn.org/) (Linear Regression, Random Forest, `TimeSeriesSplit`) |
| Build Tool                | [Vite 7](https://vitejs.dev/)                                                                   |
| Runtime / Package Manager | [Bun](https://bun.sh/) / Node.js & npm                                                          |
| Deployment                | [Cloudflare Workers](https://workers.cloudflare.com/) via Wrangler                              |
| Data Source               | Yahoo Finance public chart API                                                                  |

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) ≥ 1.0 or [Node.js](https://nodejs.org/) ≥ 20 with npm
- [Python](https://www.python.org/) ≥ 3.10 (optional, for the Python ML benchmark suite)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/LithkeshBalajiB/Stock-Prophet-AI-Stock-Price-Prediction-System.git
cd Stock-Prophet-AI-Stock-Price-Prediction-System

# 2. Install web dependencies
bun install
# or: npm install

# 3. Start development server
bun run dev
# or: npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Unit Testing

Run unit tests via Vitest:

```bash
npm test
# or: bun run test
```

Unit test coverage in [`src/lib/stock-analysis.test.ts`](src/lib/stock-analysis.test.ts):

- **`movingAverage`**: Sliding window sum correctness, null-padding for initial intervals, window size edge cases.
- **`linearRegression`**: Verified closed-form slope & intercept recovery on exact lines ($y = 2 + 3t$, descending lines, flat series, and empty inputs).
- **`rmse` & `mae`**: Validated against benchmark test cases (e.g. 4-day residuals producing exact MAE 1.75 and RMSE $\approx$ 2.29).
- **`analyze` & Trend Classification**: Validated side-by-side baseline metrics and scale-invariant daily percentage drift ($5 vs. $500 assets).

---

## 🔬 Python ML Benchmark Suite

Located in the [`ml/`](ml/) directory:

- [`compare_models.py`](ml/compare_models.py) — Multi-ticker evaluation comparing Naive Baseline vs. Linear Regression vs. Random Forest.
- [`model_comparison.ipynb`](ml/model_comparison.ipynb) — Interactive Jupyter Notebook with time-series feature engineering (lags, rolling volatility) and 5-fold `TimeSeriesSplit` cross-validation.
- [`benchmark_results.json`](ml/benchmark_results.json) — Stored empirical benchmark numbers.

To run:

```bash
pip install -r ml/requirements.txt
python ml/compare_models.py
```

---

## 📊 How the Prediction Works

1. **Data ingestion** — Historical daily closing prices are fetched from Yahoo Finance (server-side to avoid CORS) or parsed from an uploaded CSV file.

2. **Moving averages** — MA-50 and MA-100 are computed with a sliding-window sum in $O(n)$ time and plotted as overlays.

3. **Linear regression** — An ordinary-least-squares fit ($y = a + b \cdot t$) is trained on the first 80% of available trading days. The normalized slope ($b / \text{latestClose} \times 100$) classifies trend drift rate (% per day).

4. **Forecast** — The regression line is extrapolated forward for the requested number of trading days. Saturdays and Sundays are skipped when generating future dates.

5. **Error metrics & Baseline Comparison** — Out-of-sample RMSE and MAE are calculated on the held-out 20% test set for both the linear trend model and the naive persistence baseline ($P_t = P_{t-1}$).

---

## 📥 CSV Format

Stock Prophet accepts any CSV with at minimum a **date column** and a **price column**.

**Supported date column names** (case-insensitive): `date`, `timestamp`, `time`, `datetime`

**Supported price column names** (case-insensitive, in priority order): `adj close`, `adjusted close`, `close`, `price`, `last`, `value`

**Yahoo Finance export** is supported out of the box. Download via _Yahoo Finance → Historical Data → Download_.

```csv
Date,Open,High,Low,Close,Adj Close,Volume
2020-01-02,296.24,300.60,295.19,300.35,298.82,33870100
2020-01-03,297.15,300.58,296.50,297.43,295.91,36580700
...
```

> **Note:** At least **110 trading days** of history are required to compute both MA-50 and MA-100.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature-name`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feat/your-feature-name`
5. Open a Pull Request

### Code Style

This project uses **ESLint** + **Prettier**. Run checks before committing:

```bash
npm run lint       # ESLint
npm run format     # Prettier (auto-fix)
npm test           # Vitest unit tests
```

---

## ⚠️ Disclaimer

Stock Prophet is an **educational demo**. The linear regression model is a baseline statistical tool and should **not** be used as financial advice or for real trading decisions. Past price trends do not guarantee future performance.
