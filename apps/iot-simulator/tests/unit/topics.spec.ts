import {
  telemetryTopic,
  statusTopic,
  commandTopic,
  buildTopic,
} from '../../src/mqtt/topics';

describe('topics', () => {
  const orgId = 'org-42';
  const deviceId = 'device-abc';

  describe('telemetryTopic', () => {
    it('should return correct pattern', () => {
      expect(telemetryTopic(orgId, deviceId)).toBe(
        'cortexgrid/org-42/devices/device-abc/telemetry',
      );
    });

    it('should use different orgId values', () => {
      expect(telemetryTopic('my-org', deviceId)).toBe(
        'cortexgrid/my-org/devices/device-abc/telemetry',
      );
    });

    it('should use different deviceId values', () => {
      expect(telemetryTopic(orgId, 'sensor-01')).toBe(
        'cortexgrid/org-42/devices/sensor-01/telemetry',
      );
    });

    it('should handle UUID-style IDs', () => {
      const uuidOrg = '550e8400-e29b-41d4-a716-446655440000';
      const uuidDev = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      expect(telemetryTopic(uuidOrg, uuidDev)).toBe(
        `cortexgrid/${uuidOrg}/devices/${uuidDev}/telemetry`,
      );
    });

    it('should always start with cortexgrid prefix', () => {
      const result = telemetryTopic(orgId, deviceId);
      expect(result.startsWith('cortexgrid/')).toBe(true);
    });
  });

  describe('statusTopic', () => {
    it('should return correct pattern', () => {
      expect(statusTopic(orgId, deviceId)).toBe(
        'cortexgrid/org-42/devices/device-abc/status',
      );
    });

    it('should end with /status', () => {
      expect(statusTopic('x', 'y').endsWith('/status')).toBe(true);
    });

    it('should embed both orgId and deviceId', () => {
      const result = statusTopic('myOrg', 'myDev');
      expect(result).toContain('myOrg');
      expect(result).toContain('myDev');
    });
  });

  describe('commandTopic', () => {
    it('should return correct pattern', () => {
      expect(commandTopic(orgId, deviceId)).toBe(
        'cortexgrid/org-42/devices/device-abc/commands',
      );
    });

    it('should end with /commands', () => {
      expect(commandTopic('x', 'y').endsWith('/commands')).toBe(true);
    });
  });

  describe('buildTopic', () => {
    it('should return correct generic pattern with custom type', () => {
      expect(buildTopic(orgId, deviceId, 'telemetry')).toBe(
        'cortexgrid/org-42/devices/device-abc/telemetry',
      );
    });

    it('should match telemetryTopic when type is telemetry', () => {
      expect(buildTopic(orgId, deviceId, 'telemetry')).toBe(
        telemetryTopic(orgId, deviceId),
      );
    });

    it('should match statusTopic when type is status', () => {
      expect(buildTopic(orgId, deviceId, 'status')).toBe(
        statusTopic(orgId, deviceId),
      );
    });

    it('should match commandTopic when type is commands', () => {
      expect(buildTopic(orgId, deviceId, 'commands')).toBe(
        commandTopic(orgId, deviceId),
      );
    });

    it('should handle arbitrary custom type suffixes', () => {
      expect(buildTopic('org1', 'dev1', 'custom-event')).toBe(
        'cortexgrid/org1/devices/dev1/custom-event',
      );
    });

    it('should handle empty orgId or deviceId gracefully', () => {
      expect(buildTopic('', deviceId, 'telemetry')).toBe(
        `cortexgrid//devices/${deviceId}/telemetry`,
      );
      expect(buildTopic(orgId, '', 'telemetry')).toBe(
        `cortexgrid/${orgId}/devices//telemetry`,
      );
    });
  });

  describe('topic consistency', () => {
    it('all topic builders should produce a string with 5 segments separated by /', () => {
      const topics = [
        telemetryTopic(orgId, deviceId),
        statusTopic(orgId, deviceId),
        commandTopic(orgId, deviceId),
        buildTopic(orgId, deviceId, 'custom'),
      ];
      for (const topic of topics) {
        const parts = topic.split('/');
        // cortexgrid / orgId / devices / deviceId / type
        expect(parts).toHaveLength(5);
        expect(parts[0]).toBe('cortexgrid');
        expect(parts[1]).toBe(orgId);
        expect(parts[2]).toBe('devices');
        expect(parts[3]).toBe(deviceId);
      }
    });
  });
});
