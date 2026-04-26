/**
 * Generates a Gaussian (normally distributed) random number using the Box-Muller transform.
 *
 * @param mean - The mean of the distribution
 * @param stddev - The standard deviation of the distribution
 * @returns A normally distributed random number
 */
export function gaussianRandom(mean: number, stddev: number): number {
  let u1: number;
  let u2: number;
  do {
    u1 = Math.random();
  } while (u1 === 0);
  u2 = Math.random();

  const mag = stddev * Math.sqrt(-2.0 * Math.log(u1));
  const z0 = mag * Math.cos(2.0 * Math.PI * u2);

  return mean + z0;
}

/**
 * Generates a random number uniformly distributed in the given range.
 *
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (exclusive)
 * @returns A random number in [min, max)
 */
export function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Generates a random integer uniformly distributed in the given range.
 *
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns A random integer in [min, max]
 */
export function randomIntInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * With a given probability, returns a spiked value; otherwise returns the base value.
 *
 * @param baseValue - The normal value to return
 * @param magnitude - How far the spike can deviate from the base (positive or negative)
 * @param probability - Probability of a spike occurring, in [0, 1]
 * @returns Either the base value or a spiked value
 */
export function randomSpike(baseValue: number, magnitude: number, probability: number): number {
  if (Math.random() < probability) {
    const direction = Math.random() < 0.5 ? -1 : 1;
    return baseValue + direction * magnitude * Math.random();
  }
  return baseValue;
}

/**
 * Clamps a value to be within the specified range.
 *
 * @param value - The value to clamp
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns The clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generates a value that follows a daily sine-wave pattern (simulating day/night cycles).
 * The sine wave peaks at midday and troughs at midnight (in simulation hours).
 *
 * @param baseValue - The baseline value
 * @param amplitude - The amplitude of the sine wave
 * @param phaseOffset - Phase offset in radians (0 = peaks at "noon")
 * @returns The modulated value
 */
export function dailyCycle(baseValue: number, amplitude: number, phaseOffset: number = 0): number {
  const hours = new Date().getHours() + new Date().getMinutes() / 60;
  const radians = ((hours - 6) / 24) * 2 * Math.PI + phaseOffset;
  return baseValue + amplitude * Math.sin(radians);
}

/**
 * Simulates sensor drift over time. Drift increases slowly as the sensor "ages."
 *
 * @param baseValue - The baseline value
 * @param driftRate - Drift per elapsed hour
 * @param startTime - The timestamp when the sensor started (ms epoch)
 * @returns The drifted value
 */
export function sensorDrift(baseValue: number, driftRate: number, startTime: number): number {
  const elapsedHours = (Date.now() - startTime) / (1000 * 60 * 60);
  return baseValue + driftRate * elapsedHours;
}
