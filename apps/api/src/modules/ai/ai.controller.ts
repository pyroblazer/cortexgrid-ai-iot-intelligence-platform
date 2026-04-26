import {
  Controller,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiQueryDto } from './dto/ai-query.dto';
import { AnomalyDetectionDto } from './dto/anomaly-detection.dto';
import { TelemetrySummaryDto } from './dto/telemetry-summary.dto';

@ApiTags('AI')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('query')
  @ApiOperation({ summary: 'Ask a natural language query about your telemetry data' })
  @ApiResponse({ status: 200, description: 'Query processed and response returned' })
  @ApiResponse({ status: 400, description: 'Invalid query input' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async naturalLanguageQuery(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: AiQueryDto,
  ) {
    return this.aiService.naturalLanguageQuery(
      dto.query,
      organizationId,
      dto.deviceIds,
      dto.timeRange,
    );
  }

  @Post('anomaly-detection')
  @ApiOperation({ summary: 'Detect anomalies in device telemetry data' })
  @ApiResponse({ status: 200, description: 'Anomaly detection results returned' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async detectAnomalies(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: AnomalyDetectionDto,
  ) {
    return this.aiService.detectAnomalies(
      dto.deviceId,
      organizationId,
      dto.metric,
      dto.timeRange,
      dto.sensitivity,
    );
  }

  @Post('summary')
  @ApiOperation({ summary: 'Generate a natural language summary of telemetry data' })
  @ApiResponse({ status: 200, description: 'Telemetry summary returned' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async summarizeTelemetry(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: TelemetrySummaryDto,
  ) {
    return this.aiService.summarizeTelemetry(
      dto.deviceIds,
      organizationId,
      dto.timeRange,
    );
  }
}
