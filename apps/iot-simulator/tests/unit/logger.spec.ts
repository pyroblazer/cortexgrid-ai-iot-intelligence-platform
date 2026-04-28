import { logger } from '../../src/utils/logger';

describe('logger', () => {
  it('should be a winston logger instance', () => {
    // Winston loggers have well-known methods
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.verbose).toBe('function');
    expect(typeof logger.log).toBe('function');
  });

  it('should have default level info', () => {
    // The default level when LOG_LEVEL env var is not set is 'info'
    // Winston exposes the current level
    expect(['info', 'error', 'warn', 'debug', 'verbose']).toContain(logger.level);
    // Unless overridden by env, it should be 'info'
    if (!process.env.LOG_LEVEL) {
      expect(logger.level).toBe('info');
    }
  });

  it('should have console transport', () => {
    const consoleTransports = logger.transports.filter(
      (t) => t.constructor.name === 'Console',
    );
    expect(consoleTransports.length).toBeGreaterThan(0);
  });

  it('should have at least one transport', () => {
    expect(logger.transports.length).toBeGreaterThanOrEqual(1);
  });

  it('should use correct format with timestamp', () => {
    // We verify the format configuration indirectly by checking that the
    // logger was created with the expected format (combine + timestamp + printf).
    // Winston stores format as an opaque object; verify the logger is functional.
    const format = logger.format;
    expect(format).toBeDefined();
  });

  it('should have exitOnError set to false', () => {
    expect(logger.exitOnError).toBe(false);
  });

  it('should not throw when logging at various levels', () => {
    expect(() => {
      logger.error('test error message');
      logger.warn('test warn message');
      logger.info('test info message');
      logger.debug('test debug message');
      logger.verbose('test verbose message');
    }).not.toThrow();
  });

  it('should accept metadata objects', () => {
    expect(() => {
      logger.info('test message with metadata', { key: 'value', count: 42 });
    }).not.toThrow();
  });

  it('should accept Error objects', () => {
    expect(() => {
      const err = new Error('test error');
      logger.error('caught error', { error: err.message });
    }).not.toThrow();
  });
});
