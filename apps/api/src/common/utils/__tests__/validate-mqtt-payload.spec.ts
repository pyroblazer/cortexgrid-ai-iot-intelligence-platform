import { validateMqttPayload } from '../validate-mqtt-payload';

describe('validateMqttPayload', () => {
  it('should reject non-objects', () => {
    expect(validateMqttPayload(null)).toEqual({
      valid: false,
      error: 'Payload must be a JSON object',
    });
    expect(validateMqttPayload(undefined)).toEqual({
      valid: false,
      error: 'Payload must be a JSON object',
    });
    expect(validateMqttPayload('string')).toEqual({
      valid: false,
      error: 'Payload must be a JSON object',
    });
    expect(validateMqttPayload(123)).toEqual({
      valid: false,
      error: 'Payload must be a JSON object',
    });
    expect(validateMqttPayload(true)).toEqual({
      valid: false,
      error: 'Payload must be a JSON object',
    });
  });

  it('should reject missing metrics', () => {
    expect(validateMqttPayload({})).toEqual({
      valid: false,
      error: 'Payload must contain a "metrics" object',
    });
    expect(validateMqttPayload({ timestamp: '2024-01-01' })).toEqual({
      valid: false,
      error: 'Payload must contain a "metrics" object',
    });
  });

  it('should reject empty metrics', () => {
    expect(validateMqttPayload({ metrics: {} })).toEqual({
      valid: false,
      error: 'Metrics object cannot be empty',
    });
  });

  it('should reject metrics as array', () => {
    expect(validateMqttPayload({ metrics: [1, 2, 3] })).toEqual({
      valid: false,
      error: 'Payload must contain a "metrics" object',
    });
  });

  it('should reject metrics as string', () => {
    expect(validateMqttPayload({ metrics: 'not an object' })).toEqual({
      valid: false,
      error: 'Payload must contain a "metrics" object',
    });
  });

  it('should accept valid payload', () => {
    const result = validateMqttPayload({
      metrics: { temperature: 72.5, humidity: 45 },
    });
    expect(result).toEqual({ valid: true });
  });

  it('should accept valid payload with timestamp', () => {
    const result = validateMqttPayload({
      metrics: { temperature: 72.5 },
      timestamp: '2024-01-15T10:30:00Z',
    });
    expect(result).toEqual({ valid: true });
  });

  it('should accept valid payload with string metric value', () => {
    const result = validateMqttPayload({
      metrics: { status: 'online' },
    });
    expect(result).toEqual({ valid: true });
  });

  it('should accept valid payload with boolean metric value', () => {
    const result = validateMqttPayload({
      metrics: { isActive: true },
    });
    expect(result).toEqual({ valid: true });
  });

  it('should reject metric keys too long', () => {
    const longKey = 'a'.repeat(65); // MAX_METRIC_KEY_LENGTH is 64
    const result = validateMqttPayload({
      metrics: { [longKey]: 42 },
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Metric key too long');
    expect(result.error).toContain('a...');
  });

  it('should accept metric keys at max length', () => {
    const maxKey = 'a'.repeat(64);
    const result = validateMqttPayload({
      metrics: { [maxKey]: 42 },
    });
    expect(result).toEqual({ valid: true });
  });

  it('should reject non-number/string/boolean values', () => {
    const result = validateMqttPayload({
      metrics: { nested: { value: 10 } },
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Metric value must be number, string, or boolean');
    expect(result.error).toContain('nested');
  });

  it('should reject null metric values', () => {
    const result = validateMqttPayload({
      metrics: { value: null },
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Metric value must be number, string, or boolean');
  });

  it('should reject undefined metric values', () => {
    const result = validateMqttPayload({
      metrics: { value: undefined },
    });
    // When iterating, undefined values have typeof 'undefined' which is not in the allowed list
    // But actually, Object.entries will skip undefined values... let's check
    // Actually, Object.keys includes keys with undefined values
    expect(result.valid).toBe(false);
  });

  it('should reject string values too long', () => {
    const longValue = 'x'.repeat(1025); // MAX_METRIC_VALUE_LENGTH is 1024
    const result = validateMqttPayload({
      metrics: { description: longValue },
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Metric string value too long');
    expect(result.error).toContain('description');
  });

  it('should accept string values at max length', () => {
    const maxValue = 'x'.repeat(1024);
    const result = validateMqttPayload({
      metrics: { description: maxValue },
    });
    expect(result).toEqual({ valid: true });
  });

  it('should reject too many metric keys', () => {
    const metrics: Record<string, number> = {};
    for (let i = 0; i < 65; i++) {
      metrics[`key_${i}`] = i;
    }
    const result = validateMqttPayload({ metrics });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Metrics object cannot exceed 64 keys');
  });

  it('should accept exactly 64 metric keys', () => {
    const metrics: Record<string, number> = {};
    for (let i = 0; i < 64; i++) {
      metrics[`key_${i}`] = i;
    }
    const result = validateMqttPayload({ metrics });
    expect(result).toEqual({ valid: true });
  });

  it('should validate optional timestamp - valid ISO string', () => {
    const result = validateMqttPayload({
      metrics: { temp: 25 },
      timestamp: '2024-01-15T10:30:00.000Z',
    });
    expect(result).toEqual({ valid: true });
  });

  it('should validate optional timestamp - reject invalid timestamp', () => {
    const result = validateMqttPayload({
      metrics: { temp: 25 },
      timestamp: 'not-a-date',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid timestamp format');
  });

  it('should pass when timestamp is not provided (undefined)', () => {
    const result = validateMqttPayload({
      metrics: { temp: 25 },
    });
    expect(result).toEqual({ valid: true });
  });

  it('should handle mixed valid and invalid metrics checking first violation', () => {
    // First metric is valid, second has object value
    const result = validateMqttPayload({
      metrics: {
        temperature: 72,
        badValue: { nested: true },
      },
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Metric value must be number, string, or boolean');
  });
});
