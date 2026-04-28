const MAX_METRICS_SIZE = 64;
const MAX_METRIC_KEY_LENGTH = 64;
const MAX_METRIC_VALUE_LENGTH = 1024;

export function validateMqttPayload(payload: any): { valid: boolean; error?: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Payload must be a JSON object' };
  }

  if (!payload.metrics || typeof payload.metrics !== 'object' || Array.isArray(payload.metrics)) {
    return { valid: false, error: 'Payload must contain a "metrics" object' };
  }

  const keys = Object.keys(payload.metrics);
  if (keys.length === 0) {
    return { valid: false, error: 'Metrics object cannot be empty' };
  }

  if (keys.length > MAX_METRICS_SIZE) {
    return { valid: false, error: `Metrics object cannot exceed ${MAX_METRICS_SIZE} keys` };
  }

  for (const key of keys) {
    if (key.length > MAX_METRIC_KEY_LENGTH) {
      return { valid: false, error: `Metric key too long: ${key.substring(0, 20)}...` };
    }

    const value = payload.metrics[key];
    const valueType = typeof value;
    if (!['number', 'string', 'boolean'].includes(valueType)) {
      return { valid: false, error: `Metric value must be number, string, or boolean: ${key}` };
    }

    if (valueType === 'string' && value.length > MAX_METRIC_VALUE_LENGTH) {
      return { valid: false, error: `Metric string value too long: ${key}` };
    }
  }

  if (payload.timestamp !== undefined) {
    const parsed = new Date(payload.timestamp);
    if (isNaN(parsed.getTime())) {
      return { valid: false, error: 'Invalid timestamp format' };
    }
  }

  return { valid: true };
}
