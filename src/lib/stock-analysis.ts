/**
 * Lightweight client-side helpers for the stock prediction demo.
 *
 * Full ML benchmarks (Linear Regression vs. Random Forest vs. Naive Baseline
 * using lagged features and TimeSeriesSplit cross-validation) live in the `ml/` Python project.
 * Here on the client we do:
 *  - moving averages (MA-50, MA-100)
 *  - ordinary least squares linear regression for trend forecasting
 *  - out-of-sample RMSE & MAE evaluation compared against a naive persistence baseline (P_t = P_{t-1})
 */

export type Bar = {
  date: string; // ISO yyyy-mm-dd
  close: number;
};

export function movingAverage(values: number[], window: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= window) sum -= values[i - window];
    out.push(i >= window - 1 ? sum / window : null);
  }
  return out;
}

/** Ordinary least squares y = a + b*t (t = day index). */
export function linearRegression(y: number[]): { a: number; b: number } {
  const n = y.length;
  if (n === 0) return { a: 0, b: 0 };
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += y[i];
    sumXY += i * y[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  const b = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n;
  return { a, b };
}

export function rmse(actual: number[], predicted: number[]): number {
  const n = Math.min(actual.length, predicted.length);
  if (n === 0) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const d = actual[i] - predicted[i];
    s += d * d;
  }
  return Math.sqrt(s / n);
}

export function mae(actual: number[], predicted: number[]): number {
  const n = Math.min(actual.length, predicted.length);
  if (n === 0) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) s += Math.abs(actual[i] - predicted[i]);
  return s / n;
}

export type AnalysisResult = {
  rows: Array<{
    date: string;
    close: number | null;
    ma50: number | null;
    ma100: number | null;
    fit: number | null; // regression line over the full history
    forecast: number | null;
  }>;
  metrics: {
    rmse: number;
    mae: number;
    baselineRmse: number;
    baselineMae: number;
  };
  forecast: Array<{ date: string; value: number }>;
  trend: "up" | "down" | "flat";
  dailyTrendPct: number;
  changePct: number;
  latestClose: number;
};

/** Run MA + linear regression + forecast + naive baseline comparison. */
export function analyze(bars: Bar[], forecastDays: number): AnalysisResult {
  const closes = bars.map((b) => b.close);
  const ma50 = movingAverage(closes, 50);
  const ma100 = movingAverage(closes, 100);

  // Train/test split: last 20% held out as test set to evaluate out-of-sample metrics
  const cutoff = Math.floor(closes.length * 0.8);
  const train = closes.slice(0, cutoff);
  const { a, b } = linearRegression(train);

  // Predict over full timeline (for charting) and on test (for metrics)
  const fit = closes.map((_, i) => a + b * i);
  const testActual = closes.slice(cutoff);
  const testPred = fit.slice(cutoff);

  // Naive baseline benchmark: "tomorrow's price = today's price" (P_t = P_{t-1})
  // For test day cutoff, the prior day's close was closes[cutoff - 1].
  const baselinePred =
    cutoff > 0 ? closes.slice(cutoff - 1, closes.length - 1) : closes.slice(0, testActual.length);

  // Forecast: extrapolate b business days forward using calendar-day step
  const lastDate = new Date(bars[bars.length - 1].date);
  const forecast: Array<{ date: string; value: number }> = [];
  for (let i = 1; i <= forecastDays; i++) {
    const d = new Date(lastDate);
    // Skip weekends
    let added = 0;
    while (added < i) {
      d.setDate(d.getDate() + 1);
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) added++;
    }
    forecast.push({
      date: d.toISOString().slice(0, 10),
      value: a + b * (closes.length - 1 + i),
    });
  }

  type Row = {
    date: string;
    close: number | null;
    ma50: number | null;
    ma100: number | null;
    fit: number | null;
    forecast: number | null;
  };
  const rows: Row[] = bars.map((bar, i) => ({
    date: bar.date,
    close: bar.close,
    ma50: ma50[i],
    ma100: ma100[i],
    fit: fit[i],
    forecast: null,
  }));
  for (const f of forecast) {
    rows.push({
      date: f.date,
      close: null,
      ma50: null,
      ma100: null,
      fit: null,
      forecast: f.value,
    });
  }

  const latestClose = closes[closes.length - 1] ?? 0;
  const firstClose = closes[0] ?? 1;
  const changePct = ((latestClose - firstClose) / firstClose) * 100;

  // Normalized trend slope: daily percentage change (b / latestClose * 100)
  // Replaces fixed dollar cutoff (b > 0.01) so behavior is consistent across $5 vs $500 stocks.
  // Threshold: +/- 0.02% per trading day (~5% annualized drift)
  const dailyTrendPct = latestClose > 0 ? (b / latestClose) * 100 : 0;
  const trend: "up" | "down" | "flat" =
    dailyTrendPct > 0.02 ? "up" : dailyTrendPct < -0.02 ? "down" : "flat";

  return {
    rows,
    metrics: {
      rmse: rmse(testActual, testPred),
      mae: mae(testActual, testPred),
      baselineRmse: rmse(testActual, baselinePred),
      baselineMae: mae(testActual, baselinePred),
    },
    forecast,
    trend,
    dailyTrendPct,
    changePct,
    latestClose,
  };
}
