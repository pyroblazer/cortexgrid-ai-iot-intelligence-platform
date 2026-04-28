import { DeviceSimulator, DeviceConfig } from '../../src/devices/device-simulator';
import { TemperatureSensor } from '../../src/devices/device-profile';

// ---------------------------------------------------------------------------
// Mock MqttClient - we mock the entire module
// ---------------------------------------------------------------------------
jest.mock('../../src/mqtt/mqtt-client', () => {
  return {
    MqttClient: jest.fn().mockImplementation(() => ({
      publish: jest.fn().mockResolvedValue(undefined),
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(true),
    })),
  };
});

// Mock logger to avoid noisy output during tests
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createMockMqttClient() {
  return {
    publish: jest.fn().mockResolvedValue(undefined),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(true),
  };
}

function createTestDeviceConfigs(count: number = 1): DeviceConfig[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `device-${i}`,
    name: `TestDevice-${i}`,
    profile: TemperatureSensor,
    interval: 1000,
  }));
}

/**
 * Advances fake timers and then flushes the microtask queue so that
 * any async operations (like `await mqttClient.publish(...)`) triggered
 * by the timer callbacks have a chance to settle.
 */
async function advanceAndFlush(ms: number): Promise<void> {
  jest.advanceTimersByTime(ms);
  // Flush microtask queue so awaited promises inside tick() resolve
  await Promise.resolve();
  await Promise.resolve();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('DeviceSimulator', () => {
  const orgId = 'test-org';
  let mqttClient: ReturnType<typeof createMockMqttClient>;

  // Cast once for reuse - the DeviceSimulator expects a real MqttClient
  // but we pass a mock object with the same method signatures.
  function asMqttClient(mock: ReturnType<typeof createMockMqttClient>): any {
    return mock;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.clearAllTimers();
    mqttClient = createMockMqttClient();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // constructor
  // ---------------------------------------------------------------------------
  describe('constructor', () => {
    it('should create device entries for each config', () => {
      const configs = createTestDeviceConfigs(3);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);

      const stats = simulator.getStatistics();
      expect(stats).toHaveLength(3);
      expect(stats[0].deviceId).toBe('device-0');
      expect(stats[1].deviceId).toBe('device-1');
      expect(stats[2].deviceId).toBe('device-2');
    });

    it('should initialize statistics with zero messages and errors', () => {
      const configs = createTestDeviceConfigs(1);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);

      const stats = simulator.getStatistics();
      expect(stats[0].messagesSent).toBe(0);
      expect(stats[0].errors).toBe(0);
      expect(stats[0].lastMessageTime).toBeNull();
    });

    it('should set device name from config', () => {
      const configs = createTestDeviceConfigs(1);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);

      const stats = simulator.getStatistics();
      expect(stats[0].deviceName).toBe('TestDevice-0');
    });

    it('should handle empty device configs array', () => {
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), []);
      expect(simulator.getStatistics()).toHaveLength(0);
    });

    it('should set startTime on all devices', () => {
      const configs = createTestDeviceConfigs(2);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);

      const stats = simulator.getStatistics();
      const now = Date.now();
      expect(stats[0].startTime).toBeLessThanOrEqual(now);
      expect(stats[1].startTime).toBeLessThanOrEqual(now);
    });
  });

  // ---------------------------------------------------------------------------
  // start
  // ---------------------------------------------------------------------------
  describe('start', () => {
    it('should begin sending telemetry for each device', async () => {
      const configs = createTestDeviceConfigs(2);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);

      simulator.start();

      // Advance past the max initial stagger delay (0-1000ms) + flush
      await advanceAndFlush(1100);

      // Each device should have published at least one telemetry message
      expect(mqttClient.publish).toHaveBeenCalled();

      // Advance by the device interval to trigger another tick
      await advanceAndFlush(1000);

      // More publishes should have happened
      expect(mqttClient.publish.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('should warn if already running', () => {
      const { logger } = jest.requireMock('../../src/utils/logger');
      const configs = createTestDeviceConfigs(1);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);

      simulator.start();
      simulator.start(); // Second call should warn

      expect(logger.warn).toHaveBeenCalledWith(
        'DeviceSimulator is already running',
      );
    });

    it('should set running state to true', () => {
      const configs = createTestDeviceConfigs(1);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);

      expect(simulator.isRunning()).toBe(false);
      simulator.start();
      expect(simulator.isRunning()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // stop
  // ---------------------------------------------------------------------------
  describe('stop', () => {
    it('should clear all timers', async () => {
      const configs = createTestDeviceConfigs(2);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);

      simulator.start();
      await advanceAndFlush(1100); // Get past initial stagger

      const publishCountBefore = mqttClient.publish.mock.calls.length;
      simulator.stop();

      // Advance time further - no new publishes should happen
      await advanceAndFlush(5000);
      const publishCountAfter = mqttClient.publish.mock.calls.length;
      expect(publishCountAfter).toBe(publishCountBefore);
    });

    it('should do nothing if not running', () => {
      const { logger } = jest.requireMock('../../src/utils/logger');
      const configs = createTestDeviceConfigs(1);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);

      // Stop without start - should be a no-op
      simulator.stop();

      // Should not log "Stopping device simulator..." since it wasn't running
      expect(logger.info).not.toHaveBeenCalledWith(
        'Stopping device simulator...',
      );
    });

    it('should set running state to false', () => {
      const configs = createTestDeviceConfigs(1);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);

      simulator.start();
      expect(simulator.isRunning()).toBe(true);

      simulator.stop();
      expect(simulator.isRunning()).toBe(false);
    });

    it('should log statistics after stopping', async () => {
      const { logger } = jest.requireMock('../../src/utils/logger');
      const configs = createTestDeviceConfigs(1);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);

      simulator.start();
      await advanceAndFlush(1100);
      simulator.stop();

      expect(logger.info).toHaveBeenCalledWith(
        '--- Device Simulation Statistics ---',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // isRunning
  // ---------------------------------------------------------------------------
  describe('isRunning', () => {
    it('should return false initially', () => {
      const configs = createTestDeviceConfigs(1);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);
      expect(simulator.isRunning()).toBe(false);
    });

    it('should return true after start', () => {
      const configs = createTestDeviceConfigs(1);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);
      simulator.start();
      expect(simulator.isRunning()).toBe(true);
    });

    it('should return false after stop', () => {
      const configs = createTestDeviceConfigs(1);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);
      simulator.start();
      simulator.stop();
      expect(simulator.isRunning()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // getStatistics
  // ---------------------------------------------------------------------------
  describe('getStatistics', () => {
    it('should return stats for all devices', () => {
      const configs = createTestDeviceConfigs(3);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);

      const stats = simulator.getStatistics();
      expect(stats).toHaveLength(3);
      for (let i = 0; i < 3; i++) {
        expect(stats[i].deviceId).toBe(`device-${i}`);
        expect(stats[i].deviceName).toBe(`TestDevice-${i}`);
      }
    });

    it('should return a copy (not internal reference)', () => {
      const configs = createTestDeviceConfigs(1);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);

      const stats1 = simulator.getStatistics();
      const stats2 = simulator.getStatistics();
      expect(stats1).not.toBe(stats2);
      expect(stats1[0]).not.toBe(stats2[0]);
    });

    it('should reflect updated stats after ticks', async () => {
      const configs = createTestDeviceConfigs(1);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);

      simulator.start();
      await advanceAndFlush(1100); // Trigger first tick

      const stats = simulator.getStatistics();
      expect(stats[0].messagesSent).toBeGreaterThan(0);
      expect(stats[0].lastMessageTime).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // tick behavior (tested via integration with start)
  // ---------------------------------------------------------------------------
  describe('tick', () => {
    it('should generate telemetry and publish to MQTT', async () => {
      const configs = createTestDeviceConfigs(1);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);

      simulator.start();
      await advanceAndFlush(1100);

      expect(mqttClient.publish).toHaveBeenCalled();

      const [topic, payloadStr] = mqttClient.publish.mock.calls[0];
      expect(topic).toBe('cortexgrid/test-org/devices/device-0/telemetry');

      const payload = JSON.parse(payloadStr);
      expect(payload.deviceId).toBe('device-0');
      expect(payload.deviceName).toBe('TestDevice-0');
      expect(payload.deviceType).toBe('temperature_sensor');
      expect(payload.organizationId).toBe('test-org');
      expect(payload.sequenceNumber).toBe(1);
      expect(payload.telemetry).toBeDefined();
      expect(payload.metadata.simulation).toBe(true);
    });

    it('should increment messagesSent on successful publish', async () => {
      const configs = createTestDeviceConfigs(1);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);

      simulator.start();
      await advanceAndFlush(1100);

      const stats = simulator.getStatistics();
      expect(stats[0].messagesSent).toBe(1);
      expect(stats[0].errors).toBe(0);
    });

    it('should track messages sent and errors on publish failure', async () => {
      mqttClient.publish.mockRejectedValue(new Error('MQTT publish failed'));

      const configs = createTestDeviceConfigs(1);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);

      simulator.start();
      await advanceAndFlush(1100);

      const stats = simulator.getStatistics();
      expect(stats[0].errors).toBe(1);
      expect(stats[0].messagesSent).toBe(0);
    });

    it('should increment sequence number on each tick', async () => {
      const configs = createTestDeviceConfigs(1);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);

      simulator.start();
      await advanceAndFlush(1100); // First tick
      await advanceAndFlush(1000); // Second tick

      expect(mqttClient.publish.mock.calls.length).toBeGreaterThanOrEqual(2);

      const payload1 = JSON.parse(mqttClient.publish.mock.calls[0][1]);
      const payload2 = JSON.parse(mqttClient.publish.mock.calls[1][1]);
      expect(payload2.sequenceNumber).toBeGreaterThan(payload1.sequenceNumber);
    });

    it('should include timestamp in telemetry message', async () => {
      const configs = createTestDeviceConfigs(1);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);

      simulator.start();
      await advanceAndFlush(1100);

      const payload = JSON.parse(mqttClient.publish.mock.calls[0][1]);
      expect(typeof payload.timestamp).toBe('number');
      expect(payload.timestamp).toBeGreaterThan(0);
    });

    it('should include device profile metadata', async () => {
      const configs = createTestDeviceConfigs(1);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);

      simulator.start();
      await advanceAndFlush(1100);

      const payload = JSON.parse(mqttClient.publish.mock.calls[0][1]);
      expect(payload.metadata.manufacturer).toBe('CortexGrid Simulated Devices');
      expect(payload.metadata.model).toBe('CG-THP-200');
      expect(payload.metadata.simulation).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // generateTelemetry (tested indirectly)
  // ---------------------------------------------------------------------------
  describe('generateTelemetry', () => {
    it('should produce metrics with value and unit', async () => {
      const configs = createTestDeviceConfigs(1);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);

      simulator.start();
      await advanceAndFlush(1100);

      const payload = JSON.parse(mqttClient.publish.mock.calls[0][1]);
      const telemetry = payload.telemetry;

      // TemperatureSensor has metrics: temperature, humidity, pressure
      expect(telemetry).toHaveProperty('temperature');
      expect(telemetry).toHaveProperty('humidity');
      expect(telemetry).toHaveProperty('pressure');

      for (const key of Object.keys(telemetry)) {
        expect(telemetry[key]).toHaveProperty('value');
        expect(telemetry[key]).toHaveProperty('unit');
        expect(typeof telemetry[key].unit).toBe('string');
      }
    });

    it('should produce numeric values for temperature, humidity, pressure', async () => {
      const configs = createTestDeviceConfigs(1);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);

      simulator.start();
      await advanceAndFlush(1100);

      const payload = JSON.parse(mqttClient.publish.mock.calls[0][1]);
      const telemetry = payload.telemetry;

      expect(typeof telemetry.temperature.value).toBe('number');
      expect(typeof telemetry.humidity.value).toBe('number');
      expect(typeof telemetry.pressure.value).toBe('number');
    });

    it('should track previousValues for inter-metric dependencies', async () => {
      const configs = createTestDeviceConfigs(1);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);

      simulator.start();
      // Run multiple ticks
      await advanceAndFlush(1100);
      await advanceAndFlush(1000);
      await advanceAndFlush(1000);

      // After multiple ticks, the telemetry values should still be within
      // expected bounds (proving the context/previousValues tracking works)
      for (const call of mqttClient.publish.mock.calls) {
        const payload = JSON.parse(call[1]);
        const t = payload.telemetry;
        expect(t.temperature.value).toBeGreaterThanOrEqual(15);
        expect(t.temperature.value).toBeLessThanOrEqual(35);
        expect(t.humidity.value).toBeGreaterThanOrEqual(30);
        expect(t.humidity.value).toBeLessThanOrEqual(80);
        expect(t.pressure.value).toBeGreaterThanOrEqual(980);
        expect(t.pressure.value).toBeLessThanOrEqual(1030);
      }
    });

    it('should update lastMessageTime on successful tick', async () => {
      const configs = createTestDeviceConfigs(1);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);

      simulator.start();
      await advanceAndFlush(1100);

      const stats = simulator.getStatistics();
      expect(stats[0].lastMessageTime).not.toBeNull();
      expect(typeof stats[0].lastMessageTime).toBe('number');
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple devices
  // ---------------------------------------------------------------------------
  describe('multiple devices', () => {
    it('should publish telemetry for each device independently', async () => {
      const configs = createTestDeviceConfigs(3);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);

      simulator.start();
      await advanceAndFlush(2100); // Enough for stagger + tick

      // Each device should have published
      const topics = mqttClient.publish.mock.calls.map((call: any[]) => call[0]);
      expect(topics).toContain('cortexgrid/test-org/devices/device-0/telemetry');
      expect(topics).toContain('cortexgrid/test-org/devices/device-1/telemetry');
      expect(topics).toContain('cortexgrid/test-org/devices/device-2/telemetry');
    });

    it('should track statistics independently for each device', async () => {
      const configs = createTestDeviceConfigs(2);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);

      simulator.start();
      await advanceAndFlush(2100);

      const stats = simulator.getStatistics();
      expect(stats).toHaveLength(2);
      // Both should have sent messages
      expect(stats[0].messagesSent).toBeGreaterThan(0);
      expect(stats[1].messagesSent).toBeGreaterThan(0);
    });

    it('should stop all devices cleanly', async () => {
      const configs = createTestDeviceConfigs(3);
      const simulator = new DeviceSimulator(orgId, asMqttClient(mqttClient), configs);

      simulator.start();
      await advanceAndFlush(1100);
      simulator.stop();

      const publishCount = mqttClient.publish.mock.calls.length;
      await advanceAndFlush(10000);

      // No new messages after stop
      expect(mqttClient.publish.mock.calls.length).toBe(publishCount);
    });
  });
});
