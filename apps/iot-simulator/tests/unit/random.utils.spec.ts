import {
  gaussianRandom,
  randomInRange,
  randomIntInRange,
  randomSpike,
  clamp,
  dailyCycle,
  sensorDrift,
} from '../../src/utils/random';

describe('random utilities', () => {
  // ---------------------------------------------------------------------------
  // gaussianRandom
  // ---------------------------------------------------------------------------
  describe('gaussianRandom', () => {
    it('should return a number', () => {
      const result = gaussianRandom(0, 1);
      expect(typeof result).toBe('number');
      expect(Number.isFinite(result)).toBe(true);
    });

    it('should produce values centered around the mean', () => {
      const mean = 50;
      const samples = 10000;
      const results = Array.from({ length: samples }, () => gaussianRandom(mean, 1));
      const avg = results.reduce((sum, v) => sum + v, 0) / samples;
      // The average should be within 0.1 of the mean for 10k samples with stddev=1
      expect(Math.abs(avg - mean)).toBeLessThan(0.1);
    });

    it('should produce values with the expected spread for given stddev', () => {
      const mean = 100;
      const stddev = 10;
      const samples = 10000;
      const results = Array.from({ length: samples }, () => gaussianRandom(mean, stddev));
      const avg = results.reduce((sum, v) => sum + v, 0) / samples;
      const variance = results.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / samples;
      const computedStddev = Math.sqrt(variance);
      // stddev should be approximately 10 (within 1)
      expect(Math.abs(computedStddev - stddev)).toBeLessThan(1);
    });

    it('should return mean when stddev is 0', () => {
      const result = gaussianRandom(42, 0);
      expect(result).toBe(42);
    });
  });

  // ---------------------------------------------------------------------------
  // randomInRange
  // ---------------------------------------------------------------------------
  describe('randomInRange', () => {
    it('should return a value within the specified range', () => {
      for (let i = 0; i < 1000; i++) {
        const result = randomInRange(10, 20);
        expect(result).toBeGreaterThanOrEqual(10);
        expect(result).toBeLessThan(20);
      }
    });

    it('should return different values across calls', () => {
      const results = new Set(Array.from({ length: 100 }, () => randomInRange(0, 1000)));
      expect(results.size).toBeGreaterThan(50);
    });

    it('should handle negative ranges', () => {
      const result = randomInRange(-100, -50);
      expect(result).toBeGreaterThanOrEqual(-100);
      expect(result).toBeLessThan(-50);
    });

    it('should handle zero-width range', () => {
      const result = randomInRange(5, 5);
      expect(result).toBe(5);
    });
  });

  // ---------------------------------------------------------------------------
  // randomIntInRange
  // ---------------------------------------------------------------------------
  describe('randomIntInRange', () => {
    it('should return an integer within the specified range', () => {
      for (let i = 0; i < 1000; i++) {
        const result = randomIntInRange(1, 10);
        expect(Number.isInteger(result)).toBe(true);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(10);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // randomSpike
  // ---------------------------------------------------------------------------
  describe('randomSpike', () => {
    it('should return base value when probability is 0', () => {
      for (let i = 0; i < 100; i++) {
        const result = randomSpike(100, 50, 0);
        expect(result).toBe(100);
      }
    });

    it('should always spike when probability is 1', () => {
      const results = Array.from({ length: 100 }, () => randomSpike(100, 50, 1));
      const spiked = results.filter((r) => r !== 100);
      // At least some should spike (virtually all will)
      expect(spiked.length).toBeGreaterThan(50);
    });

    it('should produce spikes within the magnitude range', () => {
      for (let i = 0; i < 1000; i++) {
        const result = randomSpike(100, 50, 1);
        // Spike can be +/- magnitude from base
        expect(result).toBeGreaterThanOrEqual(50);
        expect(result).toBeLessThanOrEqual(150);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // clamp
  // ---------------------------------------------------------------------------
  describe('clamp', () => {
    it('should return the value when within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });

    it('should clamp to min when value is below range', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(-100, -50, 50)).toBe(-50);
    });

    it('should clamp to max when value is above range', () => {
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(100, -50, 50)).toBe(50);
    });

    it('should handle negative ranges', () => {
      expect(clamp(-5, -10, -2)).toBe(-5);
      expect(clamp(-15, -10, -2)).toBe(-10);
      expect(clamp(0, -10, -2)).toBe(-2);
    });
  });

  // ---------------------------------------------------------------------------
  // dailyCycle
  // ---------------------------------------------------------------------------
  describe('dailyCycle', () => {
    it('should return a number', () => {
      const result = dailyCycle(25, 5);
      expect(typeof result).toBe('number');
      expect(Number.isFinite(result)).toBe(true);
    });

    it('should produce values around the base value', () => {
      const samples = 1000;
      const results = Array.from({ length: samples }, () => dailyCycle(25, 5));
      const avg = results.reduce((sum, v) => sum + v, 0) / samples;
      // The average across many samples (taken at varying times) should be near base
      expect(Math.abs(avg - 25)).toBeLessThan(6);
    });

    it('should stay within base +/- amplitude', () => {
      const base = 20;
      const amplitude = 5;
      const result = dailyCycle(base, amplitude);
      expect(result).toBeGreaterThanOrEqual(base - amplitude);
      expect(result).toBeLessThanOrEqual(base + amplitude);
    });
  });

  // ---------------------------------------------------------------------------
  // sensorDrift
  // ---------------------------------------------------------------------------
  describe('sensorDrift', () => {
    it('should return base value when no time has elapsed', () => {
      const now = Date.now();
      const result = sensorDrift(100, 0.5, now);
      expect(result).toBe(100);
    });

    it('should increase value proportionally to elapsed time', () => {
      const startTime = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
      const result = sensorDrift(100, 0.5, startTime);
      // Should have drifted by 0.5 * 2 = 1.0
      expect(result).toBeCloseTo(101, 1);
    });

    it('should handle negative drift rate', () => {
      const startTime = Date.now() - 60 * 60 * 1000; // 1 hour ago
      const result = sensorDrift(100, -0.5, startTime);
      expect(result).toBeCloseTo(99.5, 1);
    });
  });
});
