import { v4 as uuidv4 } from 'uuid';
import {
  gaussianRandom,
  clamp,
  randomSpike,
  dailyCycle,
  randomInRange,
} from '../utils/random';

export interface MetricDefinition {
  name: string;
  unit: string;
  generate: (ctx: SimulationContext) => number | boolean | string;
}

export interface DeviceProfile {
  type: string;
  description: string;
  metrics: MetricDefinition[];
  metadata: Record<string, string | number>;
  defaultInterval: number;
}

export interface SimulationContext {
  timestamp: number;
  startTime: number;
  sequenceNumber: number;
  previousValues: Record<string, number>;
}

export function createSimulationContext(startTime: number): SimulationContext {
  return {
    timestamp: Date.now(),
    startTime,
    sequenceNumber: 0,
    previousValues: {},
  };
}

// ---------------------------------------------------------------------------
// Temperature Sensor Profile
// ---------------------------------------------------------------------------
export const TemperatureSensor: DeviceProfile = {
  type: 'temperature_sensor',
  description: 'Simulates ambient temperature, humidity, and atmospheric pressure',
  metrics: [
    {
      name: 'temperature',
      unit: '°C',
      generate: (ctx) => {
        const base = dailyCycle(22, 5);
        const noise = gaussianRandom(0, 0.4);
        const drift = (Date.now() - ctx.startTime) / (1000 * 60 * 60) * 0.01;
        const value = base + noise + drift;
        return parseFloat(clamp(value, 15, 35).toFixed(2));
      },
    },
    {
      name: 'humidity',
      unit: '%',
      generate: (ctx) => {
        const base = dailyCycle(55, -15);
        const noise = gaussianRandom(0, 3);
        const value = base + noise;
        return parseFloat(clamp(value, 30, 80).toFixed(1));
      },
    },
    {
      name: 'pressure',
      unit: 'hPa',
      generate: (ctx) => {
        const base = dailyCycle(1010, 8);
        const noise = gaussianRandom(0, 2);
        const spike = randomSpike(0, 15, 0.02);
        const value = base + noise + spike;
        return parseFloat(clamp(value, 980, 1030).toFixed(1));
      },
    },
  ],
  metadata: {
    manufacturer: 'CortexGrid Simulated Devices',
    model: 'CG-THP-200',
    firmwareVersion: '2.1.0',
    measurementRange: '15-35°C / 30-80% / 980-1030 hPa',
  },
  defaultInterval: 5000,
};

// ---------------------------------------------------------------------------
// Humidity Sensor Profile
// ---------------------------------------------------------------------------
export const HumiditySensor: DeviceProfile = {
  type: 'humidity_sensor',
  description: 'Simulates relative humidity and dew point temperature',
  metrics: [
    {
      name: 'humidity',
      unit: '%',
      generate: (ctx) => {
        const base = dailyCycle(60, -20);
        const noise = gaussianRandom(0, 4);
        const spike = randomSpike(0, 10, 0.03);
        const value = base + noise + spike;
        return parseFloat(clamp(value, 20, 95).toFixed(1));
      },
    },
    {
      name: 'dewPoint',
      unit: '°C',
      generate: (ctx) => {
        const humidity = ctx.previousValues['humidity'] ?? 60;
        const temp = ctx.previousValues['temperature'] ?? 22;
        // Magnus formula approximation
        const a = 17.27;
        const b = 237.7;
        const alpha = (a * temp) / (b + temp) + Math.log(humidity / 100);
        const dewPoint = (b * alpha) / (a - alpha);
        return parseFloat(clamp(dewPoint, -10, 30).toFixed(2));
      },
    },
    {
      name: 'absoluteHumidity',
      unit: 'g/m³',
      generate: (ctx) => {
        const humidity = ctx.previousValues['humidity'] ?? 60;
        const temp = ctx.previousValues['temperature'] ?? 22;
        // Approximation: AH = (6.112 * e^(17.67*T/(T+243.5)) * RH * 2.1674) / (273.15+T)
        const e = Math.exp((17.67 * temp) / (temp + 243.5));
        const ah = (6.112 * e * humidity * 2.1674) / (273.15 + temp);
        return parseFloat(ah.toFixed(2));
      },
    },
  ],
  metadata: {
    manufacturer: 'CortexGrid Simulated Devices',
    model: 'CG-HUM-150',
    firmwareVersion: '1.8.3',
    measurementRange: '20-95% RH',
  },
  defaultInterval: 5000,
};

// ---------------------------------------------------------------------------
// Pressure Sensor Profile
// ---------------------------------------------------------------------------
export const PressureSensor: DeviceProfile = {
  type: 'pressure_sensor',
  description: 'Simulates atmospheric pressure and altitude estimate',
  metrics: [
    {
      name: 'pressure',
      unit: 'hPa',
      generate: (ctx) => {
        const base = dailyCycle(1013, 12);
        const noise = gaussianRandom(0, 3);
        const spike = randomSpike(0, 25, 0.015);
        const value = base + noise + spike;
        return parseFloat(clamp(value, 950, 1050).toFixed(1));
      },
    },
    {
      name: 'altitude',
      unit: 'm',
      generate: (ctx) => {
        const pressure = ctx.previousValues['pressure'] ?? 1013;
        // Barometric formula: h = 44330 * (1 - (P/1013.25)^0.1903)
        const altitude = 44330 * (1 - Math.pow(pressure / 1013.25, 0.1903));
        return parseFloat(altitude.toFixed(1));
      },
    },
    {
      name: 'pressureTrend',
      unit: '',
      generate: (ctx) => {
        const current = ctx.previousValues['pressure'] ?? 1013;
        const previous = ctx.previousValues['pressure_prev'] ?? current;
        const diff = current - previous;
        if (diff > 0.5) return 'rising';
        if (diff < -0.5) return 'falling';
        return 'steady';
      },
    },
  ],
  metadata: {
    manufacturer: 'CortexGrid Simulated Devices',
    model: 'CG-BAR-300',
    firmwareVersion: '3.0.1',
    measurementRange: '950-1050 hPa',
  },
  defaultInterval: 5000,
};

// ---------------------------------------------------------------------------
// Motion Detector Profile
// ---------------------------------------------------------------------------
export const MotionDetector: DeviceProfile = {
  type: 'motion_detector',
  description: 'Simulates motion detection with velocity and acceleration data',
  metrics: [
    {
      name: 'motionDetected',
      unit: '',
      generate: (ctx) => {
        // ~30% chance of motion at any given reading
        return Math.random() < 0.3;
      },
    },
    {
      name: 'velocity',
      unit: 'm/s',
      generate: (ctx) => {
        const motionDetected = ctx.previousValues['motionDetected'] ?? 0;
        if (motionDetected === 0) return 0;
        const base = randomInRange(0.5, 3.0);
        const noise = gaussianRandom(0, 0.2);
        return parseFloat(clamp(base + noise, 0, 5).toFixed(2));
      },
    },
    {
      name: 'acceleration',
      unit: 'm/s²',
      generate: (ctx) => {
        const motionDetected = ctx.previousValues['motionDetected'] ?? 0;
        if (motionDetected === 0) return 0;
        const base = randomInRange(0.1, 2.0);
        const noise = gaussianRandom(0, 0.15);
        return parseFloat(clamp(Math.abs(base + noise), 0, 4).toFixed(2));
      },
    },
    {
      name: 'activityLevel',
      unit: '',
      generate: (ctx) => {
        const motionDetected = ctx.previousValues['motionDetected'] ?? 0;
        if (!motionDetected) return 'idle';
        const r = Math.random();
        if (r < 0.4) return 'low';
        if (r < 0.8) return 'medium';
        return 'high';
      },
    },
  ],
  metadata: {
    manufacturer: 'CortexGrid Simulated Devices',
    model: 'CG-MOT-100',
    firmwareVersion: '1.2.0',
    detectionRange: '0-10m',
    sensitivity: 'adjustable',
  },
  defaultInterval: 2000,
};

// ---------------------------------------------------------------------------
// Power Meter Profile
// ---------------------------------------------------------------------------
export const PowerMeter: DeviceProfile = {
  type: 'power_meter',
  description: 'Simulates electrical measurements: voltage, current, power, and energy',
  metrics: [
    {
      name: 'voltage',
      unit: 'V',
      generate: (ctx) => {
        const base = dailyCycle(230, 3);
        const noise = gaussianRandom(0, 1.5);
        const spike = randomSpike(0, 8, 0.02);
        const value = base + noise + spike;
        return parseFloat(clamp(value, 220, 240).toFixed(1));
      },
    },
    {
      name: 'current',
      unit: 'A',
      generate: (ctx) => {
        // Current follows a daily usage pattern
        const hour = new Date().getHours();
        const dayFactor =
          hour >= 7 && hour <= 22
            ? 1.5 + Math.sin(((hour - 7) / 15) * Math.PI) * 1.5
            : 0.3;
        const base = dayFactor * 5;
        const noise = gaussianRandom(0, 1.0);
        const spike = randomSpike(0, 8, 0.03);
        const value = base + noise + spike;
        return parseFloat(clamp(value, 0, 30).toFixed(2));
      },
    },
    {
      name: 'power',
      unit: 'W',
      generate: (ctx) => {
        const voltage = ctx.previousValues['voltage'] ?? 230;
        const current = ctx.previousValues['current'] ?? 5;
        const power = voltage * current;
        // Apply power factor of ~0.95
        const pf = 0.93 + Math.random() * 0.06;
        return parseFloat((power * pf).toFixed(1));
      },
    },
    {
      name: 'energy',
      unit: 'kWh',
      generate: (ctx) => {
        // Accumulated energy: increment based on power and interval
        const power = ctx.previousValues['power'] ?? 1000;
        const previousEnergy = ctx.previousValues['energy'] ?? 0;
        const intervalHours = 5 / 3600000; // assuming 5s interval
        const increment = (power / 1000) * intervalHours;
        return parseFloat((previousEnergy + increment).toFixed(4));
      },
    },
    {
      name: 'powerFactor',
      unit: '',
      generate: () => {
        const pf = 0.92 + Math.random() * 0.07;
        return parseFloat(pf.toFixed(3));
      },
    },
  ],
  metadata: {
    manufacturer: 'CortexGrid Simulated Devices',
    model: 'CG-PWR-500',
    firmwareVersion: '4.2.1',
    voltageRange: '220-240V',
    maxCurrent: '30A',
  },
  defaultInterval: 5000,
};

// ---------------------------------------------------------------------------
// Gas Sensor Profile
// ---------------------------------------------------------------------------
export const GasSensor: DeviceProfile = {
  type: 'gas_sensor',
  description: 'Simulates air quality measurements: CO2, CO, and VOC levels',
  metrics: [
    {
      name: 'co2',
      unit: 'ppm',
      generate: (ctx) => {
        const hour = new Date().getHours();
        // CO2 higher during occupied hours
        const occupancyFactor =
          hour >= 8 && hour <= 18 ? 1.5 : 0.8;
        const base = 500 * occupancyFactor;
        const noise = gaussianRandom(0, 40);
        const spike = randomSpike(0, 400, 0.03);
        const value = base + noise + spike;
        return parseFloat(clamp(value, 400, 2000).toFixed(0));
      },
    },
    {
      name: 'co',
      unit: 'ppm',
      generate: () => {
        const base = 0.5;
        const noise = gaussianRandom(0, 0.3);
        const spike = randomSpike(0, 5, 0.02);
        const value = base + noise + spike;
        return parseFloat(clamp(value, 0, 50).toFixed(2));
      },
    },
    {
      name: 'voc',
      unit: 'ppb',
      generate: () => {
        const base = randomInRange(50, 200);
        const noise = gaussianRandom(0, 20);
        const spike = randomSpike(0, 150, 0.04);
        const value = base + noise + spike;
        return parseFloat(clamp(value, 0, 1000).toFixed(0));
      },
    },
    {
      name: 'airQualityIndex',
      unit: '',
      generate: (ctx) => {
        const co2 = ctx.previousValues['co2'] ?? 500;
        const voc = ctx.previousValues['voc'] ?? 100;
        const co = ctx.previousValues['co'] ?? 0.5;
        // Simple AQI approximation
        const co2Score = Math.min(100, ((co2 - 400) / 1600) * 100);
        const vocScore = Math.min(100, (voc / 1000) * 100);
        const coScore = Math.min(100, (co / 50) * 100);
        const aqi = (co2Score + vocScore + coScore) / 3;
        return parseFloat(clamp(aqi, 0, 100).toFixed(1));
      },
    },
  ],
  metadata: {
    manufacturer: 'CortexGrid Simulated Devices',
    model: 'CG-GAS-400',
    firmwareVersion: '2.5.0',
    co2Range: '400-2000 ppm',
    coRange: '0-50 ppm',
    vocRange: '0-1000 ppb',
  },
  defaultInterval: 5000,
};

// ---------------------------------------------------------------------------
// Profile Registry
// ---------------------------------------------------------------------------
export const DEVICE_PROFILES: Record<string, DeviceProfile> = {
  temperature_sensor: TemperatureSensor,
  humidity_sensor: HumiditySensor,
  pressure_sensor: PressureSensor,
  motion_detector: MotionDetector,
  power_meter: PowerMeter,
  gas_sensor: GasSensor,
};

export function getProfile(type: string): DeviceProfile | undefined {
  return DEVICE_PROFILES[type];
}

export function getAllProfileTypes(): string[] {
  return Object.keys(DEVICE_PROFILES);
}
