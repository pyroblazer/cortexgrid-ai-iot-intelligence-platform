/**
 * @file device.service.ts
 * @description Business logic for managing IoT devices: CRUD operations,
 * device limit enforcement, status tracking, and caching.
 *
 * ELI5: This file manages the "things" (IoT devices like sensors, thermostats,
 * factory machines) that send data to the platform. Each device belongs to
 * an organization. Think of it as the inventory management system for IoT hardware.
 *
 * KEY CONCEPTS:
 *   - Device Limit Enforcement: Each subscription plan allows a certain number
 *     of devices (Free=5, Pro=50, Enterprise=1000). This service checks the limit
 *     BEFORE creating a new device and rejects if the org is at capacity.
 *
 *   - Soft Delete: Devices are never truly deleted from the database. Instead,
 *     we set isActive=false. This preserves historical telemetry data and allows
 *     reactivation. It's like archiving instead of shredding documents.
 *
 *   - Redis Caching: Device info and status are cached in Redis with short TTLs
 *     (30 seconds for status, 1 hour for device info). This avoids hammering
 *     the database when dashboards poll for device status frequently.
 *
 *   - Serial Number Uniqueness: Each physical device has a unique serial number.
 *     This prevents accidentally registering the same physical device twice.
 */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DeviceStatus, DeviceType, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

/** Options for paginated device listing with optional filters. */
interface FindAllOptions {
  page: number;
  limit: number;
  status?: DeviceStatus;
  type?: DeviceType;
  search?: string;
  tags?: string[];
}

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Register a new IoT device under an organization.
   *
   * ELI5: When someone connects a new sensor or device to the platform,
   * this method creates its record in the database. But first, it checks
   * two important rules:
   *   1. The organization hasn't exceeded its device limit (plan-based)
   *   2. No other device has the same serial number (globally unique)
   *
   * New devices start with OFFLINE status because they haven't connected yet.
   */
  async create(organizationId: string, createDto: CreateDeviceDto) {
    // ── Device Limit Check ──
    // Look up the organization's plan to find how many devices they're allowed.
    // This is a core monetization gate: Free=5, Pro=50, Enterprise=1000.
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { deviceLimit: true, plan: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Count how many active devices the org currently has.
    const currentDeviceCount = await this.prisma.device.count({
      where: { organizationId, isActive: true },
    });

    // Reject if they've hit their plan's device limit.
    // The error message suggests upgrading, which drives conversions.
    if (currentDeviceCount >= organization.deviceLimit) {
      throw new BadRequestException(
        `Device limit reached (${organization.deviceLimit}). Upgrade your plan to add more devices.`,
      );
    }

    // ── Serial Number Uniqueness Check ──
    // Serial numbers are globally unique - no two devices can share one,
    // even across different organizations. This prevents registering
    // the same physical device twice.
    const existingDevice = await this.prisma.device.findUnique({
      where: { serialNumber: createDto.serialNumber },
    });

    if (existingDevice) {
      throw new BadRequestException(
        'A device with this serial number already exists',
      );
    }

    // Create the device record with initial OFFLINE status.
    const device = await this.prisma.device.create({
      data: {
        organizationId,
        name: createDto.name,
        serialNumber: createDto.serialNumber,
        type: createDto.type,
        status: DeviceStatus.OFFLINE,  // New devices start offline
        profile: createDto.profile || {},      // Device capabilities/config
        metadata: createDto.metadata || {},    // Extra info (manufacturer, model, etc.)
        firmwareVersion: createDto.firmwareVersion,
        location: createDto.location,
        tags: createDto.tags || [],
        isActive: true,
      },
    });

    this.logger.log(`Device created: ${device.id} (${device.serialNumber})`);

    // Cache the device info in Redis for fast lookups.
    // TTL of 1 hour is reasonable since device info rarely changes.
    await this.redisService.set(
      `device:${device.id}`,
      JSON.stringify({
        id: device.id,
        organizationId,
        serialNumber: device.serialNumber,
        status: device.status,
      }),
      3600, // 1 hour TTL
    );

    return device;
  }

  /**
   * List all devices in an organization with pagination and filtering.
   *
   * ELI5: Returns a page of devices, like flipping through pages of a catalog.
   * Supports filtering by status (online/offline), type (sensor/gateway/etc.),
   * searching by name/serial/location, and filtering by tags.
   *
   * Uses Promise.all to run the data query and count query in parallel,
   // cutting response time roughly in half compared to running them sequentially.
   */
  async findAll(organizationId: string, options: FindAllOptions) {
    const { page, limit, status, type, search, tags } = options;
    const skip = (page - 1) * limit;

    // Build the WHERE clause dynamically based on which filters are provided.
    // Each filter is optional - only applied if a value was passed.
    const where: Prisma.DeviceWhereInput = {
      organizationId,
      isActive: true,
      ...(status && { status }),
      ...(type && { type }),
      // hasEvery matches devices that have ALL specified tags
      ...(tags && tags.length > 0 && {
        tags: { hasEvery: tags },
      }),
      // Search across multiple fields with case-insensitive matching
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { serialNumber: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Run the paginated query and the total count in parallel for efficiency.
    // _count includes related telemetry and alert counts for each device.
    const [devices, total] = await Promise.all([
      this.prisma.device.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { telemetry: true, alerts: true },
          },
        },
      }),
      this.prisma.device.count({ where }),
    ]);

    return {
      data: devices,
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

  /**
   * Get a single device's full details by ID.
   *
   * Includes the parent organization info and counts of related
   * telemetry records and alerts for dashboard display.
   */
  async findOne(organizationId: string, deviceId: string) {
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, organizationId, isActive: true },
      include: {
        organization: {
          select: { id: true, name: true, plan: true },
        },
        _count: {
          select: { telemetry: true, alerts: true },
        },
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    return device;
  }

  /**
   * Get a device's current status including latest telemetry reading.
   *
   * ELI5: This is the "at a glance" view of a device. Shows whether it's
   * online/offline, when it was last seen, what firmware it's running,
   * and the most recent sensor readings.
   *
   * Uses Redis caching with a 30-second TTL because device status
   * changes relatively slowly and dashboards poll frequently.
   * 30 seconds is short enough to be reasonably fresh but long enough
   * to prevent database overload from many dashboard users.
   */
  async getStatus(organizationId: string, deviceId: string) {
    // Check Redis cache first - if we have a recent status, return it immediately.
    // This avoids a database query entirely for cached devices.
    const cached = await this.redisService.get(`device_status:${deviceId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, organizationId, isActive: true },
      select: {
        id: true,
        name: true,
        serialNumber: true,
        status: true,
        lastSeenAt: true,
        firmwareVersion: true,
        metadata: true,
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Fetch the most recent telemetry reading for this device.
    const latestTelemetry = await this.prisma.telemetry.findFirst({
      where: { deviceId },
      orderBy: { timestamp: 'desc' },
    });

    const statusResponse = {
      ...device,
      latestTelemetry,
      // Derive a boolean from the status enum for convenience
      isOnline: device.status === DeviceStatus.ONLINE,
      // Calculate milliseconds since last communication (for "last seen 5 min ago" UI)
      lastSeenAgo: device.lastSeenAt
        ? Date.now() - device.lastSeenAt.getTime()
        : null,
    };

    // Cache the computed status for 30 seconds.
    // Short TTL ensures near-real-time accuracy while still reducing DB load.
    await this.redisService.set(
      `device_status:${deviceId}`,
      JSON.stringify(statusResponse),
      30,
    );

    return statusResponse;
  }

  /**
   * Update a device's editable properties.
   *
   * Uses partial update semantics - only fields that are provided in the DTO
   * are updated. Fields not included in the request body remain unchanged.
   * After updating, invalidates relevant Redis caches so stale data isn't served.
   */
  async update(
    organizationId: string,
    deviceId: string,
    updateDto: UpdateDeviceDto,
  ) {
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, organizationId, isActive: true },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const updated = await this.prisma.device.update({
      where: { id: deviceId },
      data: {
        // Spread syntax only includes the field if a value was provided.
        // Using !== undefined checks allows setting fields to empty string/null.
        ...(updateDto.name && { name: updateDto.name }),
        ...(updateDto.profile && { profile: updateDto.profile }),
        ...(updateDto.metadata && { metadata: updateDto.metadata }),
        ...(updateDto.firmwareVersion !== undefined && {
          firmwareVersion: updateDto.firmwareVersion,
        }),
        ...(updateDto.location !== undefined && { location: updateDto.location }),
        ...(updateDto.tags && { tags: updateDto.tags }),
        ...(updateDto.isActive !== undefined && { isActive: updateDto.isActive }),
      },
    });

    // Invalidate both device info and status caches so the next read
    // fetches fresh data from the database.
    await this.redisService.del(`device:${deviceId}`);
    await this.redisService.del(`device_status:${deviceId}`);

    this.logger.log(`Device updated: ${deviceId}`);
    return updated;
  }

  /**
   * Soft-delete a device by setting isActive to false.
   *
   * ELI5: Instead of permanently deleting the device and losing all its
   * historical telemetry data, we just "archive" it. The device disappears
   * from listings (which filter isActive=true) but its data stays safe.
   *
   * WHY soft delete? IoT data is valuable. A factory might want to review
   * sensor readings from a decommissioned machine years later. Also,
   * accidental deletions can be easily reversed by setting isActive back to true.
   */
  async remove(organizationId: string, deviceId: string) {
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, organizationId, isActive: true },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Set isActive=false instead of actually deleting the row.
    await this.prisma.device.update({
      where: { id: deviceId },
      data: { isActive: false },
    });

    // Clean up caches so the deactivated device doesn't appear in cached lists.
    await this.redisService.del(`device:${deviceId}`);
    await this.redisService.del(`device_status:${deviceId}`);

    this.logger.log(`Device deactivated: ${deviceId}`);
    return { message: 'Device deactivated successfully' };
  }

  /**
   * Get the most recent telemetry reading for a specific device.
   *
   * Useful for "last known value" displays on device detail pages.
   */
  async getLatestTelemetry(organizationId: string, deviceId: string) {
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, organizationId, isActive: true },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const latest = await this.prisma.telemetry.findFirst({
      where: { deviceId },
      orderBy: { timestamp: 'desc' },
    });

    if (!latest) {
      return { deviceId, telemetry: null };
    }

    return { deviceId, telemetry: latest };
  }

  /**
   * Update a device's connectivity status (called by MQTT service).
   *
   * When a device connects or disconnects via MQTT, this method updates
   * its status in the database and clears the status cache so the
   * dashboard reflects the change within 30 seconds.
   *
   * Also records lastSeenAt so we can calculate "last seen X minutes ago".
   */
  async updateDeviceStatus(
    deviceId: string,
    status: DeviceStatus,
  ): Promise<void> {
    await this.prisma.device.update({
      where: { id: deviceId },
      data: {
        status,
        lastSeenAt: new Date(),
      },
    });

    // Clear the cached status so the next request gets the updated value.
    await this.redisService.del(`device_status:${deviceId}`);
  }
}
