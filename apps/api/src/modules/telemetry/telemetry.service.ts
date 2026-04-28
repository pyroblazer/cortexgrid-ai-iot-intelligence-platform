/**
 * @file telemetry.service.ts
 * @description Handles ingestion, caching, querying, and time-series aggregation
 * of IoT device telemetry data (sensor readings).
 *
 * ELI5: This is the "data pipeline" for sensor readings. When a temperature
 * sensor sends a reading like { temperature: 72, humidity: 45 }, this service:
 *   1. Saves it to the database permanently
 *   2. Caches the latest reading in Redis for instant dashboard display
 *   3. Publishes it via Redis pub/sub so connected web browsers see it in real-time
 *   4. Lets users query historical data with pagination and time-based aggregation
 *
 * KEY DESIGN DECISIONS:
 *   - Dual ingestion paths: HTTP (for REST API) and MQTT (for IoT devices)
 *   - Redis cache with 5-min TTL for latest readings (avoids DB hits on every dashboard load)
 *   - Redis pub/sub for real-time WebSocket push to frontend
 *   - Time-bucket aggregation for chart-friendly data (1min, 5min, 15min, 1hr, 1day buckets)
 *   - Default time range of 24 hours for queries (covers the most common use case)
 *
 * WHY Redis pub/sub? The frontend has a WebSocket connection to a gateway service.
 * When telemetry arrives, we publish it to Redis. The gateway subscribes to Redis
 * and pushes the data to connected browsers in real-time. This decouples the
 * ingestion service from the WebSocket gateway.
 */
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { IngestTelemetryDto, QueryTelemetryDto } from './dto/ingest-telemetry.dto';

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Ingest telemetry data via the HTTP REST API.
   *
   * ELI5: A device (or a gateway proxy) sends sensor data to our HTTP endpoint.
   * We verify the device belongs to the requesting organization (security check),
   * save the data, cache it, and broadcast it in real-time.
   *
   * Steps:
   *   1. Verify the device exists and belongs to this organization
   *   2. Save the telemetry record to PostgreSQL
   *   3. Cache the latest reading in Redis (5-min TTL)
   *   4. Publish to Redis channels for real-time WebSocket delivery
   *   5. Update the device's "last seen" timestamp
   */
  async ingest(organizationId: string, ingestDto: IngestTelemetryDto) {
    // Security: Verify this device actually belongs to the requesting org.
    // Prevents one org from injecting fake data into another org's device.
    const device = await this.prisma.device.findFirst({
      where: {
        id: ingestDto.deviceId,
        organizationId,
        isActive: true,
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found in this organization');
    }

    // Use the timestamp provided by the device, or fall back to server time.
    // Device timestamps are preferred because they reflect when the reading
    // was actually taken (there can be network delay before we receive it).
    const timestamp = ingestDto.timestamp
      ? new Date(ingestDto.timestamp)
      : new Date();

    // Save the telemetry record to PostgreSQL for permanent storage.
    const telemetry = await this.prisma.telemetry.create({
      data: {
        deviceId: ingestDto.deviceId,
        organizationId,
        timestamp,
        metrics: ingestDto.metrics,
      },
    });

    // Cache the latest reading in Redis with a 5-minute TTL.
    // WHY? Dashboards frequently poll for the "current reading" of each device.
    // Without caching, every dashboard refresh would hit the database.
    // 5 minutes is short enough that data doesn't get too stale, but long
    // enough to handle bursty dashboard traffic.
    await this.redisService.set(
      `telemetry:latest:${ingestDto.deviceId}`,
      JSON.stringify({
        deviceId: ingestDto.deviceId,
        metrics: ingestDto.metrics,
        timestamp: timestamp.toISOString(),
      }),
      300, // 5 minutes TTL
    );

    // Publish to Redis channels for real-time WebSocket delivery.
    // Two channels are used:
    //   - telemetry:{orgId}  - org-specific, so the gateway can route to the right org room
    //   - telemetry_all      - global channel for admin/super-user dashboards
    const telemetryPayload = JSON.stringify({
      deviceId: ingestDto.deviceId,
      organizationId,
      metrics: ingestDto.metrics,
      timestamp: timestamp.toISOString(),
    });
    await this.redisService.publish(`telemetry:${organizationId}`, telemetryPayload);
    await this.redisService.publish('telemetry_all', telemetryPayload);

    // Update the device's lastSeenAt so we can track device connectivity.
    await this.prisma.device.update({
      where: { id: ingestDto.deviceId },
      data: { lastSeenAt: new Date() },
    });

    return telemetry;
  }

  /**
   * Ingest telemetry from MQTT (internal use, no HTTP guard).
   *
   * ELI5: IoT devices often send data via MQTT (a lightweight messaging protocol
   * designed for IoT) instead of HTTP. The MqttService receives MQTT messages
   * and calls this method. It skips the HTTP auth/organization check because
   * the MQTT service already validated the device before calling this.
   *
   * This is a simpler, faster path than the HTTP ingest because:
   *   - No HTTP validation overhead (MQTT already authenticated the connection)
   *   - No need to re-verify device ownership (MQTT service already did this)
   */
  async ingestFromMqtt(
    deviceId: string,
    organizationId: string,
    metrics: Record<string, any>,
    timestamp?: Date,
  ) {
    const telemetry = await this.prisma.telemetry.create({
      data: {
        deviceId,
        organizationId,
        timestamp: timestamp || new Date(),
        metrics,
      },
    });

    // Cache latest reading in Redis (same 5-min TTL as HTTP ingest).
    await this.redisService.set(
      `telemetry:latest:${deviceId}`,
      JSON.stringify({
        deviceId,
        metrics,
        timestamp: (timestamp || new Date()).toISOString(),
      }),
      300,
    );

    // Publish for real-time WebSocket subscribers.
    await this.redisService.publish(
      `telemetry:${organizationId}`,
      JSON.stringify({
        deviceId,
        metrics,
        timestamp: (timestamp || new Date()).toISOString(),
      }),
    );

    return telemetry;
  }

  /**
   * Query historical telemetry data with pagination, time filtering, and optional aggregation.
   *
   * ELI5: Like searching through a filing cabinet of sensor readings.
   * You can specify:
   *   - Which device (required)
   *   - Time range (defaults to last 24 hours)
   *   - Page number and page size
   *   - Aggregation interval (group readings into time buckets like 5min, 1hr)
   *
   * Aggregation is useful for charts. Instead of plotting thousands of raw
   * data points, you get "buckets" like: "from 2:00-2:05 PM, the average
   * temperature was 72.3, min was 70.1, max was 74.5".
   */
  async query(
    organizationId: string,
    deviceId: string,
    queryDto: QueryTelemetryDto,
  ) {
    // Security: Verify the device belongs to this organization.
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, organizationId, isActive: true },
    });

    if (!device) {
      throw new NotFoundException('Device not found in this organization');
    }

    // Parse pagination parameters, capping limit at 1000 to prevent abuse.
    const page = parseInt(queryDto.page || '1', 10);
    const limit = Math.min(parseInt(queryDto.limit || '50', 10), 1000);
    const skip = (page - 1) * limit;

    // Parse time range. Default to last 24 hours if not specified.
    // 24 hours is a sensible default because it covers the most common
    // "show me today's data" use case.
    const startTime = queryDto.startTime
      ? new Date(queryDto.startTime)
      : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: last 24 hours
    const endTime = queryDto.endTime
      ? new Date(queryDto.endTime)
      : new Date();

    const where = {
      deviceId,
      organizationId,
      timestamp: {
        gte: startTime,
        lte: endTime,
      },
    };

    // Run data query and count query in parallel for efficiency.
    const [data, total] = await Promise.all([
      this.prisma.telemetry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },  // Newest readings first
      }),
      this.prisma.telemetry.count({ where }),
    ]);

    // If the client requested aggregation, compute time-bucketed statistics.
    // This is computationally expensive (fetches ALL data in the time range)
    // but necessary for generating chart-friendly data.
    let aggregated = null;
    if (queryDto.interval) {
      aggregated = await this.computeAggregation(
        deviceId,
        organizationId,
        startTime,
        endTime,
        queryDto.interval,
      );
    }

    return {
      data,
      // Only include the aggregated field if we computed it (sparse response)
      ...(aggregated && { aggregated }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
        timeRange: {
          start: startTime.toISOString(),
          end: endTime.toISOString(),
        },
      },
    };
  }

  /**
   * Get the most recent telemetry reading for a device.
   *
   * Uses the "cache-aside" pattern: check Redis first, fall back to database.
   * ELI5: Before digging through the filing cabinet (database), check the
   * sticky note on top (Redis cache) that has the latest value.
   */
  async getLatest(organizationId: string, deviceId: string) {
    // Try the Redis cache first - O(1) lookup vs database query.
    const cached = await this.redisService.get(
      `telemetry:latest:${deviceId}`,
    );
    if (cached) {
      return JSON.parse(cached);
    }

    // Cache miss - verify the device belongs to this org and query the database.
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, organizationId, isActive: true },
    });

    if (!device) {
      throw new NotFoundException('Device not found in this organization');
    }

    const latest = await this.prisma.telemetry.findFirst({
      where: { deviceId, organizationId },
      orderBy: { timestamp: 'desc' },
    });

    if (!latest) {
      return { deviceId, telemetry: null };
    }

    return {
      deviceId,
      telemetry: latest,
    };
  }

  /**
   * Compute time-bucketed aggregation of telemetry data.
   *
   * ELI5: Imagine you have temperature readings every 10 seconds for a whole day.
   * That's 8,640 data points - way too many to plot on a chart. This method
   * groups them into "buckets" (e.g., every 5 minutes) and computes the
   * average, minimum, and maximum for each bucket. Now you have 288 points
   * which makes a clean chart.
   *
   * Supported intervals: 1m, 5m, 15m, 1h, 1d (defaults to 1h if unknown).
   *
   * Note: This loads ALL records in the time range into memory. For very large
   * time ranges with high-frequency data, this could be memory-intensive.
   * A production system might use a dedicated time-series database or
   * materialized views for better performance.
   */
  private async computeAggregation(
    deviceId: string,
    organizationId: string,
    startTime: Date,
    endTime: Date,
    interval: string,
  ) {
    // Map interval string to number of minutes for bucket size calculation.
    const intervalMinutes: Record<string, number> = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '1h': 60,
      '1d': 1440,
    };

    // Default to 1 hour if the interval string isn't recognized.
    const minutes = intervalMinutes[interval] || 60;

    // Fetch all telemetry records in the time range for aggregation.
    const records = await this.prisma.telemetry.findMany({
      where: {
        deviceId,
        organizationId,
        timestamp: { gte: startTime, lte: endTime },
      },
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true, metrics: true },
    });

    if (records.length === 0) {
      return { buckets: [], interval };
    }

    // Bucket the records into time windows.
    // Each bucket covers a fixed time interval and contains all records that fall within it.
    const buckets: Array<{
      startTime: Date;
      endTime: Date;
      count: number;
      avg: Record<string, number>;
      min: Record<string, number>;
      max: Record<string, number>;
    }> = [];

    const bucketMs = minutes * 60 * 1000;  // Convert interval to milliseconds
    let bucketStart = new Date(startTime.getTime());
    let currentBucket: any[] = [];

    // Iterate through chronologically sorted records and assign each to a bucket.
    for (const record of records) {
      const recordTime = new Date(record.timestamp);
      const bucketEnd = new Date(bucketStart.getTime() + bucketMs);

      if (recordTime >= bucketEnd) {
        // This record belongs to a later bucket.
        // Finalize the current bucket (if it has data) and advance.
        if (currentBucket.length > 0) {
          buckets.push(this.aggregateBucket(currentBucket, bucketStart, bucketEnd));
        }
        // Advance bucketStart until it covers the current record's time.
        // This skips over empty time buckets where no data was received.
        while (recordTime >= new Date(bucketStart.getTime() + bucketMs)) {
          bucketStart = new Date(bucketStart.getTime() + bucketMs);
        }
        currentBucket = [record];
      } else {
        // Record falls within the current bucket - add it.
        currentBucket.push(record);
      }
    }

    // Don't forget the last bucket!
    if (currentBucket.length > 0) {
      const bucketEnd = new Date(bucketStart.getTime() + bucketMs);
      buckets.push(this.aggregateBucket(currentBucket, bucketStart, bucketEnd));
    }

    return { buckets, interval, totalRecords: records.length };
  }

  /**
   * Compute aggregate statistics (avg, min, max) for a single time bucket.
   *
   * ELI5: Given a pile of sensor readings from the same time window,
   * calculate the average, lowest, and highest value for each metric.
   * Only numeric fields are aggregated (ignores strings, booleans, etc.).
   */
  private aggregateBucket(
    records: any[],
    startTime: Date,
    endTime: Date,
  ) {
    const numericFields = new Set<string>();

    // Scan all records to discover which fields contain numeric values.
    // We use a Set because different records might have different fields,
    // and we want the union of all numeric field names.
    for (const record of records) {
      const metrics = record.metrics as Record<string, any>;
      for (const [key, value] of Object.entries(metrics)) {
        if (typeof value === 'number') {
          numericFields.add(key);
        }
      }
    }

    const avg: Record<string, number> = {};
    const min: Record<string, number> = {};
    const max: Record<string, number> = {};

    // For each numeric field, compute statistics across all records in the bucket.
    for (const field of numericFields) {
      const values = records
        .map((r) => (r.metrics as Record<string, any>)[field])
        .filter((v): v is number => typeof v === 'number');

      if (values.length > 0) {
        avg[field] = values.reduce((a, b) => a + b, 0) / values.length;
        min[field] = Math.min(...values);
        max[field] = Math.max(...values);
      }
    }

    return {
      startTime,
      endTime,
      count: records.length,
      avg,
      min,
      max,
    };
  }
}
