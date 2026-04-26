import dotenv from 'dotenv';
import { parseConfig } from './config/simulator.config';
import { MqttClient } from './mqtt/mqtt-client';
import { DeviceSimulator, createDefaultDeviceConfigs } from './devices/device-simulator';
import { logger } from './utils/logger';

// Load environment variables from .env file
dotenv.config();

async function bootstrap(): Promise<void> {
  logger.info('=== CortexGrid IoT Simulator Starting ===');

  // Parse and validate configuration
  let config;
  try {
    config = parseConfig(process.env);
    logger.info('Configuration validated successfully', { orgId: config.organizationId });
  } catch (err) {
    logger.error('Invalid configuration', { error: (err as Error).message });
    process.exit(1);
  }

  // Update logger level from config
  logger.level = config.logLevel;

  // Create MQTT client
  const mqttClient = new MqttClient({
    brokerUrl: config.mqttBrokerUrl,
    username: config.mqttUsername,
    password: config.mqttPassword,
    clientId: `cortexgrid-iot-simulator-${Date.now()}`,
  });

  // Create device simulator with default fleet
  const deviceConfigs = createDefaultDeviceConfigs();
  const simulator = new DeviceSimulator(config.organizationId, mqttClient, deviceConfigs);

  // Graceful shutdown handler
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info(`Received ${signal}, shutting down gracefully...`);

    simulator.stop();
    await mqttClient.disconnect();

    logger.info('=== CortexGrid IoT Simulator Stopped ===');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Connect to MQTT broker
  try {
    await mqttClient.connect();
  } catch (err) {
    logger.error('Failed to connect to MQTT broker', { error: (err as Error).message });
    process.exit(1);
  }

  // Start simulation
  simulator.start();

  logger.info(`Simulator running with ${deviceConfigs.length} devices`, {
    orgId: config.organizationId,
    interval: config.simulatorIntervalMs,
    devices: deviceConfigs.map((d) => ({ name: d.name, type: d.profile.type })),
  });

  // Periodic statistics logging every 5 minutes
  setInterval(() => {
    if (simulator.isRunning()) {
      const stats = simulator.getStatistics();
      logger.info('Periodic statistics report', {
        devices: stats.map((s) => ({
          name: s.deviceName,
          messagesSent: s.messagesSent,
          errors: s.errors,
        })),
      });
    }
  }, 5 * 60 * 1000);
}

bootstrap().catch((err) => {
  logger.error('Fatal error during bootstrap', { error: err.message, stack: err.stack });
  process.exit(1);
});
