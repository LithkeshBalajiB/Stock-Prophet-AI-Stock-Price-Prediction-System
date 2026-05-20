# 📈 Stock Prophet — AI Stock Price Prediction System

> Fetch live stock data, visualise moving averages, and forecast future prices using linear regression — all in the browser, no API key required.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TanStack Start](https://img.shields.io/badge/TanStack_Start-1.x-FF4154?logo=reactquery&logoColor=white)](https://tanstack.com/start)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Cloudflare Workers](https://img.shields.io/badge/Deployed_on-Cloudflare_Workers-F6821F?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)

---

## ✨ Features

- **Live ticker lookup** — Pulls historical daily closes directly from Yahoo Finance (no API key needed)
- **CSV upload** — Import your own price history; supports Yahoo Finance exports and any generic CSV with a date + price column
- **Moving averages** — Plots MA-50 and MA-100 overlays on the price chart
- **Linear regression forecast** — Ordinary-least-squares trend line extrapolated N trading days into the future (weekends skipped automatically)
- **Error metrics** — RMSE and MAE computed on an 80/20 train-test split
- **Trend detection** — Automatically classifies the trend as ↑ Up, ↓ Down, or → Flat based on the regression slope
- **Multiple time ranges** — 1 year, 2 years, 5 years, 10 years, or max available history
- **Adjustable forecast horizon** — Slide from 1 day to any number of future trading days
- **Chart export** — Download the rendered chart as an image
- **Fully client-side analysis** — All computation (MA, regression, metrics) runs in the browser; no backend ML server required


---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (SSR / full-stack React) |
| UI Library | [React 19](https://react.dev/) |
| Routing | [TanStack Router](https://tanstack.com/router) |
| Server Functions | TanStack Start `createServerFn` |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| Component Library | [shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives) |
| Charting | [Recharts](https://recharts.org/) |
| Build Tool | [Vite 7](https://vitejs.dev/) |
| Runtime / Package Manager | [Bun](https://bun.sh/) |
| Deployment | [Cloudflare Workers](https://workers.cloudflare.com/) via Wrangler |
| Validation | [Zod](https://zod.dev/) |
| Data Source | Yahoo Finance public chart API |

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) ≥ 1.0 (or Node.js ≥ 20 with npm)
- Git

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/LithkeshBalajiB/Stock-Prophet-AI-Stock-Price-Prediction-System.git
cd Stock-Prophet-AI-Stock-Price-Prediction-System

# 2. Install dependencies
bun install

# 3. Start the development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
bun run build
bun run preview     # preview the production build locally
```

---

## ☁️ Deployment (Cloudflare Workers)

This project is pre-configured for Cloudflare Workers via `wrangler.jsonc`.

```bash
# Install Wrangler globally (if not already)
bun add -g wrangler

# Authenticate with Cloudflare
wrangler login

# Deploy
wrangler deploy
```

The `compatibility_flags: ["nodejs_compat"]` flag is already set so Node built-ins work on the edge runtime.

---

## 📂 Project Structure

```
src/
├── components/
│   ├── StockChart.tsx          # Recharts wrapper (price + MA + forecast)
│   └── ui/                     # shadcn/ui primitives (Button, Input, Select …)
├── lib/
│   ├── stock-analysis.ts       # Moving averages, OLS regression, RMSE/MAE
│   └── csv-import.ts           # Robust CSV parser (Yahoo Finance & generic)
├── routes/
│   ├── __root.tsx              # App shell / layout
│   └── index.tsx               # Main page — ticker input, controls, results
├── utils/
│   └── stock.functions.ts      # Server function: fetches Yahoo Finance API
├── hooks/
│   └── use-mobile.tsx          # Responsive breakpoint hook
└── styles.css                  # Global Tailwind styles
```

---

## 📊 How the Prediction Works

1. **Data ingestion** — Historical daily closing prices are fetched from Yahoo Finance (server-side to avoid CORS) or parsed from an uploaded CSV file.

2. **Moving averages** — MA-50 and MA-100 are computed with a sliding-window sum in O(n) time and plotted as overlays.

3. **Linear regression** — An ordinary-least-squares fit (`y = a + b·t`) is trained on the first 80% of available trading days. The slope `b` determines the trend classification.

4. **Forecast** — The regression line is extrapolated forward for the requested number of trading days. Saturdays and Sundays are skipped when generating future dates.

5. **Error metrics** — RMSE and MAE are calculated by comparing the regression predictions against the held-out 20% test set, giving an honest estimate of in-sample fit quality.

---

## 📥 CSV Format

Stock Prophet accepts any CSV with at minimum a **date column** and a **price column**.

**Supported date column names** (case-insensitive): `date`, `timestamp`, `time`, `datetime`

**Supported price column names** (case-insensitive, in priority order): `adj close`, `adjusted close`, `close`, `price`, `last`, `value`

**Yahoo Finance export** is supported out of the box. Download via *Yahoo Finance → Historical Data → Download*.

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
bun run lint       # ESLint
bun run format     # Prettier (auto-fix)
```

---

## ⚠️ Disclaimer

Stock Prophet is an **educational demo**. The linear regression model is a baseline statistical tool and should **not** be used as financial advice or for real trading decisions. Past price trends do not guarantee future performance.
