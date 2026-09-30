import { createServerFn } from "@tanstack/react-start";

export type FetchStockResult = {
  ticker: string;
  bars: Array<{ date: string; close: number }>;
  currency: string;
  exchangeName: string;
  longName?: string;
  error?: string;
};

/**
 * Fetch historical daily closes from Yahoo Finance's public chart endpoint.
 * No API key required.
 */
export const fetchStock = createServerFn({ method: "GET" })
  .inputValidator((data: { ticker: string; range: string }) => {
    const ticker = String(data.ticker || "")
      .trim()
      .toUpperCase();
    const range = String(data.range || "5y");
    if (!/^[A-Z0-9.\-^]{1,12}$/.test(ticker)) {
      throw new Error("Invalid ticker format.");
    }
    if (!["1y", "2y", "5y", "10y", "max"].includes(range)) {
      throw new Error("Invalid range.");
    }
    return { ticker, range };
  })
  .handler(async ({ data }): Promise<FetchStockResult> => {
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(data.ticker)}` +
      `?range=${data.range}&interval=1d&includePrePost=false&events=div%2Csplit`;

    try {
      const res = await fetch(url, {
        headers: {
          // Yahoo blocks empty UAs
          "User-Agent": "Mozilla/5.0 (compatible; StockPredictor/1.0)",
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        return {
          ticker: data.ticker,
          bars: [],
          currency: "USD",
          exchangeName: "",
          error: `Yahoo Finance returned ${res.status}. The ticker may be invalid.`,
        };
      }
      const json = (await res.json()) as {
        chart?: {
          result?: Array<{
            meta?: { currency?: string; exchangeName?: string; longName?: string; symbol?: string };
            timestamp?: number[];
            indicators?: { quote?: Array<{ close?: (number | null)[] }> };
          }>;
          error?: { description?: string } | null;
        };
      };

      const result = json.chart?.result?.[0];
      const errMsg = json.chart?.error?.description;
      if (errMsg) {
        return {
          ticker: data.ticker,
          bars: [],
          currency: "USD",
          exchangeName: "",
          error: errMsg,
        };
      }
      if (!result || !result.timestamp || !result.indicators?.quote?.[0]?.close) {
        return {
          ticker: data.ticker,
          bars: [],
          currency: "USD",
          exchangeName: "",
          error: "No data returned for that ticker.",
        };
      }
      const ts = result.timestamp;
      const closes = result.indicators.quote[0].close ?? [];
      const bars: Array<{ date: string; close: number }> = [];
      for (let i = 0; i < ts.length; i++) {
        const c = closes[i];
        if (c == null || !Number.isFinite(c)) continue;
        const d = new Date(ts[i] * 1000).toISOString().slice(0, 10);
        bars.push({ date: d, close: Number(c) });
      }

      return {
        ticker: data.ticker,
        bars,
        currency: result.meta?.currency || "USD",
        exchangeName: result.meta?.exchangeName || "",
        longName: result.meta?.longName,
      };
    } catch (err) {
      console.error("fetchStock error:", err);
      return {
        ticker: data.ticker,
        bars: [],
        currency: "USD",
        exchangeName: "",
        error: "Failed to reach Yahoo Finance. Please try again.",
      };
    }
  });
