import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email.service';

describe('EmailService', () => {
  let service: EmailService;
  let configService: any;

  const createMockConfigService = (resendApiKey?: string, emailFrom?: string) => ({
    get: jest.fn((key: string) => {
      const map: Record<string, string | undefined> = {
        RESEND_API_KEY: resendApiKey,
        EMAIL_FROM: emailFrom,
      };
      return map[key];
    }),
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isConfigured', () => {
    it('should return false when RESEND_API_KEY is not set', async () => {
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

    it('should return true when RESEND_API_KEY is set', async () => {
      const mockConfig = createMockConfigService('re_test_key');
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
    it('should skip sending when RESEND_API_KEY is not configured', async () => {
      const mockConfig = createMockConfigService();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      service = module.get<EmailService>(EmailService);
      await service.send('test@example.com', 'Test Subject', '<p>Hello</p>');
    });

    it('should use default from address when EMAIL_FROM is not set', async () => {
      const mockConfig = createMockConfigService('re_test_key');
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
});
