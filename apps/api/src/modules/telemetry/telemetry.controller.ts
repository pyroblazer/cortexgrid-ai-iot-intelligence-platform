import {
  Controller,
  Get,
  Post,
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
