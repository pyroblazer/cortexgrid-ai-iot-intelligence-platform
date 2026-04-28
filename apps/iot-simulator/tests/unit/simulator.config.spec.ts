import { parseConfig } from '../../src/config/simulator.config';

describe('parseConfig', () => {
  const validEnv: Record<string, string | undefined> = {
    MQTT_BROKER_URL: 'mqtt://localhost:1883',
    MQTT_USERNAME: 'testuser',
    MQTT_PASSWORD: 'testpass',
    ORGANIZATION_ID: 'org-123',
  };

  it('should validate and return config with valid env', () => {
    const config = parseConfig(validEnv);
    expect(config).toEqual({
      mqttBrokerUrl: 'mqtt://localhost:1883',
      mqttUsername: 'testuser',
      mqttPassword: 'testpass',
      organizationId: 'org-123',
      simulatorIntervalMs: 5000,
      logLevel: 'info',
    });
  });

  it('should apply defaults for optional fields (simulatorIntervalMs: 5000, logLevel: info)', () => {
    const config = parseConfig(validEnv);
    expect(config.simulatorIntervalMs).toBe(5000);
    expect(config.logLevel).toBe('info');
  });

  it('should reject missing mqttBrokerUrl', () => {
    const env = { ...validEnv, MQTT_BROKER_URL: undefined };
    expect(() => parseConfig(env)).toThrow(/mqttBrokerUrl/i);
  });

  it('should reject empty mqttBrokerUrl', () => {
    const env = { ...validEnv, MQTT_BROKER_URL: '' };
    expect(() => parseConfig(env)).toThrow('MQTT broker URL is required');
  });

  it('should reject missing mqttUsername', () => {
    const env = { ...validEnv, MQTT_USERNAME: undefined };
    expect(() => parseConfig(env)).toThrow(/mqttUsername/i);
  });

  it('should reject empty mqttUsername', () => {
    const env = { ...validEnv, MQTT_USERNAME: '' };
    expect(() => parseConfig(env)).toThrow('MQTT username is required');
  });

  it('should reject missing mqttPassword', () => {
    const env = { ...validEnv, MQTT_PASSWORD: undefined };
    expect(() => parseConfig(env)).toThrow(/mqttPassword/i);
  });

  it('should reject empty mqttPassword', () => {
    const env = { ...validEnv, MQTT_PASSWORD: '' };
    expect(() => parseConfig(env)).toThrow('MQTT password is required');
  });

  it('should reject missing organizationId', () => {
    const env = { ...validEnv, ORGANIZATION_ID: undefined };
    expect(() => parseConfig(env)).toThrow(/organizationId/i);
  });

  it('should reject empty organizationId', () => {
    const env = { ...validEnv, ORGANIZATION_ID: '' };
    expect(() => parseConfig(env)).toThrow('Organization ID is required');
  });

  it('should coerce simulatorIntervalMs from string to number', () => {
    const env = { ...validEnv, SIMULATOR_INTERVAL_MS: '10000' };
    const config = parseConfig(env);
    expect(config.simulatorIntervalMs).toBe(10000);
    expect(typeof config.simulatorIntervalMs).toBe('number');
  });

  it('should accept a valid custom simulatorIntervalMs', () => {
    const env = { ...validEnv, SIMULATOR_INTERVAL_MS: '2500' };
    const config = parseConfig(env);
    expect(config.simulatorIntervalMs).toBe(2500);
  });

  it('should reject non-positive interval (zero)', () => {
    const env = { ...validEnv, SIMULATOR_INTERVAL_MS: '0' };
    expect(() => parseConfig(env)).toThrow('Interval must be a positive integer');
  });

  it('should reject non-positive interval (negative)', () => {
    const env = { ...validEnv, SIMULATOR_INTERVAL_MS: '-5' };
    expect(() => parseConfig(env)).toThrow('Interval must be a positive integer');
  });

  it('should reject non-integer interval', () => {
    const env = { ...validEnv, SIMULATOR_INTERVAL_MS: '3.14' };
    expect(() => parseConfig(env)).toThrow();
  });

  it('should accept all valid logLevel values', () => {
    const levels = ['error', 'warn', 'info', 'debug', 'verbose'] as const;
    for (const level of levels) {
      const env = { ...validEnv, LOG_LEVEL: level };
      const config = parseConfig(env);
      expect(config.logLevel).toBe(level);
    }
  });

  it('should reject invalid logLevel', () => {
    const env = { ...validEnv, LOG_LEVEL: 'trace' };
    expect(() => parseConfig(env)).toThrow();
  });

  it('should reject completely empty env', () => {
    expect(() => parseConfig({})).toThrow();
  });

  it('should reject when all required fields are undefined', () => {
    const env = {
      MQTT_BROKER_URL: undefined,
      MQTT_USERNAME: undefined,
      MQTT_PASSWORD: undefined,
      ORGANIZATION_ID: undefined,
    };
    expect(() => parseConfig(env)).toThrow();
  });

  it('should accept ws:// broker URLs', () => {
    const env = { ...validEnv, MQTT_BROKER_URL: 'ws://broker.example.com:8083' };
    const config = parseConfig(env);
    expect(config.mqttBrokerUrl).toBe('ws://broker.example.com:8083');
  });

  it('should accept wss:// broker URLs', () => {
    const env = { ...validEnv, MQTT_BROKER_URL: 'wss://secure-broker.example.com:8084' };
    const config = parseConfig(env);
    expect(config.mqttBrokerUrl).toBe('wss://secure-broker.example.com:8084');
  });

  it('should accept mqtts:// broker URLs', () => {
    const env = { ...validEnv, MQTT_BROKER_URL: 'mqtts://secure-broker.example.com:8883' };
    const config = parseConfig(env);
    expect(config.mqttBrokerUrl).toBe('mqtts://secure-broker.example.com:8883');
  });
});
