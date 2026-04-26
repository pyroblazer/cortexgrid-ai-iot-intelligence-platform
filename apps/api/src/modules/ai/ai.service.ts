/**
 * @file ai.service.ts
 * @description AI-powered analytics service using Ollama (local LLM) for natural
 * language queries, z-score anomaly detection, and telemetry summarization.
 *
 * ELI5: This file gives the platform a "smart brain" that can:
 *   - Answer questions about sensor data in plain English ("What was the average temperature yesterday?")
 *   - Detect when sensor readings are behaving weirdly (anomaly detection)
 *   - Write human-readable summaries of what's happening with devices
 *
 * KEY CONCEPTS:
 *   - Ollama Integration: Ollama is a tool that runs AI models (like Llama 3.2)
 *     locally on the server. Instead of paying for OpenAI/ChatGPT API calls,
 *     we run the AI on our own hardware. If Ollama is down or not installed,
 *     we gracefully fall back to simple statistical summaries.
 *
 *   - Z-Score Anomaly Detection: A statistical method to find "weird" values.
 *     ELI5: Imagine you're monitoring temperature. Most readings are around 70F.
 *     The z-score tells you how unusual a reading is compared to the average.
 *     A z-score of 3 means "this reading is 3 standard deviations away from normal" -
 *     extremely rare and worth investigating. Default sensitivity is 2.0, meaning
 *     anything more than 2 standard deviations from average is flagged as anomalous.
 *
 *   - Graceful Degradation: Every AI feature has a statistical fallback.
 *     If Ollama is unavailable, users still get useful (if less eloquent) results.
 *
 * WHY local LLM (Ollama) instead of cloud AI?
 *   - Privacy: IoT telemetry data stays on your infrastructure
 *   - Cost: No per-token API charges
 *   - Latency: No network round-trip to an external API
 *   - Offline capability: Works without internet access
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';

/** Time range filter for queries. */
interface TimeRange {
  start?: string;
  end?: string;
}

/** A single detected anomaly point with its statistical deviation. */
interface AnomalyPoint {
  timestamp: string;
  value: number;
  deviation: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  /** Base URL where Ollama is running (default: localhost:11434). */
  private readonly ollamaBaseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.ollamaBaseUrl = this.configService.get<string>(
      'OLLAMA_BASE_URL',
      'http://localhost:11434',
    );
  }

  /**
   * Answer a natural language question about IoT telemetry data.
   *
   * ELI5: The user types something like "What was the highest humidity reading
   * on the basement sensor last week?" This method:
   *   1. Fetches relevant telemetry data from the database
   *   2. Builds a text summary of the data
   *   3. Sends the summary + the user's question to Ollama
   *   4. Ollama generates a human-readable answer
   *   5. If Ollama is unavailable, generates a statistical fallback answer
   *
   * WHY limit to 500 records? LLMs have context windows (memory limits).
   * Sending thousands of records would exceed the model's context and
   * also be slow. 500 records captures enough data for meaningful analysis.
   */
  async naturalLanguageQuery(
    query: string,
    organizationId: string,
    deviceIds?: string[],
    timeRange?: TimeRange,
  ) {
    const startTime = timeRange?.start
      ? new Date(timeRange.start)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endTime = timeRange?.end ? new Date(timeRange.end) : new Date();

    const telemetryWhere: any = {
      organizationId,
      timestamp: { gte: startTime, lte: endTime },
    };

    // Optionally filter to specific devices.
    if (deviceIds && deviceIds.length > 0) {
      telemetryWhere.deviceId = { in: deviceIds };
    }

    // Fetch up to 500 records, including device names for context.
    const telemetryRecords = await this.prisma.telemetry.findMany({
      where: telemetryWhere,
      orderBy: { timestamp: 'desc' },
      take: 500,
      include: {
        device: {
          select: { id: true, name: true, serialNumber: true },
        },
      },
    });

    if (telemetryRecords.length === 0) {
      return {
        query,
        response: 'No telemetry data found for the specified criteria.',
        dataPoints: 0,
        source: 'fallback',
      };
    }

    // Build a text summary of the data to use as context for the AI model.
    const contextSummary = this.buildTelemetryContext(telemetryRecords);

    // Construct a prompt that instructs the AI to answer based ONLY on the provided data.
    // This prevents the AI from making up answers ("hallucinating").
    const prompt = `You are an IoT data analyst for the CortexGrid platform. Answer the following question about IoT telemetry data. Base your answer only on the provided data context.

Data Context:
${contextSummary}

User Question: ${query}

Provide a clear, concise answer. Include specific numbers from the data when relevant.`;

    const ollamaResponse = await this.callOllama(prompt);

    if (ollamaResponse) {
      return {
        query,
        response: ollamaResponse,
        dataPoints: telemetryRecords.length,
        source: 'ollama',  // Indicates the answer came from the AI model
        timeRange: {
          start: startTime.toISOString(),
          end: endTime.toISOString(),
        },
      };
    }

    // Ollama failed - fall back to a statistical summary (numbers without prose).
    const statisticalSummary = this.generateStatisticalSummary(telemetryRecords);
    return {
      query,
      response: statisticalSummary,
      dataPoints: telemetryRecords.length,
      source: 'statistical',
      timeRange: {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
      },
    };
  }

  /**
   * Detect anomalies in a specific metric using z-score analysis.
   *
   * ELI5: This finds data points that are "weird" compared to the rest.
   * Imagine plotting all temperature readings on a number line. Most cluster
   * around the average. Anomalies are the ones way out at the edges.
   *
   * HOW Z-SCORE WORKS (step by step):
   *   1. Calculate the mean (average) of all values
   *   2. Calculate the standard deviation (how spread out the data is)
   *   3. For each data point, compute its "z-score" = (value - mean) / stddev
   *   4. If |z-score| > sensitivity threshold, flag it as an anomaly
   *
   * A sensitivity of 2.0 means: "flag anything more than 2 standard deviations
   * from the mean." Lower sensitivity = more anomalies flagged. Higher = stricter.
   *
   * After detection, we optionally ask Ollama to explain WHY the anomalies
   * might have occurred (e.g., "The temperature spike at 3 AM suggests a
   * malfunctioning HVAC system").
   */
  async detectAnomalies(
    deviceId: string,
    organizationId: string,
    metric: string,
    timeRange?: TimeRange,
    sensitivity: number = 2.0,
  ) {
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, organizationId, isActive: true },
    });

    if (!device) {
      throw new NotFoundException('Device not found in this organization');
    }

    const startTime = timeRange?.start
      ? new Date(timeRange.start)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endTime = timeRange?.end ? new Date(timeRange.end) : new Date();

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
      return {
        deviceId,
        metric,
        anomalyCount: 0,
        anomalies: [],
        statistics: null,
        explanation: 'No telemetry data available for the specified time range.',
      };
    }

    // Extract the specific metric from each record's metrics JSON.
    // Not all records may contain this metric, so we filter for numeric values only.
    const values: Array<{ timestamp: Date; value: number }> = [];
    for (const record of records) {
      const metrics = record.metrics as Record<string, any>;
      if (metrics && typeof metrics[metric] === 'number') {
        values.push({ timestamp: record.timestamp, value: metrics[metric] });
      }
    }

    // Need at least 3 data points for meaningful statistics.
    if (values.length < 3) {
      return {
        deviceId,
        metric,
        anomalyCount: 0,
        anomalies: [],
        statistics: null,
        explanation: 'Insufficient data points for anomaly detection (need at least 3).',
      };
    }

    // ── Z-Score Calculation ──
    const numericValues = values.map((v) => v.value);

    // Step 1: Calculate the mean (average) of all values.
    const mean = numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length;

    // Step 2: Calculate the variance (average squared distance from mean).
    const variance =
      numericValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / numericValues.length;

    // Step 3: Standard deviation = square root of variance.
    // This tells us how "spread out" the data is.
    const stddev = Math.sqrt(variance);

    // Step 4: Define anomaly thresholds.
    // Anything above thresholdUpper or below thresholdLower is an anomaly.
    const thresholdUpper = mean + sensitivity * stddev;
    const thresholdLower = mean - sensitivity * stddev;

    // Step 5: Flag data points outside the thresholds.
    const anomalies: AnomalyPoint[] = [];
    for (const point of values) {
      if (point.value > thresholdUpper || point.value < thresholdLower) {
        anomalies.push({
          timestamp: point.timestamp.toISOString(),
          value: point.value,
          // Calculate how many standard deviations away from the mean this point is.
          // Positive = above average, absolute value = magnitude of deviation.
          deviation: point.value > thresholdUpper
            ? (point.value - mean) / stddev
            : (mean - point.value) / stddev,
        });
      }
    }

    // Round statistics for cleaner display in the UI.
    const statistics = {
      mean: Math.round(mean * 1000) / 1000,
      stddev: Math.round(stddev * 1000) / 1000,
      thresholdUpper: Math.round(thresholdUpper * 1000) / 1000,
      thresholdLower: Math.round(thresholdLower * 1000) / 1000,
      sensitivity,
      totalPoints: values.length,
    };

    // Generate a human-readable explanation of the findings.
    let explanation = '';
    if (anomalies.length > 0) {
      // Build a summary of the top 5 anomalies for the AI to analyze.
      const anomalySummary = anomalies
        .slice(0, 5)
        .map((a) => `- ${a.timestamp}: value=${a.value} (${a.deviation.toFixed(1)} sigma deviation)`)
        .join('\n');

      const anomalyPrompt = `You are an IoT data analyst. ${anomalies.length} anomalies were detected in the ${metric} metric for device ${device.name}.
Statistics: mean=${statistics.mean}, stddev=${statistics.stddev}, threshold=[${statistics.thresholdLower}, ${statistics.thresholdUpper}]
The anomalies occurred at these times:
${anomalySummary}
Provide a brief (2-3 sentence) explanation of what might be happening.`;

      const ollamaExplanation = await this.callOllama(anomalyPrompt);
      explanation = ollamaExplanation || `Detected ${anomalies.length} anomalies in ${metric} data. Values deviate more than ${sensitivity} standard deviations from the mean of ${statistics.mean}.`;
    } else {
      explanation = `No anomalies detected in ${metric} data within the specified sensitivity threshold (${sensitivity} sigma).`;
    }

    return {
      deviceId,
      metric,
      anomalyCount: anomalies.length,
      anomalies,
      statistics,
      explanation,
      timeRange: {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
      },
    };
  }

  /**
   * Summarize telemetry data for multiple devices using AI.
   *
   * ELI5: Gathers statistical summaries (avg, min, max) for each device's
   * metrics, then asks the AI to write a short "executive summary" of
   * what's happening. Useful for dashboard widgets and daily reports.
   */
  async summarizeTelemetry(
    deviceIds: string[],
    organizationId: string,
    timeRange?: TimeRange,
  ) {
    const startTime = timeRange?.start
      ? new Date(timeRange.start)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endTime = timeRange?.end ? new Date(timeRange.end) : new Date();

    const summaries: Array<{
      deviceId: string;
      deviceName: string;
      metricStats: Record<string, { avg: number; min: number; max: number; count: number }>;
    }> = [];

    // Build statistical summaries for each device.
    for (const deviceId of deviceIds) {
      const device = await this.prisma.device.findFirst({
        where: { id: deviceId, organizationId, isActive: true },
        select: { id: true, name: true },
      });

      // Skip devices that don't exist or don't belong to this org.
      if (!device) {
        continue;
      }

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
        summaries.push({ deviceId, deviceName: device.name, metricStats: {} });
        continue;
      }

      // Accumulate all numeric values for each metric across all records.
      const metricAccumulators: Record<string, number[]> = {};

      for (const record of records) {
        const metrics = record.metrics as Record<string, any>;
        for (const [key, value] of Object.entries(metrics)) {
          if (typeof value === 'number') {
            if (!metricAccumulators[key]) {
              metricAccumulators[key] = [];
            }
            metricAccumulators[key].push(value);
          }
        }
      }

      // Compute avg, min, max for each accumulated metric.
      const metricStats: Record<string, { avg: number; min: number; max: number; count: number }> = {};

      for (const [metricName, vals] of Object.entries(metricAccumulators)) {
        metricStats[metricName] = {
          avg: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 1000) / 1000,
          min: Math.min(...vals),
          max: Math.max(...vals),
          count: vals.length,
        };
      }

      summaries.push({ deviceId, deviceName: device.name, metricStats });
    }

    // Build a text context from the statistical summaries for the AI prompt.
    const summaryContext = summaries
      .map((s) => {
        if (Object.keys(s.metricStats).length === 0) {
          return `Device "${s.deviceName}": No data available.`;
        }
        const statLines = Object.entries(s.metricStats)
          .map(([m, stats]) => `  - ${m}: avg=${stats.avg}, min=${stats.min}, max=${stats.max} (${stats.count} samples)`)
          .join('\n');
        return `Device "${s.deviceName}":\n${statLines}`;
      })
      .join('\n\n');

    // Ask the AI to write a 3-5 sentence dashboard summary.
    const prompt = `You are an IoT data analyst for the CortexGrid platform. Summarize the following telemetry data in a clear, concise manner for a dashboard. Highlight any notable patterns, trends, or issues.

Time Range: ${startTime.toISOString()} to ${endTime.toISOString()}

Device Summaries:
${summaryContext}

Provide a 3-5 sentence summary that would be useful for a monitoring dashboard.`;

    const ollamaSummary = await this.callOllama(prompt);

    return {
      summary: ollamaSummary || summaryContext,
      source: ollamaSummary ? 'ollama' : 'statistical',
      devices: summaries,
      timeRange: {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
      },
    };
  }

  /**
   * Call the local Ollama API to generate a response from the LLM.
   *
   * ELI5: Sends a text prompt to the AI model running on our server and
   * waits for its response. If the AI is busy, down, or not installed,
   * returns null so the calling method can use a fallback.
   *
   * Design decisions:
   *   - stream: false - We want the complete response, not a streaming one
   *   - temperature: 0.3 - Low creativity for factual, data-based answers
   *   - num_predict: 512 - Limit response length to keep it concise
   *   - 30 second timeout - Don't hang forever if the model is slow
   *   - Graceful error handling - Never throw, always return null on failure
   */
  private async callOllama(prompt: string, model: string = 'llama3.2'): Promise<string | null> {
    try {
      const response = await firstValueFrom(
        this.httpService
          .post(`${this.ollamaBaseUrl}/api/generate`, {
            model,
            prompt,
            stream: false,            // Wait for complete response (not streaming)
            options: {
              temperature: 0.3,       // Low temperature = more deterministic/factual
              num_predict: 512,       // Max tokens to generate (keeps responses concise)
            },
          })
          .pipe(
            timeout(30000),           // 30-second timeout - don't wait forever
            catchError((error: any) => {
              // Log the failure but don't crash - return null for fallback.
              this.logger.warn(`Ollama call failed: ${error?.message || 'Unknown error'}`);
              return of(null);
            }),
          ),
      );

      if (!response || !response.data) {
        return null;
      }

      return response.data.response || null;
    } catch (error: any) {
      this.logger.warn(`Ollama unavailable, using fallback: ${error.message}`);
      return null;
    }
  }

  /**
   * Build a text summary of telemetry data to use as context for the AI model.
   *
   * ELI5: Converts raw database records into a readable text format the AI
   * can understand. Groups records by device, includes a sample of readings
   * (first 5 + last 5 for large datasets), and adds quick statistics.
   *
   * WHY sampling? If a device has 500 readings, we don't send all 500 to the AI.
   * We send the first 5 and last 5 (showing the beginning and end of the time
   * range) plus a statistical summary. This gives the AI enough context without
   * exceeding its context window.
   */
  private buildTelemetryContext(records: any[]): string {
    // Group records by device name for organized presentation.
    const deviceMap = new Map<string, any[]>();

    for (const record of records) {
      const deviceName = record.device?.name || record.deviceId || 'Unknown Device';
      if (!deviceMap.has(deviceName)) {
        deviceMap.set(deviceName, []);
      }
      deviceMap.get(deviceName)!.push(record);
    }

    const lines: string[] = [];

    for (const [deviceName, deviceRecords] of deviceMap) {
      lines.push(`Device: ${deviceName} (${deviceRecords.length} readings)`);

      // Sample the data: show up to 10 records (first 5 + last 5 if there are many).
      const sampleSize = Math.min(deviceRecords.length, 10);
      const sampled = deviceRecords.length <= sampleSize
        ? deviceRecords
        : [...deviceRecords.slice(0, 5), ...deviceRecords.slice(-5)];

      for (const record of sampled) {
        const ts = record.timestamp instanceof Date
          ? record.timestamp.toISOString()
          : record.timestamp;
        const metrics = typeof record.metrics === 'object'
          ? JSON.stringify(record.metrics)
          : record.metrics;
        lines.push(`  [${ts}] ${metrics}`);
      }

      // Add a statistical summary line for this device's data.
      const numericStats = this.computeQuickStats(deviceRecords);
      if (Object.keys(numericStats).length > 0) {
        lines.push(`  Summary: ${JSON.stringify(numericStats)}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Compute quick min/max/avg statistics for numeric metric fields.
   *
   * Scans all records, collects numeric values by field name, and
   * returns a summary object. Used for both AI context and fallback responses.
   */
  private computeQuickStats(records: any[]): Record<string, { min: number; max: number; avg: number }> {
    const accumulators: Record<string, number[]> = {};

    for (const record of records) {
      const metrics = record.metrics as Record<string, any>;
      if (!metrics) continue;
      for (const [key, value] of Object.entries(metrics)) {
        if (typeof value === 'number') {
          if (!accumulators[key]) accumulators[key] = [];
          accumulators[key].push(value);
        }
      }
    }

    const stats: Record<string, { min: number; max: number; avg: number }> = {};
    for (const [key, values] of Object.entries(accumulators)) {
      stats[key] = {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100,
      };
    }

    return stats;
  }

  /**
   * Generate a plain-text statistical summary when Ollama is unavailable.
   *
   * ELI5: If the AI brain is offline, we just list the raw numbers:
   * "Found 500 telemetry readings across 3 devices. Temperature: min=65,
   * max=85, avg=72.3. Humidity: min=30, max=60, avg=45.1"
   */
  private generateStatisticalSummary(records: any[]): string {
    const stats = this.computeQuickStats(records);
    const deviceCount = new Set(records.map((r) => r.deviceId)).size;

    const parts = [`Found ${records.length} telemetry readings across ${deviceCount} device(s).`];

    for (const [metric, vals] of Object.entries(stats)) {
      parts.push(`${metric}: min=${vals.min}, max=${vals.max}, avg=${vals.avg}`);
    }

    return parts.join(' ');
  }
}
