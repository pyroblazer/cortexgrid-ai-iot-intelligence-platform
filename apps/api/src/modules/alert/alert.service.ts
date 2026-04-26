/**
 * @file alert.service.ts
 * @description Alert rule management and real-time alert evaluation engine.
 *
 * ELI5: This file is like a fire alarm system for IoT data. Users create
 * "rules" like "alert me if temperature goes above 90 degrees". Every time
 * new sensor data arrives, this service checks ALL active rules to see if
 * any are triggered. If so, it creates an alert record and sends a real-time
 * notification via Redis.
 *
 * KEY CONCEPTS:
 *   - Alert Rules: User-defined conditions like "temperature > 90".
 *     Rules are stored in the database and cached in Redis for fast evaluation.
 *
 *   - Rule Evaluation Engine: The core of this service. Called whenever new
 *     telemetry arrives. Checks each rule's condition against the incoming metrics.
 *     Conditions support operators: greaterThan, lessThan, equals, etc.
 *
 *   - Deduplication: If a rule is already triggering (an active alert exists),
 *     we don't create a duplicate. This prevents alert spam when a sensor
 *     keeps sending values that violate the rule.
 *
 *   - Redis pub/sub for notifications: When an alert fires, we publish it
 *     to a Redis channel so the WebSocket gateway can push it to browsers in real-time.
 *
 *   - Redis caching for rules: Active rules are cached with a 5-min TTL so we
 *     don't query the database on every single telemetry data point.
 *
 * WHY this design? IoT devices can send data every few seconds. Checking rules
 * against a database for every data point would be too slow. Redis caching
 * makes rule evaluation fast enough to keep up with high-frequency data.
 */
import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { AlertSeverity, AlertStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { CreateAlertRuleDto, UpdateAlertRuleDto } from './dto/alert.dto';

/** Options for paginated alert listing with optional filters. */
interface GetAlertsOptions {
  page: number;
  limit: number;
  status?: AlertStatus;
  severity?: AlertSeverity;
  deviceId?: string;
}

/** Options for paginated rule listing with optional active filter. */
interface GetRulesOptions {
  page: number;
  limit: number;
  isActive?: boolean;
}

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  // ── Alert Rules (CRUD) ────────────────────────────────────────────────────────

  /**
   * Create a new alert rule for an organization.
   *
   * ELI5: Users set up a "watcher" like: "If the sensor reading for 'temperature'
   * goes above 90, create a CRITICAL severity alert."
   * The condition must include a "field" (which metric to check) and an "operator"
   * (how to compare: greaterThan, lessThan, etc.).
   */
  async createRule(organizationId: string, createDto: CreateAlertRuleDto) {
    // Validate that the condition object has the required fields.
    // "field" tells us which metric to check (e.g., "temperature").
    // "operator" tells us how to compare (e.g., "greaterThan").
    // "threshold" is the value to compare against (e.g., 90).
    const { condition } = createDto;
    if (!condition.field || !condition.operator) {
      throw new BadRequestException(
        'Alert condition must include "field" and "operator"',
      );
    }

    const rule = await this.prisma.alertRule.create({
      data: {
        organizationId,
        name: createDto.name,
        description: createDto.description,
        condition: createDto.condition,
        severity: createDto.severity,
        isActive: createDto.isActive !== undefined ? createDto.isActive : true,
      },
    });

    this.logger.log(`Alert rule created: ${rule.id} (${rule.name})`);

    // Invalidate the cached rules for this org so the new rule is picked up
    // on the next telemetry evaluation.
    await this.redisService.del(`alert_rules:${organizationId}`);

    return rule;
  }

  async getRules(organizationId: string, options: GetRulesOptions) {
    const { page, limit, isActive } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.AlertRuleWhereInput = {
      organizationId,
      ...(isActive !== undefined && { isActive }),
    };

    const [rules, total] = await Promise.all([
      this.prisma.alertRule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { alerts: true },
          },
        },
      }),
      this.prisma.alertRule.count({ where }),
    ]);

    return {
      data: rules,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  async getRule(organizationId: string, ruleId: string) {
    const rule = await this.prisma.alertRule.findFirst({
      where: { id: ruleId, organizationId },
      include: {
        alerts: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { alerts: true },
        },
      },
    });

    if (!rule) {
      throw new NotFoundException('Alert rule not found');
    }

    return rule;
  }

  async updateRule(
    organizationId: string,
    ruleId: string,
    updateDto: UpdateAlertRuleDto,
  ) {
    const rule = await this.prisma.alertRule.findFirst({
      where: { id: ruleId, organizationId },
    });

    if (!rule) {
      throw new NotFoundException('Alert rule not found');
    }

    const updated = await this.prisma.alertRule.update({
      where: { id: ruleId },
      data: {
        ...(updateDto.name && { name: updateDto.name }),
        ...(updateDto.description !== undefined && {
          description: updateDto.description,
        }),
        ...(updateDto.condition && { condition: updateDto.condition }),
        ...(updateDto.severity && { severity: updateDto.severity }),
        ...(updateDto.isActive !== undefined && { isActive: updateDto.isActive }),
      },
    });

    await this.redisService.del(`alert_rules:${organizationId}`);

    this.logger.log(`Alert rule updated: ${ruleId}`);
    return updated;
  }

  async deleteRule(organizationId: string, ruleId: string) {
    const rule = await this.prisma.alertRule.findFirst({
      where: { id: ruleId, organizationId },
    });

    if (!rule) {
      throw new NotFoundException('Alert rule not found');
    }

    await this.prisma.alertRule.delete({
      where: { id: ruleId },
    });

    await this.redisService.del(`alert_rules:${organizationId}`);

    this.logger.log(`Alert rule deleted: ${ruleId}`);
    return { message: 'Alert rule deleted successfully' };
  }

  // ── Alerts ─────────────────────────────────────────────────────────────────

  async getAlerts(organizationId: string, options: GetAlertsOptions) {
    const { page, limit, status, severity, deviceId } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.AlertWhereInput = {
      organizationId,
      ...(status && { status }),
      ...(severity && { severity }),
      ...(deviceId && { deviceId }),
    };

    const [alerts, total] = await Promise.all([
      this.prisma.alert.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          device: {
            select: {
              id: true,
              name: true,
              serialNumber: true,
              type: true,
            },
          },
          rule: {
            select: {
              id: true,
              name: true,
              severity: true,
            },
          },
          acknowledgedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.alert.count({ where }),
    ]);

    return {
      data: alerts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  async getAlert(organizationId: string, alertId: string) {
    const alert = await this.prisma.alert.findFirst({
      where: { id: alertId, organizationId },
      include: {
        device: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
            type: true,
            status: true,
            location: true,
          },
        },
        rule: {
          select: {
            id: true,
            name: true,
            condition: true,
          },
        },
        acknowledgedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    return alert;
  }

  /**
   * Acknowledge an alert - marks it as "seen by a human".
   *
   * ELI5: When someone looks at an alert and says "I see this, I'm on it",
   * they acknowledge it. This prevents the alert from showing as "unreviewed"
   * on the dashboard. An optional note can explain what action they're taking.
   * Already-resolved alerts can't be acknowledged (they're already handled).
   */
  async acknowledgeAlert(
    organizationId: string,
    userId: string,
    alertId: string,
    note?: string,
  ) {
    const alert = await this.prisma.alert.findFirst({
      where: { id: alertId, organizationId },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    if (alert.status === 'RESOLVED') {
      throw new BadRequestException('Cannot acknowledge a resolved alert');
    }

    const updated = await this.prisma.alert.update({
      where: { id: alertId },
      data: {
        status: AlertStatus.ACKNOWLEDGED,
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
        metadata: {
          ...(alert.metadata as Record<string, any>),
          ...(note && { acknowledgeNote: note }),
        },
      },
    });

    this.logger.log(`Alert acknowledged: ${alertId} by user ${userId}`);
    return updated;
  }

  /**
   * Resolve an alert - marks the issue as fixed/resolved.
   *
   * ELI5: After someone fixes the problem that triggered the alert
   * (e.g., the temperature dropped back to normal), they resolve it.
   */
  async resolveAlert(organizationId: string, alertId: string) {
    const alert = await this.prisma.alert.findFirst({
      where: { id: alertId, organizationId },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    const updated = await this.prisma.alert.update({
      where: { id: alertId },
      data: {
        status: AlertStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    });

    this.logger.log(`Alert resolved: ${alertId}`);
    return updated;
  }

  // ── Alert Evaluation (called by telemetry service) ─────────────────────────

  /**
   * Evaluate alert rules against new telemetry data
   */
  /**
   * Evaluate all active alert rules against new telemetry data.
   *
   * ELI5: Every time a device sends new sensor readings, this method runs.
   * It loads all the organization's alert rules, checks each one against
   * the incoming metrics, and creates alerts for any rules that are triggered.
   *
   * This is the "brain" of the alert system - it's called by the telemetry
   * service every time new data arrives.
   *
   * Performance optimization: Rules are cached in Redis for 5 minutes.
   * For high-frequency telemetry (data every few seconds), this avoids
   * querying the database for rules on every single data point.
   */
  async evaluateAlertRules(
    organizationId: string,
    deviceId: string,
    metrics: Record<string, any>,
  ): Promise<void> {
    // Try Redis cache first. If rules are cached, skip the database query.
    const cachedRules = await this.redisService.get(
      `alert_rules:${organizationId}`,
    );

    let rules: any[];
    if (cachedRules) {
      rules = JSON.parse(cachedRules);
    } else {
      rules = await this.prisma.alertRule.findMany({
        where: {
          organizationId,
          isActive: true,
        },
      });
      // Cache rules for 5 minutes to avoid hitting the database on every telemetry point.
      await this.redisService.set(
        `alert_rules:${organizationId}`,
        JSON.stringify(rules),
        300,
      );
    }

    // Evaluate each rule against the incoming metrics.
    for (const rule of rules) {
      try {
        const condition = rule.condition as Record<string, any>;
        // Check if this rule's condition is satisfied by the current metrics.
        const isTriggered = this.evaluateCondition(condition, metrics);

        if (isTriggered) {
          await this.createAlertFromRule(
            organizationId,
            deviceId,
            rule.id,
            rule.name,
            rule.severity,
            condition,
            metrics,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error evaluating rule ${rule.id}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Evaluate a single alert condition against incoming metrics.
   *
   * ELI5: Checks "does this data point trigger the rule?"
   * For example, if the condition is { field: "temperature", operator: "greaterThan", threshold: 90 },
   * and the current temperature is 95, this returns true.
   *
   * Supports dot-notation for nested fields (e.g., "metrics.temperature").
   * The field name has "metrics." stripped because metrics are already at the top level.
   */
  private evaluateCondition(
    condition: Record<string, any>,
    metrics: Record<string, any>,
  ): boolean {
    const { field, operator, threshold } = condition;

    // Extract the value from the metrics object using dot notation.
    // e.g., "temperature" -> metrics.temperature
    // e.g., "system.cpu.usage" -> metrics.system.cpu.usage
    const fieldParts = field.replace('metrics.', '').split('.');
    let value: any = metrics;
    for (const part of fieldParts) {
      value = value?.[part];
    }

    if (value === undefined || value === null) {
      return false;
    }

    // Convert to numbers for comparison (handles string-encoded numbers).
    const numericValue = typeof value === 'number' ? value : parseFloat(value);
    const numericThreshold =
      typeof threshold === 'number' ? threshold : parseFloat(threshold);

    // Compare using the specified operator.
    // Each operator maps to a standard mathematical comparison.
    switch (operator) {
      case 'greaterThan':
        return numericValue > numericThreshold;
      case 'lessThan':
        return numericValue < numericThreshold;
      case 'greaterThanOrEqual':
        return numericValue >= numericThreshold;
      case 'lessThanOrEqual':
        return numericValue <= numericThreshold;
      case 'equals':
        return value === threshold || numericValue === numericThreshold;
      case 'notEquals':
        return value !== threshold && numericValue !== numericThreshold;
      default:
        return false;  // Unknown operator = never triggers
    }
  }

  /**
   * Create a new alert record from a triggered rule.
   *
   * Includes deduplication: if there's already an ACTIVE or ACKNOWLEDGED
   * alert for the same rule + device combo, we skip creating another one.
   * This prevents alert storms when a rule keeps triggering on every data point.
   */
  private async createAlertFromRule(
    organizationId: string,
    deviceId: string,
    ruleId: string,
    ruleName: string,
    severity: AlertSeverity,
    condition: Record<string, any>,
    metrics: Record<string, any>,
  ) {
    // ── Deduplication check ──
    // Only create a new alert if there isn't already an active/acknowledged one
    // for the same rule on the same device. This prevents "alert spam" when
    // a temperature sensor keeps sending readings above the threshold.
    const existingAlert = await this.prisma.alert.findFirst({
      where: {
        organizationId,
        deviceId,
        ruleId,
        status: { in: [AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED] },
      },
    });

    if (existingAlert) {
      return; // Don't create duplicate alerts
    }

    const value = this.extractValue(condition.field, metrics);

    const alert = await this.prisma.alert.create({
      data: {
        organizationId,
        deviceId,
        ruleId,
        severity,
        status: AlertStatus.ACTIVE,
        title: `Alert: ${ruleName}`,
        message: `Rule "${ruleName}" triggered. Current value: ${value}, threshold: ${condition.threshold} (${condition.operator}).`,
        metadata: {
          currentValue: value,
          threshold: condition.threshold,
          operator: condition.operator,
          triggeredAt: new Date().toISOString(),
        },
      },
    });

    // Update rule last triggered
    await this.prisma.alertRule.update({
      where: { id: ruleId },
      data: { lastTriggeredAt: new Date() },
    });

    // Publish the alert via Redis pub/sub for real-time WebSocket delivery.
    // The WebSocket gateway subscribes to alerts:{orgId} and pushes
    // notifications to connected browsers instantly.
    await this.redisService.publish(
      `alerts:${organizationId}`,
      JSON.stringify({
        alertId: alert.id,
        title: alert.title,
        severity,
        deviceId,
        timestamp: new Date().toISOString(),
      }),
    );

    this.logger.log(
      `Alert created: ${alert.id} from rule ${ruleName} for device ${deviceId}`,
    );
  }

  /**
   * Extract a value from nested metrics using dot-notation path.
   *
   * Helper used to pull the current metric value for the alert message.
   */
  private extractValue(field: string, metrics: Record<string, any>): any {
    const fieldParts = field.replace('metrics.', '').split('.');
    let value: any = metrics;
    for (const part of fieldParts) {
      value = value?.[part];
    }
    return value;
  }
}
