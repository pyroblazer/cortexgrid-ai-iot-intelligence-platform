import {
  TemperatureSensor,
  HumiditySensor,
  PressureSensor,
  MotionDetector,
  PowerMeter,
  GasSensor,
  DEVICE_PROFILES,
  createSimulationContext,
  getProfile,
  getAllProfileTypes,
} from '../../src/devices/device-profile';

function generateMetricsN(
  profile: typeof TemperatureSensor,
  iterations: number,
): Record<string, number[]> {
  const context = createSimulationContext(Date.now() - 3600000); // started 1h ago
  const collected: Record<string, number[]> = {};

  for (const metric of profile.metrics) {
    collected[metric.name] = [];
  }

  for (let i = 0; i < iterations; i++) {
    context.timestamp = Date.now();
    context.sequenceNumber = i;

    for (const metric of profile.metrics) {
      const value = metric.generate(context);
      if (typeof value === 'number') {
        collected[metric.name].push(value);
        context.previousValues[metric.name] = value;
      }
    }
  }

  return collected;
}

function getRange(values: number[]): { min: number; max: number; avg: number } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  return { min, max, avg };
}

describe('Device Profiles', () => {
  // ---------------------------------------------------------------------------
  // Common checks for all profiles
  // ---------------------------------------------------------------------------
  describe('profile structure', () => {
    const profiles = [
      TemperatureSensor,
      HumiditySensor,
      PressureSensor,
      MotionDetector,
      PowerMeter,
      GasSensor,
    ];

    for (const profile of profiles) {
      describe(`${profile.type}`, () => {
        it('should have a non-empty type string', () => {
          expect(typeof profile.type).toBe('string');
          expect(profile.type.length).toBeGreaterThan(0);
        });

        it('should have a description', () => {
          expect(typeof profile.description).toBe('string');
          expect(profile.description.length).toBeGreaterThan(0);
        });

        it('should have at least one metric', () => {
          expect(profile.metrics.length).toBeGreaterThanOrEqual(1);
        });

        it('should have metrics with name, unit, and generate function', () => {
          for (const metric of profile.metrics) {
            expect(typeof metric.name).toBe('string');
            expect(typeof metric.unit).toBe('string');
            expect(typeof metric.generate).toBe('function');
          }
        });

        it('should have metadata', () => {
          expect(profile.metadata).toBeDefined();
          expect(typeof profile.metadata).toBe('object');
        });

        it('should have a positive defaultInterval', () => {
          expect(profile.defaultInterval).toBeGreaterThan(0);
        });
      });
    }
  });

  // ---------------------------------------------------------------------------
  // Temperature Sensor
  // ---------------------------------------------------------------------------
  describe('TemperatureSensor metrics', () => {
    const collected = generateMetricsN(TemperatureSensor, 1000);

    it('temperature should be within 15-35°C', () => {
      const { min, max } = getRange(collected['temperature']);
      expect(min).toBeGreaterThanOrEqual(15);
      expect(max).toBeLessThanOrEqual(35);
    });

    it('humidity should be within 30-80%', () => {
      const { min, max } = getRange(collected['humidity']);
      expect(min).toBeGreaterThanOrEqual(30);
      expect(max).toBeLessThanOrEqual(80);
    });

    it('pressure should be within 980-1030 hPa', () => {
      const { min, max } = getRange(collected['pressure']);
      expect(min).toBeGreaterThanOrEqual(980);
      expect(max).toBeLessThanOrEqual(1030);
    });

    it('temperature should produce varied values', () => {
      const uniqueValues = new Set(collected['temperature']);
      expect(uniqueValues.size).toBeGreaterThan(100);
    });
  });

  // ---------------------------------------------------------------------------
  // Humidity Sensor
  // ---------------------------------------------------------------------------
  describe('HumiditySensor metrics', () => {
    const collected = generateMetricsN(HumiditySensor, 1000);

    it('humidity should be within 20-95%', () => {
      const { min, max } = getRange(collected['humidity']);
      expect(min).toBeGreaterThanOrEqual(20);
      expect(max).toBeLessThanOrEqual(95);
    });

    it('dewPoint should be within -10 to 30°C', () => {
      const { min, max } = getRange(collected['dewPoint']);
      expect(min).toBeGreaterThanOrEqual(-10);
      expect(max).toBeLessThanOrEqual(30);
    });

    it('absoluteHumidity should be positive', () => {
      for (const val of collected['absoluteHumidity']) {
        expect(val).toBeGreaterThan(0);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Pressure Sensor
  // ---------------------------------------------------------------------------
  describe('PressureSensor metrics', () => {
    const collected = generateMetricsN(PressureSensor, 1000);

    it('pressure should be within 950-1050 hPa', () => {
      const { min, max } = getRange(collected['pressure']);
      expect(min).toBeGreaterThanOrEqual(950);
      expect(max).toBeLessThanOrEqual(1050);
    });

    it('altitude should be a reasonable number', () => {
      const { min, max } = getRange(collected['altitude']);
      // Altitude should be roughly within -500m to +5000m for these pressures
      expect(min).toBeGreaterThan(-1000);
      expect(max).toBeLessThan(6000);
    });

    it('pressureTrend should be one of: rising, falling, steady', () => {
      // pressureTrend is a string metric so it won't be in collected
      const context = createSimulationContext(Date.now() - 3600000);
      context.previousValues['pressure'] = 1013;
      context.previousValues['pressure_prev'] = 1012;
      const trend = PressureSensor.metrics[2].generate(context);
      expect(['rising', 'falling', 'steady']).toContain(trend);
    });
  });

  // ---------------------------------------------------------------------------
  // Motion Detector
  // ---------------------------------------------------------------------------
  describe('MotionDetector metrics', () => {
    const context = createSimulationContext(Date.now() - 3600000);
    let motionCount = 0;
    let velocityWhenMotion = 0;
    let velocityWhenNoMotion = 0;
    let accelerationWhenMotion = 0;
    let activityLevels = new Set<string>();

    for (let i = 0; i < 1000; i++) {
      context.sequenceNumber = i;

      const motionDetected = MotionDetector.metrics[0].generate(context) as boolean;
      context.previousValues['motionDetected'] = motionDetected ? 1 : 0;

      if (motionDetected) motionCount++;

      const velocity = MotionDetector.metrics[1].generate(context) as number;
      const acceleration = MotionDetector.metrics[2].generate(context) as number;
      const activity = MotionDetector.metrics[3].generate(context) as string;

      if (motionDetected) {
        velocityWhenMotion += velocity;
        accelerationWhenMotion += acceleration;
      } else {
        velocityWhenNoMotion += velocity;
      }
      activityLevels.add(activity);
    }

    it('motion should be detected roughly 30% of the time', () => {
      const ratio = motionCount / 1000;
      expect(ratio).toBeGreaterThan(0.15);
      expect(ratio).toBeLessThan(0.5);
    });

    it('velocity should be 0 when no motion is detected', () => {
      expect(velocityWhenNoMotion).toBe(0);
    });

    it('velocity should be positive when motion is detected', () => {
      expect(velocityWhenMotion).toBeGreaterThan(0);
    });

    it('activity level should be one of the expected values', () => {
      expect(activityLevels).toContain('idle');
      // The set should contain at least one of the motion activity levels
      const motionLevels = ['low', 'medium', 'high'];
      const hasMotionLevel = motionLevels.some((l) => activityLevels.has(l));
      expect(hasMotionLevel).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Power Meter
  // ---------------------------------------------------------------------------
  describe('PowerMeter metrics', () => {
    const collected = generateMetricsN(PowerMeter, 1000);

    it('voltage should be within 220-240V', () => {
      const { min, max } = getRange(collected['voltage']);
      expect(min).toBeGreaterThanOrEqual(220);
      expect(max).toBeLessThanOrEqual(240);
    });

    it('current should be within 0-30A', () => {
      const { min, max } = getRange(collected['current']);
      expect(min).toBeGreaterThanOrEqual(0);
      expect(max).toBeLessThanOrEqual(30);
    });

    it('power should be positive when current is positive', () => {
      // All power values should be >= 0
      for (const val of collected['power']) {
        expect(val).toBeGreaterThanOrEqual(0);
      }
    });

    it('powerFactor should be between 0 and 1', () => {
      for (const val of collected['powerFactor']) {
        expect(val).toBeGreaterThan(0.9);
        expect(val).toBeLessThanOrEqual(1.0);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Gas Sensor
  // ---------------------------------------------------------------------------
  describe('GasSensor metrics', () => {
    const collected = generateMetricsN(GasSensor, 1000);

    it('co2 should be within 400-2000 ppm', () => {
      const { min, max } = getRange(collected['co2']);
      expect(min).toBeGreaterThanOrEqual(400);
      expect(max).toBeLessThanOrEqual(2000);
    });

    it('co should be within 0-50 ppm', () => {
      const { min, max } = getRange(collected['co']);
      expect(min).toBeGreaterThanOrEqual(0);
      expect(max).toBeLessThanOrEqual(50);
    });

    it('voc should be within 0-1000 ppb', () => {
      const { min, max } = getRange(collected['voc']);
      expect(min).toBeGreaterThanOrEqual(0);
      expect(max).toBeLessThanOrEqual(1000);
    });

    it('airQualityIndex should be within 0-100', () => {
      const { min, max } = getRange(collected['airQualityIndex']);
      expect(min).toBeGreaterThanOrEqual(0);
      expect(max).toBeLessThanOrEqual(100);
    });
  });

  // ---------------------------------------------------------------------------
  // Profile Registry
  // ---------------------------------------------------------------------------
  describe('profile registry', () => {
    it('should contain all 6 device profiles', () => {
      expect(Object.keys(DEVICE_PROFILES)).toHaveLength(6);
    });

    it('should return profile by type', () => {
      expect(getProfile('temperature_sensor')).toBe(TemperatureSensor);
      expect(getProfile('humidity_sensor')).toBe(HumiditySensor);
      expect(getProfile('pressure_sensor')).toBe(PressureSensor);
      expect(getProfile('motion_detector')).toBe(MotionDetector);
      expect(getProfile('power_meter')).toBe(PowerMeter);
      expect(getProfile('gas_sensor')).toBe(GasSensor);
    });

    it('should return undefined for unknown type', () => {
      expect(getProfile('unknown_sensor')).toBeUndefined();
    });

    it('getAllProfileTypes should return all profile types', () => {
      const types = getAllProfileTypes();
      expect(types).toHaveLength(6);
      expect(types).toContain('temperature_sensor');
      expect(types).toContain('humidity_sensor');
      expect(types).toContain('pressure_sensor');
      expect(types).toContain('motion_detector');
      expect(types).toContain('power_meter');
      expect(types).toContain('gas_sensor');
    });
  });
});
