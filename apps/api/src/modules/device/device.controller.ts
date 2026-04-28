import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { DeviceService } from './device.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { AuditAction } from '../../common/decorators/audit-action.decorator';

@ApiTags('Devices')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Post()
  @AuditAction('device.create', 'Device')
  @ApiOperation({ summary: 'Register a new device' })
  @ApiResponse({ status: 201, description: 'Device registered successfully' })
  @ApiResponse({ status: 400, description: 'Device limit reached or serial number exists' })
  async create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() createDto: CreateDeviceDto,
  ) {
    return this.deviceService.create(organizationId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'List devices with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Devices list retrieved' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['ONLINE', 'OFFLINE', 'MAINTENANCE'] })
  @ApiQuery({ name: 'type', required: false, enum: ['SENSOR', 'ACTUATOR', 'GATEWAY'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'tags', required: false, type: String })
  async findAll(
    @CurrentUser('organizationId') organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('tags') tags?: string,
  ) {
    return this.deviceService.findAll(organizationId, {
      page: parseInt(page || '1', 10),
      limit: parseInt(limit || '20', 10),
      status: status as any,
      type: type as any,
      search,
      tags: tags ? tags.split(',') : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get device details' })
  @ApiResponse({ status: 200, description: 'Device details retrieved' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @ApiParam({ name: 'id', description: 'Device ID' })
  async findOne(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.deviceService.findOne(organizationId, id);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get device status and last known info' })
  @ApiResponse({ status: 200, description: 'Device status retrieved' })
  @ApiParam({ name: 'id', description: 'Device ID' })
  async getStatus(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.deviceService.getStatus(organizationId, id);
  }

  @Patch(':id')
  @AuditAction('device.update', 'Device')
  @ApiOperation({ summary: 'Update device details' })
  @ApiResponse({ status: 200, description: 'Device updated' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @ApiParam({ name: 'id', description: 'Device ID' })
  async update(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateDeviceDto,
  ) {
    return this.deviceService.update(organizationId, id, updateDto);
  }

  @Delete(':id')
  @AuditAction('device.delete', 'Device')
  @ApiOperation({ summary: 'Delete (deactivate) a device' })
  @ApiResponse({ status: 200, description: 'Device deactivated' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @ApiParam({ name: 'id', description: 'Device ID' })
  async remove(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.deviceService.remove(organizationId, id);
  }

  @Get(':id/telemetry/latest')
  @ApiOperation({ summary: 'Get latest telemetry for a device' })
  @ApiResponse({ status: 200, description: 'Latest telemetry retrieved' })
  @ApiParam({ name: 'id', description: 'Device ID' })
  async getLatestTelemetry(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') deviceId: string,
  ) {
    return this.deviceService.getLatestTelemetry(organizationId, deviceId);
  }
}
