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
import { AlertService } from './alert.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateAlertRuleDto, UpdateAlertRuleDto, AcknowledgeAlertDto } from './dto/alert.dto';
import { AuditAction } from '../../common/decorators/audit-action.decorator';

@ApiTags('Alerts')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  // ── Alert Rules ────────────────────────────────────────────────────────────

  @Post('rules')
  @AuditAction('alertRule.create', 'AlertRule')
  @ApiOperation({ summary: 'Create a new alert rule' })
  @ApiResponse({ status: 201, description: 'Alert rule created' })
  async createRule(
    @CurrentUser('organizationId') organizationId: string,
    @Body() createDto: CreateAlertRuleDto,
  ) {
    return this.alertService.createRule(organizationId, createDto);
  }

  @Get('rules')
  @ApiOperation({ summary: 'List alert rules for the organization' })
  @ApiResponse({ status: 200, description: 'Alert rules retrieved' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async getRules(
    @CurrentUser('organizationId') organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.alertService.getRules(organizationId, {
      page: parseInt(page || '1', 10),
      limit: parseInt(limit || '20', 10),
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get('rules/:id')
  @ApiOperation({ summary: 'Get alert rule details' })
  @ApiResponse({ status: 200, description: 'Alert rule details retrieved' })
  @ApiParam({ name: 'id', description: 'Alert rule ID' })
  async getRule(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') ruleId: string,
  ) {
    return this.alertService.getRule(organizationId, ruleId);
  }

  @Patch('rules/:id')
  @AuditAction('alertRule.update', 'AlertRule')
  @ApiOperation({ summary: 'Update an alert rule' })
  @ApiResponse({ status: 200, description: 'Alert rule updated' })
  @ApiParam({ name: 'id', description: 'Alert rule ID' })
  async updateRule(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') ruleId: string,
    @Body() updateDto: UpdateAlertRuleDto,
  ) {
    return this.alertService.updateRule(organizationId, ruleId, updateDto);
  }

  @Delete('rules/:id')
  @AuditAction('alertRule.delete', 'AlertRule')
  @ApiOperation({ summary: 'Delete an alert rule' })
  @ApiResponse({ status: 200, description: 'Alert rule deleted' })
  @ApiParam({ name: 'id', description: 'Alert rule ID' })
  async deleteRule(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') ruleId: string,
  ) {
    return this.alertService.deleteRule(organizationId, ruleId);
  }

  // ── Alerts ─────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List alerts with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Alerts retrieved' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'] })
  @ApiQuery({ name: 'severity', required: false, enum: ['CRITICAL', 'WARNING', 'INFO'] })
  @ApiQuery({ name: 'deviceId', required: false, type: String })
  async getAlerts(
    @CurrentUser('organizationId') organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('deviceId') deviceId?: string,
  ) {
    return this.alertService.getAlerts(organizationId, {
      page: parseInt(page || '1', 10),
      limit: parseInt(limit || '20', 10),
      status: status as any,
      severity: severity as any,
      deviceId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get alert details' })
  @ApiResponse({ status: 200, description: 'Alert details retrieved' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  async getAlert(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') alertId: string,
  ) {
    return this.alertService.getAlert(organizationId, alertId);
  }

  @Patch(':id/acknowledge')
  @AuditAction('alert.acknowledge', 'Alert')
  @ApiOperation({ summary: 'Acknowledge an alert' })
  @ApiResponse({ status: 200, description: 'Alert acknowledged' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  async acknowledgeAlert(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id') alertId: string,
    @Body() acknowledgeDto?: AcknowledgeAlertDto,
  ) {
    return this.alertService.acknowledgeAlert(
      organizationId,
      userId,
      alertId,
      acknowledgeDto?.note,
    );
  }

  @Patch(':id/resolve')
  @AuditAction('alert.resolve', 'Alert')
  @ApiOperation({ summary: 'Resolve an alert' })
  @ApiResponse({ status: 200, description: 'Alert resolved' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  async resolveAlert(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') alertId: string,
  ) {
    return this.alertService.resolveAlert(organizationId, alertId);
  }
}
