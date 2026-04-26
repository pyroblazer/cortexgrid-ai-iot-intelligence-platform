import { v4 as uuidv4 } from 'uuid';
import {
  DeviceProfile,
  SimulationContext,
  createSimulationContext,
  TemperatureSensor,
  HumiditySensor,
  PressureSensor,
  MotionDetector,
  PowerMeter,
  GasSensor,
} from './device-profile';
import { MqttClient } from '../mqtt/mqtt-client';
import { telemetryTopic } from '../mqtt/topics';
import { logger } from '../utils/logger';

export interface DeviceConfig {
  id: string;
  name: string;
  profile: DeviceProfile;
  interval: number;
}

export interface DeviceStatistics {
  deviceId: string;
  deviceName: string;
  messagesSent: number;
  startTime: number;
  lastMessageTime: number | null;
  errors: number;
}

interface ActiveSimulation {
  config: DeviceConfig;
  timer: ReturnType<typeof setInterval>;
  context: SimulationContext;
  statistics: DeviceStatistics;
}

export class DeviceSimulator {
  private readonly devices: ActiveSimulation[] = [];
  private readonly orgId: string;
  private readonly mqttClient: MqttClient;
  private running = false;

  constructor(orgId: string, mqttClient: MqttClient, deviceConfigs: DeviceConfig[]) {
    this.orgId = orgId;
    this.mqttClient = mqttClient;

    for (const config of deviceConfigs) {
      const now = Date.now();
      this.devices.push({
        config,
        timer: null as unknown as ReturnType<typeof setInterval>,
        context: createSimulationContext(now),
        statistics: {
          deviceId: config.id,
          deviceName: config.name,
          messagesSent: 0,
          startTime: now,
          lastMessageTime: null,
          errors: 0,
        },
      });
    }
  }

  start(): void {
    if (this.running) {
      logger.warn('DeviceSimulator is already running');
      return;
    }

    this.running = true;
    logger.info(`Starting simulator with ${this.devices.length} device(s)`);

    for (const sim of this.devices) {
      logger.info(
        `Starting device: ${sim.config.name} (${sim.config.profile.type}) with interval ${sim.config.interval}ms`,
      );

      // Stagger start times to avoid all devices publishing simultaneously
      const initialDelay = Math.random() * 1000;
      setTimeout(() => {
        this.tick(sim);
        sim.timer = setInterval(() => this.tick(sim), sim.config.interval);
      }, initialDelay);
    }
  }

  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;
    logger.info('Stopping device simulator...');

    for (const sim of this.devices) {
      if (sim.timer) {
        clearInterval(sim.timer);
        sim.timer = null as unknown as ReturnType<typeof setInterval>;
      }
    }

    logger.info('All device simulations stopped');
    this.logStatistics();
  }

  isRunning(): boolean {
    return this.running;
  }

  getStatistics(): DeviceStatistics[] {
    return this.devices.map((sim) => ({ ...sim.statistics }));
  }

  private async tick(sim: ActiveSimulation): Promise<void> {
    const { config, context, statistics } = sim;
    const profile = config.profile;

    context.timestamp = Date.now();
    context.sequenceNumber++;

    const telemetry = this.generateTelemetry(profile, context);
    const topic = telemetryTopic(this.orgId, config.id);

    const message = {
      deviceId: config.id,
      deviceName: config.name,
      deviceType: profile.type,
      organizationId: this.orgId,
      timestamp: context.timestamp,
      sequenceNumber: context.sequenceNumber,
      telemetry,
      metadata: {
        ...profile.metadata,
        simulation: true,
      },
    };

    try {
      const payload = JSON.stringify(message);
      await this.mqttClient.publish(topic, payload);
      statistics.messagesSent++;
      statistics.lastMessageTime = context.timestamp;

      logger.debug(`Published telemetry for ${config.name}`, {
        deviceId: config.id,
        topic,
        seq: context.sequenceNumber,
      });
    } catch (err) {
      statistics.errors++;
      logger.error(`Failed to publish telemetry for ${config.name}`, {
        deviceId: config.id,
        error: (err as Error).message,
      });
    }
  }

  private generateTelemetry(
    profile: DeviceProfile,
    context: SimulationContext,
  ): Record<string, { value: number | boolean | string; unit: string }> {
    const telemetry: Record<string, { value: number | boolean | string; unit: string }> = {};

    for (const metric of profile.metrics) {
      const rawValue = metric.generate(context);

      // Store previous values for inter-metric dependencies (e.g., dew point depends on humidity)
      if (typeof rawValue === 'number') {
        const prevKey = `${metric.name}_prev`;
        if (context.previousValues[metric.name] !== undefined) {
          context.previousValues[prevKey] = context.previousValues[metric.name];
        }
        context.previousValues[metric.name] = rawValue;
      } else if (typeof rawValue === 'boolean') {
        context.previousValues[metric.name] = rawValue ? 1 : 0;
      }

      telemetry[metric.name] = {
        value: rawValue,
        unit: metric.unit,
      };
    }

    return telemetry;
  }

  private logStatistics(): void {
    logger.info('--- Device Simulation Statistics ---');
    for (const sim of this.devices) {
      const stats = sim.statistics;
      const uptimeSeconds = Math.round((Date.now() - stats.startTime) / 1000);
      const hours = Math.floor(uptimeSeconds / 3600);
      const minutes = Math.floor((uptimeSeconds % 3600) / 60);
      const seconds = uptimeSeconds % 60;

      logger.info(
        `Device: ${stats.deviceName} | Messages: ${stats.messagesSent} | Errors: ${stats.errors} | Uptime: ${hours}h ${minutes}m ${seconds}s`,
      );
    }
    logger.info('------------------------------------');
  }
}

// ---------------------------------------------------------------------------
// Helper: Create default device fleet
// ---------------------------------------------------------------------------
export function createDefaultDeviceConfigs(): DeviceConfig[] {
  return [
    {
      id: uuidv4(),
      name: 'TempSensor-Lab-01',
      profile: TemperatureSensor,
      interval: TemperatureSensor.defaultInterval,
    },
    {
      id: uuidv4(),
      name: 'TempSensor-Lab-02',
      profile: TemperatureSensor,
      interval: TemperatureSensor.defaultInterval,
    },
    {
      id: uuidv4(),
      name: 'HumiditySensor-Room-A1',
      profile: HumiditySensor,
      interval: HumiditySensor.defaultInterval,
    },
    {
      id: uuidv4(),
      name: 'PressureSensor-Rooftop',
      profile: PressureSensor,
      interval: PressureSensor.defaultInterval,
    },
    {
      id: uuidv4(),
      name: 'MotionDetector-Hallway-B2',
      profile: MotionDetector,
      interval: MotionDetector.defaultInterval,
    },
    {
      id: uuidv4(),
      name: 'PowerMeter-MainPanel',
      profile: PowerMeter,
      interval: PowerMeter.defaultInterval,
    },
    {
      id: uuidv4(),
      name: 'GasSensor-Kitchen-01',
      profile: GasSensor,
      interval: GasSensor.defaultInterval,
    },
  ];
}
