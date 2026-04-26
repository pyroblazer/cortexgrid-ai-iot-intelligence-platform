import { z } from 'zod';

const simulatorConfigSchema = z.object({
  mqttBrokerUrl: z.string().min(1, 'MQTT broker URL is required'),
  mqttUsername: z.string().min(1, 'MQTT username is required'),
  mqttPassword: z.string().min(1, 'MQTT password is required'),
  organizationId: z.string().min(1, 'Organization ID is required'),
  simulatorIntervalMs: z.coerce
    .number()
    .int()
    .positive('Interval must be a positive integer')
    .default(5000),
  logLevel: z
    .enum(['error', 'warn', 'info', 'debug', 'verbose'])
    .default('info'),
});

export type SimulatorConfig = z.infer<typeof simulatorConfigSchema>;

export function parseConfig(env: Record<string, string | undefined>): SimulatorConfig {
  return simulatorConfigSchema.parse({
    mqttBrokerUrl: env.MQTT_BROKER_URL,
    mqttUsername: env.MQTT_USERNAME,
    mqttPassword: env.MQTT_PASSWORD,
    organizationId: env.ORGANIZATION_ID,
    simulatorIntervalMs: env.SIMULATOR_INTERVAL_MS,
    logLevel: env.LOG_LEVEL,
  });
}
