import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { fetchStock, type FetchStockResult } from "@/utils/stock.functions";
import { analyze, type AnalysisResult } from "@/lib/stock-analysis";
import { parseCsv } from "@/lib/csv-import";
import { StockChart } from "@/components/StockChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, TrendingDown, Minus, Activity, Download, Loader2, Upload } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stock Price Predictor — Linear Regression Demo" },
      {
        name: "description",
        content:
          "Fetch real stock data, visualise moving averages, and forecast prices with linear regression. Free open-source demo.",
      },
      { property: "og:title", content: "Stock Price Predictor" },
      {
        property: "og:description",
        content: "Live stock charts + ML-based price forecast in your browser.",
      },
    ],
  }),
  component: HomePage,
});

const RANGES = ["1y", "2y", "5y", "10y", "max"] as const;
type Range = (typeof RANGES)[number];

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function HomePage() {
  const fetchStockFn = useServerFn(fetchStock);
  const [source, setSource] = useState<"ticker" | "csv">("ticker");
  const [ticker, setTicker] = useState("AAPL");
  const [range, setRange] = useState<Range>("5y");
  const [forecastDays, setForecastDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FetchStockResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [csvInfo, setCsvInfo] = useState<{ name: string; rows: number; skipped: number } | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const analysis: AnalysisResult | null = useMemo(() => {
    if (!data || data.bars.length < 110) return null;
    return analyze(data.bars, forecastDays);
  }, [data, forecastDays]);

  async function run(t: string = ticker, r: Range = range) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchStockFn({ data: { ticker: t, range: r } });
      if (res.error) {
        setError(res.error);
        setData(null);
      } else if (res.bars.length < 110) {
        setError("Not enough history for moving averages (need ≥ 110 trading days).");
        setData(null);
      } else {
        setData(res);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch data");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleCsvFile(file: File) {
    setLoading(true);
    setError(null);
    try {
      const text = await file.text();
      const parsed = parseCsv(text, file.name);
      if (parsed.bars.length < 110) {
        setError(
          `CSV has ${parsed.bars.length} valid rows. Need ≥ 110 trading days for moving averages.`,
        );
        setData(null);
        setCsvInfo(null);
      } else {
        const tickerName =
          file.name
            .replace(/\.csv$/i, "")
            .toUpperCase()
            .slice(0, 12) || "CSV";
        setData({
          ticker: tickerName,
          bars: parsed.bars,
          currency: "USD",
          exchangeName: "CSV upload",
          longName: file.name,
        });
        setCsvInfo({ name: file.name, rows: parsed.rowsParsed, skipped: parsed.rowsSkipped });
        setSource("csv");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse CSV");
      setData(null);
      setCsvInfo(null);
    } finally {
      setLoading(false);
    }
  }

  // Load default on mount
  useEffect(() => {
    void run("AAPL", "5y");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const splitDate =
    data && analysis ? data.bars[Math.floor(data.bars.length * 0.8)]?.date : undefined;

  function downloadCSV() {
    if (!analysis || !data) return;
    const lines = ["date,predicted_close"];
    for (const f of analysis.forecast) lines.push(`${f.date},${f.value.toFixed(4)}`);
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.ticker}_forecast.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-7xl">
        {/* Hero */}
        <header className="mb-10 flex flex-col gap-3">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-primary">
            <Activity className="h-3.5 w-3.5" />
            <span>quant.predictor / v1.0</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Stock Price{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Predictor
            </span>
          </h1>
          <p className="max-w-2xl text-muted-foreground md:text-lg">
            Live data from Yahoo Finance, moving averages, and a linear-regression forecast — all
            computed in real time.
          </p>
        </header>

        {/* Controls */}
        <section className="glass mb-8 rounded-2xl p-5 md:p-6">
          {/* Source toggle */}
          <div className="mb-4 flex gap-1 rounded-md border border-border bg-input p-1 w-fit">
            {(["ticker", "csv"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSource(s)}
                className={`rounded px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors ${
                  source === s
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "ticker" ? "Ticker" : "Upload CSV"}
              </button>
            ))}
          </div>

          {source === "ticker" ? (
            <>
              <div className="grid gap-4 md:grid-cols-[1fr_auto_auto_auto]">
                <div className="space-y-2">
                  <Label
                    htmlFor="ticker"
                    className="font-mono text-xs uppercase tracking-wider text-muted-foreground"
                  >
                    Ticker
                  </Label>
                  <Input
                    id="ticker"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && run()}
                    placeholder="AAPL"
                    className="border-border bg-input font-mono text-lg uppercase tracking-wider"
                    maxLength={12}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    Range
                  </Label>
                  <div className="flex gap-1 rounded-md border border-border bg-input p-1">
                    {RANGES.map((r) => (
                      <button
                        key={r}
                        onClick={() => setRange(r)}
                        className={`rounded px-3 py-1.5 font-mono text-xs uppercase transition-colors ${
                          range === r
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="forecast"
                    className="font-mono text-xs uppercase tracking-wider text-muted-foreground"
                  >
                    Forecast (days)
                  </Label>
                  <Input
                    id="forecast"
                    type="number"
                    min={5}
                    max={120}
                    value={forecastDays}
                    onChange={(e) =>
                      setForecastDays(Math.max(5, Math.min(120, Number(e.target.value) || 30)))
                    }
                    className="w-28 border-border bg-input font-mono"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => run()}
                    disabled={loading || !ticker.trim()}
                    className="h-10 gap-2 px-6 font-mono uppercase tracking-wider glow-bull"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Activity className="h-4 w-4" />
                    )}
                    {loading ? "Loading…" : "Run"}
                  </Button>
                </div>
              </div>

              {/* Quick picks */}
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="font-mono text-xs uppercase text-muted-foreground">try:</span>
                {[
                  "AAPL",
                  "TSLA",
                  "MSFT",
                  "NVDA",
                  "GOOGL",
                  "AMZN",
                  "META",
                  "^GSPC",
                  "INFY.NS",
                  "RELIANCE.NS",
                  "TCS.NS",
                ].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTicker(t);
                      void run(t, range);
                    }}
                    className="rounded-md border border-border bg-secondary/50 px-2.5 py-1 font-mono text-xs uppercase text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
                <div className="space-y-2">
                  <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    CSV file
                  </Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleCsvFile(f);
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="h-10 w-full justify-start gap-2 border-border bg-input font-mono"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span className="truncate">
                      {csvInfo ? csvInfo.name : "Choose a .csv file…"}
                    </span>
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="forecast-csv"
                    className="font-mono text-xs uppercase tracking-wider text-muted-foreground"
                  >
                    Forecast (days)
                  </Label>
                  <Input
                    id="forecast-csv"
                    type="number"
                    min={5}
                    max={120}
                    value={forecastDays}
                    onChange={(e) =>
                      setForecastDays(Math.max(5, Math.min(120, Number(e.target.value) || 30)))
                    }
                    className="w-28 border-border bg-input font-mono"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="h-10 gap-2 px-6 font-mono uppercase tracking-wider"
                  >
                    <Upload className="h-4 w-4" />
                    Upload
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-2 font-mono text-xs text-muted-foreground">
                <p>
                  Expected columns: <span className="text-foreground">date</span> +{" "}
                  <span className="text-foreground">close</span> (or{" "}
                  <span className="text-foreground">adj close</span>,{" "}
                  <span className="text-foreground">price</span>). Yahoo Finance CSV exports work
                  out of the box.
                </p>
                {csvInfo && (
                  <p>
                    Loaded <span className="text-foreground">{csvInfo.rows}</span> rows from{" "}
                    <span className="text-foreground">{csvInfo.name}</span>
                    {csvInfo.skipped > 0 && (
                      <>
                        {" "}
                        · skipped {csvInfo.skipped} invalid row{csvInfo.skipped === 1 ? "" : "s"}
                      </>
                    )}
                  </p>
                )}
              </div>
            </>
          )}
        </section>

        {error && (
          <div className="glass mb-6 rounded-xl border-l-4 border-l-destructive p-4 font-mono text-sm text-destructive">
            ⚠ {error}
          </div>
        )}

        {/* Stats */}
        {data && analysis && (
          <section className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              label="Latest"
              value={formatCurrency(analysis.latestClose, data.currency)}
              hint={data.longName || data.ticker}
            />
            <StatCard
              label="Total change"
              value={`${analysis.changePct >= 0 ? "+" : ""}${analysis.changePct.toFixed(2)}%`}
              hint={`${analysis.dailyTrendPct >= 0 ? "+" : ""}${analysis.dailyTrendPct.toFixed(3)}%/day drift`}
              tone={analysis.changePct >= 0 ? "bull" : "bear"}
              icon={
                analysis.trend === "up" ? (
                  <TrendingUp className="h-4 w-4" />
                ) : analysis.trend === "down" ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )
              }
            />
            <StatCard
              label="Model (LinReg)"
              value={`RMSE: ${analysis.metrics.rmse.toFixed(2)}`}
              hint={`MAE: ${analysis.metrics.mae.toFixed(2)} (OLS fit)`}
            />
            <StatCard
              label="Naive Baseline"
              value={`RMSE: ${analysis.metrics.baselineRmse.toFixed(2)}`}
              hint={`MAE: ${analysis.metrics.baselineMae.toFixed(2)} (Pt = Pt-1)`}
            />
          </section>
        )}

        {/* Side-by-Side Model vs Naive Baseline Benchmark */}
        {data && analysis && (
          <section className="glass mb-6 rounded-2xl p-5 md:p-6">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
                  Model Evaluation vs. Naive Baseline (20% Out-of-Sample Holdout)
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Held-out test set: {data.bars.length - Math.floor(data.bars.length * 0.8)} trading
                  days
                </p>
              </div>
              <span className="w-fit rounded border border-border bg-secondary/80 px-2.5 py-1 font-mono text-xs text-foreground">
                Benchmark: P<sub>t</sub> = P<sub>t-1</sub>
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Linear Regression Card */}
              <div className="rounded-xl border border-border/70 bg-secondary/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold text-foreground">
                    Linear Regression (OLS)
                  </span>
                  <span className="rounded bg-background/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                    Parametric Trend Line
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-lg bg-background/50 p-2.5">
                    <div className="font-mono text-xs text-muted-foreground">Test RMSE</div>
                    <div className="font-mono text-lg font-bold text-foreground">
                      {analysis.metrics.rmse.toFixed(3)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-background/50 p-2.5">
                    <div className="font-mono text-xs text-muted-foreground">Test MAE</div>
                    <div className="font-mono text-lg font-bold text-foreground">
                      {analysis.metrics.mae.toFixed(3)}
                    </div>
                  </div>
                </div>
                <p className="mt-3 font-mono text-xs text-muted-foreground">
                  Extrapolates linear slope b = {analysis.dailyTrendPct.toFixed(4)}%/day learned
                  from initial 80% train window.
                </p>
              </div>

              {/* Naive Baseline Card */}
              <div className="rounded-xl border border-border/70 bg-secondary/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold text-foreground">
                    Naive Baseline (Persistence)
                  </span>
                  <span className="rounded bg-background/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                    P<sub>t</sub> = P<sub>t-1</sub>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-lg bg-background/50 p-2.5">
                    <div className="font-mono text-xs text-muted-foreground">Test RMSE</div>
                    <div className="font-mono text-lg font-bold text-foreground">
                      {analysis.metrics.baselineRmse.toFixed(3)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-background/50 p-2.5">
                    <div className="font-mono text-xs text-muted-foreground">Test MAE</div>
                    <div className="font-mono text-lg font-bold text-foreground">
                      {analysis.metrics.baselineMae.toFixed(3)}
                    </div>
                  </div>
                </div>
                <p className="mt-3 font-mono text-xs text-muted-foreground">
                  Deliberately simple benchmark: tomorrow&apos;s price equals today&apos;s price.
                  Standard test for financial random walks.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Chart */}
        {data && analysis && (
          <section className="glass mb-6 rounded-2xl p-4 md:p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
                {data.ticker} — close · MA50 · MA100 · forecast
              </h2>
              {data.exchangeName && (
                <span className="font-mono text-xs text-muted-foreground">{data.exchangeName}</span>
              )}
            </div>
            <StockChart data={analysis.rows} currency={data.currency} splitDate={splitDate} />
          </section>
        )}

        {/* Forecast table */}
        {analysis && (
          <section className="glass rounded-2xl p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
                {forecastDays}-day forecast
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadCSV}
                className="gap-2 font-mono text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                CSV
              </Button>
            </div>
            <div className="max-h-80 overflow-auto rounded-md border border-border">
              <table className="w-full font-mono text-sm">
                <thead className="sticky top-0 bg-secondary/80 backdrop-blur">
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2 text-right">Predicted close</th>
                    <th className="px-4 py-2 text-right">Δ from latest</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.forecast.map((f) => {
                    const delta = ((f.value - analysis.latestClose) / analysis.latestClose) * 100;
                    return (
                      <tr key={f.date} className="border-t border-border/50">
                        <td className="px-4 py-2 text-muted-foreground">{f.date}</td>
                        <td className="px-4 py-2 text-right">
                          {formatCurrency(f.value, data?.currency ?? "USD")}
                        </td>
                        <td
                          className={`px-4 py-2 text-right ${
                            delta >= 0 ? "text-bull" : "text-bear"
                          }`}
                        >
                          {delta >= 0 ? "+" : ""}
                          {delta.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <footer className="mt-12 text-center font-mono text-xs text-muted-foreground">
          <p>
            Educational demo only — not financial advice. Data: Yahoo Finance. Full Python ML
            project (Linear Regression vs. Random Forest vs. Naive Baseline with TimeSeriesSplit)
            available in the <span className="text-foreground">ml/</span> directory.
          </p>
        </footer>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "bull" | "bear";
  icon?: React.ReactNode;
}) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between font-mono text-xs uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        {icon}
      </div>
      <div
        className={`mt-2 font-mono text-2xl font-semibold ${
          tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : "text-foreground"
        }`}
      >
        {value}
      </div>
      {hint && <div className="mt-1 truncate text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
