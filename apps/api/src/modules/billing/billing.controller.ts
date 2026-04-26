import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  RawBodyRequest,
  HttpCode,
  HttpStatus,
  Headers,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiQuery,
} from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CreateCheckoutDto, CreatePortalDto } from './dto/checkout.dto';
import { Request } from 'express';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current subscription details' })
  @ApiResponse({ status: 200, description: 'Subscription details retrieved' })
  async getSubscription(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.billingService.getSubscription(organizationId);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a Stripe checkout session for plan upgrade' })
  @ApiResponse({
    status: 200,
    description: 'Checkout session created',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            url: { type: 'string' },
          },
        },
      },
    },
  })
  async createCheckout(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('email') email: string,
    @Body() checkoutDto: CreateCheckoutDto,
  ) {
    return this.billingService.createCheckoutSession(
      organizationId,
      email,
      checkoutDto,
    );
  }

  @Post('portal')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a Stripe customer portal session' })
  @ApiResponse({
    status: 200,
    description: 'Portal session created',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: { type: 'object', properties: { url: { type: 'string' } } },
      },
    },
  })
  async createPortal(
    @CurrentUser('organizationId') organizationId: string,
    @Body() portalDto: CreatePortalDto,
  ) {
    return this.billingService.createPortalSession(organizationId, portalDto);
  }

  @Get('usage')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get usage records for the organization' })
  @ApiResponse({ status: 200, description: 'Usage records retrieved' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUsage(
    @CurrentUser('organizationId') organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.billingService.getUsage(organizationId, {
      page: parseInt(page || '1', 10),
      limit: parseInt(limit || '20', 10),
    });
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.billingService.handleWebhook(req.rawBody, signature);
  }

  @Get('plans')
  @Public()
  @ApiOperation({ summary: 'Get available plans and pricing' })
  @ApiResponse({ status: 200, description: 'Plans retrieved' })
  async getPlans() {
    return this.billingService.getAvailablePlans();
  }
}
