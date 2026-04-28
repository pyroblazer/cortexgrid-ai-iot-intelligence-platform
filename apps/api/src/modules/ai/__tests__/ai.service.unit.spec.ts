import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { NotFoundException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AiService } from '../ai.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

describe('AiService', () => {
  let service: AiService;
  let prisma: any;
  let httpService: any;

  const mockPrisma = {
    telemetry: {
      findMany: jest.fn(),
    },
    device: {
      findFirst: jest.fn(),
    },
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        OLLAMA_BASE_URL: 'http://localhost:11434',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    prisma = module.get(PrismaService);
    httpService = module.get(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('naturalLanguageQuery', () => {
    it('should return AI response from Ollama', async () => {
      const mockRecords = [
        {
          deviceId: 'device_1',
          metrics: { temperature: 72.5, humidity: 45 },
          timestamp: new Date('2024-01-15T10:00:00Z'),
          device: { id: 'device_1', name: 'Sensor 1', serialNumber: 'SN001' },
        },
        {
          deviceId: 'device_1',
          metrics: { temperature: 73.0, humidity: 44 },
          timestamp: new Date('2024-01-15T11:00:00Z'),
          device: { id: 'device_1', name: 'Sensor 1', serialNumber: 'SN001' },
        },
      ];

      prisma.telemetry.findMany.mockResolvedValue(mockRecords);
      httpService.post.mockReturnValue(
        of({
          data: { response: 'The average temperature was 72.75 degrees.' },
        }),
      );

      const result = await service.naturalLanguageQuery(
        'What was the average temperature?',
        'org_001',
      );

      expect(result.query).toBe('What was the average temperature?');
      expect(result.response).toBe('The average temperature was 72.75 degrees.');
      expect(result.source).toBe('ollama');
      expect(result.dataPoints).toBe(2);
    });

    it('should fall back to statistical summary on Ollama error', async () => {
      const mockRecords = [
        {
          deviceId: 'device_1',
          metrics: { temperature: 70 },
          timestamp: new Date('2024-01-15T10:00:00Z'),
          device: { id: 'device_1', name: 'Sensor 1', serialNumber: 'SN001' },
        },
        {
          deviceId: 'device_1',
          metrics: { temperature: 80 },
          timestamp: new Date('2024-01-15T11:00:00Z'),
          device: { id: 'device_1', name: 'Sensor 1', serialNumber: 'SN001' },
        },
      ];

      prisma.telemetry.findMany.mockResolvedValue(mockRecords);
      // Simulate Ollama returning null (error case)
      httpService.post.mockReturnValue(throwError(() => new Error('Connection refused')));

      const result = await service.naturalLanguageQuery(
        'Show temperature data',
        'org_001',
      );

      expect(result.source).toBe('statistical');
      expect(result.response).toContain('telemetry readings');
      expect(result.dataPoints).toBe(2);
    });

    it('should return "no data" response when no telemetry records found', async () => {
      prisma.telemetry.findMany.mockResolvedValue([]);

      const result = await service.naturalLanguageQuery(
        'Any data?',
        'org_001',
      );

      expect(result.dataPoints).toBe(0);
      expect(result.response).toContain('No telemetry data found');
      expect(result.source).toBe('fallback');
    });

    it('should filter by device IDs when provided', async () => {
      prisma.telemetry.findMany.mockResolvedValue([]);

      await service.naturalLanguageQuery('query', 'org_001', ['device_1', 'device_2']);

      expect(prisma.telemetry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org_001',
            deviceId: { in: ['device_1', 'device_2'] },
          }),
        }),
      );
    });

    it('should use custom time range when provided', async () => {
      prisma.telemetry.findMany.mockResolvedValue([]);

      await service.naturalLanguageQuery('query', 'org_001', undefined, {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-02T00:00:00Z',
      });

      const call = prisma.telemetry.findMany.mock.calls[0][0];
      expect(call.where.timestamp.gte).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(call.where.timestamp.lte).toEqual(new Date('2024-01-02T00:00:00Z'));
    });

    it('should fall back to statistical summary when Ollama returns null response', async () => {
      const mockRecords = [
        {
          deviceId: 'device_1',
          metrics: { temperature: 72 },
          timestamp: new Date('2024-01-15T10:00:00Z'),
          device: { id: 'device_1', name: 'Sensor 1', serialNumber: 'SN001' },
        },
      ];

      prisma.telemetry.findMany.mockResolvedValue(mockRecords);
      httpService.post.mockReturnValue(of({ data: { response: null } }));

      const result = await service.naturalLanguageQuery('query', 'org_001');

      expect(result.source).toBe('statistical');
    });

    it('should fall back to statistical summary when Ollama returns null data', async () => {
      const mockRecords = [
        {
          deviceId: 'device_1',
          metrics: { temperature: 72 },
          timestamp: new Date('2024-01-15T10:00:00Z'),
          device: { id: 'device_1', name: 'Sensor 1', serialNumber: 'SN001' },
        },
      ];

      prisma.telemetry.findMany.mockResolvedValue(mockRecords);
      httpService.post.mockReturnValue(of(null));

      const result = await service.naturalLanguageQuery('query', 'org_001');

      expect(result.source).toBe('statistical');
    });
  });

  describe('detectAnomalies', () => {
    it('should detect anomalies using z-score', async () => {
      prisma.device.findFirst.mockResolvedValue({ id: 'device_1', name: 'Sensor 1' });

      // Create data where most values are around 50, but one is 200 (anomaly)
      const records = [];
      for (let i = 0; i < 10; i++) {
        records.push({
          timestamp: new Date(`2024-01-15T${10 + i}:00:00Z`),
          metrics: { temperature: 50 + Math.random() * 5 },
        });
      }
      // Add an anomalous reading
      records.push({
        timestamp: new Date('2024-01-15T20:00:00Z'),
        metrics: { temperature: 200 },
      });

      prisma.telemetry.findMany.mockResolvedValue(records);
      httpService.post.mockReturnValue(of({ data: { response: 'Temperature spike detected.' } }));

      const result = await service.detectAnomalies('device_1', 'org_001', 'temperature');

      expect(result.deviceId).toBe('device_1');
      expect(result.metric).toBe('temperature');
      expect(result.anomalyCount).toBeGreaterThan(0);
      expect(result.anomalies.length).toBeGreaterThan(0);
      expect(result.statistics).toBeDefined();
      expect(result.statistics!.mean).toBeDefined();
      expect(result.statistics!.stddev).toBeDefined();
    });

    it('should respect sensitivity parameter', async () => {
      prisma.device.findFirst.mockResolvedValue({ id: 'device_1', name: 'Sensor 1' });

      const records = [];
      for (let i = 0; i < 10; i++) {
        records.push({
          timestamp: new Date(`2024-01-15T${10 + i}:00:00Z`),
          metrics: { temperature: 50 },
        });
      }
      // Slightly off values
      records.push({
        timestamp: new Date('2024-01-15T20:00:00Z'),
        metrics: { temperature: 65 },
      });

      prisma.telemetry.findMany.mockResolvedValue(records);
      httpService.post.mockReturnValue(of({ data: { response: 'Explanation' } }));

      // Low sensitivity (more anomalies detected)
      const lowSensitivityResult = await service.detectAnomalies(
        'device_1', 'org_001', 'temperature', undefined, 1.0,
      );

      // High sensitivity (fewer anomalies detected)
      prisma.telemetry.findMany.mockResolvedValue(records);
      const highSensitivityResult = await service.detectAnomalies(
        'device_1', 'org_001', 'temperature', undefined, 3.0,
      );

      // Lower sensitivity should detect more or equal anomalies
      expect(lowSensitivityResult.anomalyCount).toBeGreaterThanOrEqual(
        highSensitivityResult.anomalyCount,
      );
    });

    it('should throw NotFoundException for missing device', async () => {
      prisma.device.findFirst.mockResolvedValue(null);

      await expect(
        service.detectAnomalies('nonexistent', 'org_001', 'temperature'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return empty anomalies when no data available', async () => {
      prisma.device.findFirst.mockResolvedValue({ id: 'device_1', name: 'Sensor 1' });
      prisma.telemetry.findMany.mockResolvedValue([]);

      const result = await service.detectAnomalies('device_1', 'org_001', 'temperature');

      expect(result.anomalyCount).toBe(0);
      expect(result.anomalies).toEqual([]);
      expect(result.statistics).toBeNull();
    });

    it('should return empty anomalies when fewer than 3 data points', async () => {
      prisma.device.findFirst.mockResolvedValue({ id: 'device_1', name: 'Sensor 1' });
      prisma.telemetry.findMany.mockResolvedValue([
        { timestamp: new Date('2024-01-15T10:00:00Z'), metrics: { temperature: 50 } },
        { timestamp: new Date('2024-01-15T11:00:00Z'), metrics: { temperature: 55 } },
      ]);

      const result = await service.detectAnomalies('device_1', 'org_001', 'temperature');

      expect(result.anomalyCount).toBe(0);
      expect(result.explanation).toContain('Insufficient data points');
    });

    it('should filter out non-numeric metric values', async () => {
      prisma.device.findFirst.mockResolvedValue({ id: 'device_1', name: 'Sensor 1' });
      prisma.telemetry.findMany.mockResolvedValue([
        { timestamp: new Date('2024-01-15T10:00:00Z'), metrics: { temperature: 50 } },
        { timestamp: new Date('2024-01-15T11:00:00Z'), metrics: { temperature: 'not-a-number' } },
        { timestamp: new Date('2024-01-15T12:00:00Z'), metrics: { temperature: 55 } },
      ]);

      const result = await service.detectAnomalies('device_1', 'org_001', 'temperature');

      // Only 2 numeric values, so < 3 -> insufficient
      expect(result.anomalyCount).toBe(0);
    });

    it('should use default sensitivity of 2.0', async () => {
      prisma.device.findFirst.mockResolvedValue({ id: 'device_1', name: 'Sensor 1' });
      prisma.telemetry.findMany.mockResolvedValue([
        { timestamp: new Date('2024-01-15T10:00:00Z'), metrics: { temperature: 50 } },
        { timestamp: new Date('2024-01-15T11:00:00Z'), metrics: { temperature: 52 } },
        { timestamp: new Date('2024-01-15T12:00:00Z'), metrics: { temperature: 51 } },
      ]);
      httpService.post.mockReturnValue(of({ data: { response: 'No issues.' } }));

      const result = await service.detectAnomalies('device_1', 'org_001', 'temperature');

      expect(result.statistics!.sensitivity).toBe(2.0);
    });
  });

  describe('summarizeTelemetry', () => {
    it('should compute and return summary stats', async () => {
      prisma.device.findFirst.mockResolvedValue({ id: 'device_1', name: 'Sensor 1' });
      prisma.telemetry.findMany.mockResolvedValue([
        { timestamp: new Date('2024-01-15T10:00:00Z'), metrics: { temperature: 70, humidity: 40 } },
        { timestamp: new Date('2024-01-15T11:00:00Z'), metrics: { temperature: 80, humidity: 50 } },
      ]);
      httpService.post.mockReturnValue(of({ data: { response: 'Summary: temperatures are normal.' } }));

      const result = await service.summarizeTelemetry(['device_1'], 'org_001');

      expect(result.summary).toBe('Summary: temperatures are normal.');
      expect(result.source).toBe('ollama');
      expect(result.devices).toHaveLength(1);
      expect(result.devices[0].deviceId).toBe('device_1');
      expect(result.devices[0].deviceName).toBe('Sensor 1');
      expect(result.devices[0].metricStats.temperature).toBeDefined();
      expect(result.devices[0].metricStats.temperature.avg).toBe(75);
      expect(result.devices[0].metricStats.temperature.min).toBe(70);
      expect(result.devices[0].metricStats.temperature.max).toBe(80);
    });

    it('should handle empty data', async () => {
      prisma.device.findFirst.mockResolvedValue({ id: 'device_1', name: 'Sensor 1' });
      prisma.telemetry.findMany.mockResolvedValue([]);
      httpService.post.mockReturnValue(of({ data: { response: 'No data available.' } }));

      const result = await service.summarizeTelemetry(['device_1'], 'org_001');

      expect(result.devices[0].metricStats).toEqual({});
      expect(result.source).toBe('ollama');
    });

    it('should skip devices not found in organization', async () => {
      prisma.device.findFirst.mockResolvedValue(null);

      const result = await service.summarizeTelemetry(['nonexistent_device'], 'org_001');

      expect(result.devices).toHaveLength(0);
    });

    it('should handle multiple devices', async () => {
      prisma.device.findFirst
        .mockResolvedValueOnce({ id: 'device_1', name: 'Sensor 1' })
        .mockResolvedValueOnce({ id: 'device_2', name: 'Sensor 2' });

      prisma.telemetry.findMany
        .mockResolvedValueOnce([
          { timestamp: new Date(), metrics: { temp: 70 } },
        ])
        .mockResolvedValueOnce([
          { timestamp: new Date(), metrics: { humidity: 60 } },
        ]);

      httpService.post.mockReturnValue(of({ data: { response: 'Multi device summary.' } }));

      const result = await service.summarizeTelemetry(['device_1', 'device_2'], 'org_001');

      expect(result.devices).toHaveLength(2);
    });

    it('should fall back to statistical summary when Ollama fails', async () => {
      prisma.device.findFirst.mockResolvedValue({ id: 'device_1', name: 'Sensor 1' });
      prisma.telemetry.findMany.mockResolvedValue([
        { timestamp: new Date(), metrics: { temp: 72 } },
      ]);
      httpService.post.mockReturnValue(throwError(() => new Error('Ollama down')));

      const result = await service.summarizeTelemetry(['device_1'], 'org_001');

      expect(result.source).toBe('statistical');
      expect(result.summary).toContain('Sensor 1');
    });

    it('should only aggregate numeric metric values', async () => {
      prisma.device.findFirst.mockResolvedValue({ id: 'device_1', name: 'Sensor 1' });
      prisma.telemetry.findMany.mockResolvedValue([
        { timestamp: new Date(), metrics: { temperature: 72, status: 'online', flag: true } },
        { timestamp: new Date(), metrics: { temperature: 75, status: 'offline', flag: false } },
      ]);
      httpService.post.mockReturnValue(of({ data: { response: 'Summary' } }));

      const result = await service.summarizeTelemetry(['device_1'], 'org_001');

      const stats = result.devices[0].metricStats;
      expect(stats.temperature).toBeDefined();
      expect(stats.status).toBeUndefined();
      expect(stats.flag).toBeUndefined();
    });
  });
});
