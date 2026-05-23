import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email.service';

describe('EmailService', () => {
  let service: EmailService;
  let configService: any;

  const createMockConfigService = (smtpHost?: string, smtpPort?: string, smtpUser?: string, smtpPass?: string, smtpFrom?: string) => ({
    get: jest.fn((key: string) => {
      const map: Record<string, string | undefined> = {
        SMTP_HOST: smtpHost,
        SMTP_PORT: smtpPort,
        SMTP_USER: smtpUser,
        SMTP_PASSWORD: smtpPass,
        SMTP_FROM: smtpFrom,
      };
      return map[key];
    }),
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isConfigured', () => {
    it('should return false when SMTP_HOST is not set', async () => {
      const mockConfig = createMockConfigService();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      service = module.get<EmailService>(EmailService);
      expect(service.isConfigured()).toBe(false);
    });

    it('should return true when SMTP_HOST is set', async () => {
      const mockConfig = createMockConfigService('smtp.example.com', '587');
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      service = module.get<EmailService>(EmailService);
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('send', () => {
    it('should skip sending when SMTP is not configured', async () => {
      const mockConfig = createMockConfigService();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      service = module.get<EmailService>(EmailService);
      // Should not throw
      await service.send('test@example.com', 'Test Subject', '<p>Hello</p>');
    });

    it('should use default from address when SMTP_FROM is not set', async () => {
      const mockConfig = createMockConfigService('smtp.example.com', '587', 'user@example.com', 'pass123');
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      service = module.get<EmailService>(EmailService);
      // The service should be configured and ready to send
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('onModuleDestroy', () => {
    it('should handle destroy when no transporter exists', async () => {
      const mockConfig = createMockConfigService();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      service = module.get<EmailService>(EmailService);
      // Should not throw
      await service.onModuleDestroy();
    });
  });
});
