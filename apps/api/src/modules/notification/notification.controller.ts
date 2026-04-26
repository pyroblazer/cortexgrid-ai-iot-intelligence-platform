import {
  Controller,
  Get,
  Patch,
  Put,
  Body,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';
import { MarkReadDto } from './dto/mark-read.dto';
import { UpdatePreferencesDto } from './dto/preferences.dto';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'List user notifications (paginated)' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved' })
  async findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.notificationService.findAll(req.user.id, req.user.organizationId, {
      page: parseInt(page || '1'),
      pageSize: parseInt(pageSize || '20'),
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved' })
  async getUnreadCount(@Request() req: any) {
    const count = await this.notificationService.getUnreadCount(req.user.id);
    return { success: true, data: { count } };
  }

  @Patch('read')
  @ApiOperation({ summary: 'Mark specific notifications as read' })
  @ApiResponse({ status: 200, description: 'Notifications marked as read' })
  async markAsRead(@Request() req: any, @Body() dto: MarkReadDto) {
    await this.notificationService.markAsRead(dto.notificationIds, req.user.id);
    return { success: true, message: 'Notifications marked as read' };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@Request() req: any) {
    await this.notificationService.markAllAsRead(req.user.id, req.user.organizationId);
    return { success: true, message: 'All notifications marked as read' };
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences for the current user' })
  @ApiResponse({ status: 200, description: 'Preferences retrieved' })
  async getPreferences(@Request() req: any) {
    return this.notificationService.getPreferences(req.user.id);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update notification preferences for the current user' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  async updatePreferences(
    @Request() req: any,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.notificationService.updatePreferences(req.user.id, dto);
  }
}
