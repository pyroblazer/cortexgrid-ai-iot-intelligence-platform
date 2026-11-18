import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TelemetryService } from './telemetry.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IngestTelemetryDto, QueryTelemetryDto } from './dto/ingest-telemetry.dto';

@ApiTags('Telemetry')
@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Ingest telemetry data for a device' })
  @ApiResponse({ status: 201, description: 'Telemetry data ingested' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async ingest(
    @CurrentUser('organizationId') organizationId: string,
    @Body() ingestDto: IngestTelemetryDto,
  ) {
    return this.telemetryService.ingest(organizationId, ingestDto);
  }

  @Get(':deviceId/export')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Export a device\'s telemetry as CSV' })
  @ApiParam({ name: 'deviceId', description: 'Device ID' })
  @ApiQuery({ name: 'startTime', required: false })
  @ApiQuery({ name: 'endTime', required: false })
  async exportCsv(
    @CurrentUser('organizationId') organizationId: string,
    @Param('deviceId') deviceId: string,
    @Query() queryDto: QueryTelemetryDto,
    @Res() res: Response,
  ) {
    const csv = await this.telemetryService.exportCsv(organizationId, deviceId, queryDto);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="telemetry-${deviceId.replace(/[^A-Za-z0-9_-]/g, '')}.csv"`);
    res.send(csv);
  }

  @Get(':deviceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Query telemetry data for a device with time range and aggregation' })
  @ApiResponse({ status: 200, description: 'Telemetry data retrieved' })
  @ApiParam({ name: 'deviceId', description: 'Device ID' })
  @ApiQuery({ name: 'startTime', required: false })
  @ApiQuery({ name: 'endTime', required: false })
  @ApiQuery({ name: 'interval', required: false, enum: ['1m', '5m', '15m', '1h', '1d'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async query(
    @CurrentUser('organizationId') organizationId: string,
    @Param('deviceId') deviceId: string,
    @Query() queryDto: QueryTelemetryDto,
  ) {
    return this.telemetryService.query(organizationId, deviceId, queryDto);
  }

  @Get('latest/:deviceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get latest telemetry reading for a device' })
  @ApiResponse({ status: 200, description: 'Latest telemetry retrieved' })
  @ApiParam({ name: 'deviceId', description: 'Device ID' })
  async getLatest(
    @CurrentUser('organizationId') organizationId: string,
    @Param('deviceId') deviceId: string,
  ) {
    return this.telemetryService.getLatest(organizationId, deviceId);
  }
}
