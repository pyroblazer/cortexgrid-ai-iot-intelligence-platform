/**
 * Unit tests for ApiClient (src/lib/api-client.ts)
 *
 * Tests the typed HTTP client including:
 * - Constructor baseURL configuration
 * - HTTP method delegation (get, post, put, patch, delete)
 * - Authorization header injection from localStorage
 * - 401 auto-refresh flow with retry
 * - Response envelope unwrapping ({ success: true, data })
 * - Error handling for non-success responses
 * - Token management (setTokens, clearTokens)
 */

// Store original fetch
const originalFetch = global.fetch;

// Helper to create a mock response object (avoids using Response constructor
// which may not be available in all jsdom versions)
function mockResponse(body: string, { status = 200, ok = status >= 200 && status < 300 } = {}) {
  return {
    ok,
    status,
    headers: new Map(Object.entries({ 'Content-Type': 'application/json' })),
    json: jest.fn().mockResolvedValue(body ? JSON.parse(body) : null),
    text: jest.fn().mockResolvedValue(body),
  };
}

function successBody(data: unknown) {
  return JSON.stringify({ success: true, data });
}

function errorBody(code: string, message: string) {
  return JSON.stringify({ success: false, error: { code, message } });
}

// ---- Reset before each test ----
beforeEach(() => {
  jest.resetModules();
  localStorage.clear();
  global.fetch = originalFetch;
});

afterAll(() => {
  global.fetch = originalFetch;
});

// Helper to set global.fetch to a mock
function mockFetch(response: ReturnType<typeof mockResponse>) {
  global.fetch = jest.fn().mockResolvedValue(response);
  return global.fetch as jest.Mock;
}

function mockFetchSequence(responses: ReturnType<typeof mockResponse>[]) {
  global.fetch = jest.fn();
  responses.forEach((response) => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(response);
  });
  return global.fetch as jest.Mock;
}

// Helper to import a fresh ApiClient instance with a specific env var
async function importFreshClient(envUrl?: string) {
  process.env.NEXT_PUBLIC_API_URL = envUrl ?? '';
  const mod = await import('@/lib/api-client');
  return mod;
}

// ---- Constructor tests ----
describe('ApiClient constructor', () => {
  it('sets baseURL from NEXT_PUBLIC_API_URL env var', async () => {
    const { apiClient } = await importFreshClient('http://localhost:4000');
    const fetchMock = mockFetch(mockResponse(successBody('ok')));
    await apiClient.get('/test');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('http://localhost:4000/api/v1/test'),
      expect.anything()
    );
  });

  it('defaults baseURL to empty string when env var is not set', async () => {
    const { apiClient } = await importFreshClient(undefined);
    const fetchMock = mockFetch(mockResponse(successBody('ok')));
    await apiClient.get('/test');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/test',
      expect.anything()
    );
  });
});

// ---- HTTP method delegation tests ----
describe('ApiClient HTTP methods', () => {
  let apiClient: any;
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    const mod = await importFreshClient('http://api.test');
    apiClient = mod.apiClient;
    fetchMock = mockFetch(mockResponse(successBody({ result: 'ok' })));
  });

  it('GET calls fetch with GET method', async () => {
    await apiClient.get('/devices');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/v1/devices',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('POST calls fetch with POST method and JSON body', async () => {
    const body = { name: 'test' };
    await apiClient.post('/devices', body);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/v1/devices',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(body),
      })
    );
  });

  it('PUT calls fetch with PUT method and JSON body', async () => {
    const body = { name: 'updated' };
    await apiClient.put('/devices/123', body);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/v1/devices/123',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(body),
      })
    );
  });

  it('PATCH calls fetch with PATCH method and JSON body', async () => {
    const body = { status: 'ONLINE' };
    await apiClient.patch('/devices/123', body);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/v1/devices/123',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(body),
      })
    );
  });

  it('DELETE calls fetch with DELETE method', async () => {
    await apiClient.delete('/devices/123');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/v1/devices/123',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('POST without body does not send body', async () => {
    await apiClient.post('/auth/refresh');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/v1/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        body: undefined,
      })
    );
  });
});

// ---- Authorization header injection ----
describe('ApiClient Authorization header', () => {
  let apiClient: any;
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    const mod = await importFreshClient('http://api.test');
    apiClient = mod.apiClient;
    fetchMock = mockFetch(mockResponse(successBody({})));
  });

  it('includes Authorization header when token is in localStorage', async () => {
    localStorage.setItem('cortexgrid_access_token', 'my-token');
    await apiClient.get('/test');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
        }),
      })
    );
  });

  it('does not include Authorization header when no token', async () => {
    await apiClient.get('/test');
    const callArgs = fetchMock.mock.calls[0][1] as { headers: Record<string, string> };
    expect(callArgs.headers).not.toHaveProperty('Authorization');
  });

  it('always includes Content-Type application/json header', async () => {
    await apiClient.get('/test');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });
});

// ---- 401 refresh flow ----
describe('ApiClient 401 auto-refresh', () => {
  let apiClient: any;

  beforeEach(async () => {
    const mod = await importFreshClient('http://api.test');
    apiClient = mod.apiClient;
  });

  it('retries request after successful token refresh on 401', async () => {
    localStorage.setItem('cortexgrid_access_token', 'expired-token');
    localStorage.setItem('cortexgrid_refresh_token', 'valid-refresh');

    const fetchMock = mockFetchSequence([
      mockResponse('', { status: 401, ok: false }),
      mockResponse(successBody({ accessToken: 'new-access', refreshToken: 'new-refresh' })),
      mockResponse(successBody('retry-result')),
    ]);

    const result = await apiClient.get('/protected');
    expect(result).toBe('retry-result');
    expect(fetchMock).toHaveBeenCalledTimes(3); // original + refresh + retry
    // Verify the retry uses the new token
    const retryCall = fetchMock.mock.calls[2];
    expect(retryCall[1].headers.Authorization).toBe('Bearer new-access');
  });

  it('clears tokens and redirects when refresh fails on 401', async () => {
    localStorage.setItem('cortexgrid_access_token', 'expired-token');
    localStorage.setItem('cortexgrid_refresh_token', 'bad-refresh');

    mockFetchSequence([
      mockResponse('', { status: 401, ok: false }),
      mockResponse('', { status: 401, ok: false }),
    ]);

    await apiClient.get<string>('/protected').catch(() => 'errored');

    // After failed refresh, tokens should be cleared
    expect(localStorage.getItem('cortexgrid_access_token')).toBeNull();
    expect(localStorage.getItem('cortexgrid_refresh_token')).toBeNull();
  });

  it('does not attempt refresh when no access token exists', async () => {
    const fetchMock = mockFetch(
      mockResponse(errorBody('UNAUTHORIZED', 'No auth'), { status: 401, ok: false })
    );

    await expect(apiClient.get('/test')).rejects.toThrow('No auth');
    expect(fetchMock).toHaveBeenCalledTimes(1); // no refresh attempt
  });
});

// ---- Response envelope unwrapping ----
describe('ApiClient response envelope unwrapping', () => {
  let apiClient: any;

  beforeEach(async () => {
    const mod = await importFreshClient('http://api.test');
    apiClient = mod.apiClient;
  });

  it('unwraps { success: true, data } envelope to return just data', async () => {
    mockFetch(mockResponse(successBody({ id: 1, name: 'device' })));

    const result = await apiClient.get('/devices');
    expect(result).toEqual({ id: 1, name: 'device' });
  });

  it('throws error message from { success: false } envelope', async () => {
    mockFetch(mockResponse(errorBody('VALIDATION_ERROR', 'Email is invalid')));

    await expect(apiClient.get('/test')).rejects.toThrow('Email is invalid');
  });
});

// ---- Non-success response error handling ----
describe('ApiClient error handling', () => {
  let apiClient: any;

  beforeEach(async () => {
    const mod = await importFreshClient('http://api.test');
    apiClient = mod.apiClient;
  });

  it('throws error with message from error body on non-ok response', async () => {
    mockFetch(
      mockResponse(
        JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Device not found' } }),
        { status: 404, ok: false }
      )
    );

    await expect(apiClient.get('/devices/999')).rejects.toThrow('Device not found');
  });

  it('throws generic error when response body has no error message', async () => {
    mockFetch(
      mockResponse(JSON.stringify({}), { status: 500, ok: false })
    );

    await expect(apiClient.get('/test')).rejects.toThrow(
      'Request failed with status 500'
    );
  });

  it('throws generic error when response body cannot be parsed', async () => {
    // Create a mock response where json() throws
    const badResponse = {
      ok: false,
      status: 502,
      headers: new Map(),
      json: jest.fn().mockRejectedValue(new Error('invalid json')),
    };
    mockFetch(badResponse);

    await expect(apiClient.get('/test')).rejects.toThrow(
      'Request failed with status 502'
    );
  });
});

// ---- Token management ----
describe('ApiClient token management', () => {
  let apiClient: any;

  beforeEach(async () => {
    const mod = await importFreshClient('http://api.test');
    apiClient = mod.apiClient;
  });

  it('setTokens stores both tokens in localStorage', () => {
    apiClient.setTokens('access-123', 'refresh-456');
    expect(localStorage.getItem('cortexgrid_access_token')).toBe('access-123');
    expect(localStorage.getItem('cortexgrid_refresh_token')).toBe('refresh-456');
  });

  it('clearTokens removes both tokens from localStorage', () => {
    localStorage.setItem('cortexgrid_access_token', 'old-access');
    localStorage.setItem('cortexgrid_refresh_token', 'old-refresh');
    apiClient.clearTokens();
    expect(localStorage.getItem('cortexgrid_access_token')).toBeNull();
    expect(localStorage.getItem('cortexgrid_refresh_token')).toBeNull();
  });
});
