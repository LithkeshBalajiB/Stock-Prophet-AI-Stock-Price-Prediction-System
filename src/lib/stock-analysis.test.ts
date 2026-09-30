import { describe, it, expect } from "vitest";
import { movingAverage, linearRegression, rmse, mae, analyze, type Bar } from "./stock-analysis";

describe("stock-analysis unit tests", () => {
  describe("movingAverage", () => {
    it("computes simple moving average and sets initial window values to null", () => {
      const values = [10, 20, 30, 40, 50];
      const result = movingAverage(values, 3);
      expect(result).toEqual([null, null, 20, 30, 40]);
    });

    it("handles window = 1 where each value equals itself", () => {
      const values = [5, 15, 25];
      const result = movingAverage(values, 1);
      expect(result).toEqual([5, 15, 25]);
    });

    it("returns all nulls if window is larger than input length", () => {
      const values = [10, 20];
      const result = movingAverage(values, 5);
      expect(result).toEqual([null, null]);
    });
  });

  describe("linearRegression", () => {
    it("returns exact slope and intercept for a perfect straight line (y = 2 + 3t)", () => {
      // t = 0, 1, 2, 3 -> y = 2, 5, 8, 11
      const y = [2, 5, 8, 11];
      const { a, b } = linearRegression(y);
      expect(b).toBeCloseTo(3, 6);
      expect(a).toBeCloseTo(2, 6);
    });

    it("returns exact negative slope for a descending straight line (y = 100 - 2.5t)", () => {
      // t = 0, 1, 2, 3 -> y = 100, 97.5, 95, 92.5
      const y = [100, 97.5, 95, 92.5];
      const { a, b } = linearRegression(y);
      expect(b).toBeCloseTo(-2.5, 6);
      expect(a).toBeCloseTo(100, 6);
    });

    it("returns slope 0 for a flat series", () => {
      const y = [42, 42, 42, 42];
      const { a, b } = linearRegression(y);
      expect(b).toBeCloseTo(0, 6);
      expect(a).toBeCloseTo(42, 6);
    });

    it("handles empty arrays gracefully", () => {
      const { a, b } = linearRegression([]);
      expect(a).toBe(0);
      expect(b).toBe(0);
    });
  });

  describe("rmse and mae", () => {
    it("matches the 4-day benchmark test case (MAE = 1.75, RMSE ≈ 2.29)", () => {
      const actual = [10, 20, 30, 40];
      const predicted = [11, 18, 34, 40];
      // Residuals: [-1, +2, -4, 0]
      // MAE: (1 + 2 + 4 + 0) / 4 = 1.75
      // RMSE: sqrt((1 + 4 + 16 + 0) / 4) = sqrt(5.25) ≈ 2.2912878...
      expect(mae(actual, predicted)).toBe(1.75);
      expect(rmse(actual, predicted)).toBeCloseTo(2.29, 2);
      expect(rmse(actual, predicted)).toBeCloseTo(Math.sqrt(5.25), 6);
    });

    it("returns 0 for perfect predictions", () => {
      const actual = [100, 105, 110];
      const predicted = [100, 105, 110];
      expect(mae(actual, predicted)).toBe(0);
      expect(rmse(actual, predicted)).toBe(0);
    });

    it("returns 0 for empty arrays", () => {
      expect(mae([], [])).toBe(0);
      expect(rmse([], [])).toBe(0);
    });
  });

  describe("analyze with baseline comparison and normalized trend", () => {
    it("computes both model metrics and naive baseline metrics on test split", () => {
      // 100 days of mock price data with steady uptrend
      const bars: Bar[] = Array.from({ length: 100 }, (_, i) => ({
        date: new Date(2023, 0, 1 + i).toISOString().slice(0, 10),
        close: 100 + i * 0.5 + (i % 2 === 0 ? 1 : -1),
      }));

      const res = analyze(bars, 5);

      expect(res.metrics).toHaveProperty("rmse");
      expect(res.metrics).toHaveProperty("mae");
      expect(res.metrics).toHaveProperty("baselineRmse");
      expect(res.metrics).toHaveProperty("baselineMae");

      expect(res.metrics.rmse).toBeGreaterThan(0);
      expect(res.metrics.baselineRmse).toBeGreaterThan(0);
      expect(res.metrics.mae).toBeGreaterThan(0);
      expect(res.metrics.baselineMae).toBeGreaterThan(0);
    });

    it("evaluates trend based on percentage change per day, invariant to price scale", () => {
      // Low price stock ($5) with +0.5% daily trend (b = +0.025/day)
      const lowPriceBars: Bar[] = Array.from({ length: 50 }, (_, i) => ({
        date: new Date(2024, 0, 1 + i).toISOString().slice(0, 10),
        close: 5.0 + i * 0.025,
      }));
      const lowRes = analyze(lowPriceBars, 3);
      expect(lowRes.dailyTrendPct).toBeGreaterThan(0.02);
      expect(lowRes.trend).toBe("up");

      // High price stock ($500) with +0.5% daily trend (b = +2.5/day)
      const highPriceBars: Bar[] = Array.from({ length: 50 }, (_, i) => ({
        date: new Date(2024, 0, 1 + i).toISOString().slice(0, 10),
        close: 500.0 + i * 2.5,
      }));
      const highRes = analyze(highPriceBars, 3);
      expect(highRes.dailyTrendPct).toBeGreaterThan(0.02);
      expect(highRes.trend).toBe("up");
    });
  });
});
