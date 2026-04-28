/**
 * Unit tests for auth Zustand store (src/stores/auth-store.ts)
 *
 * Tests:
 * - Initial state (user null, not authenticated, not loading)
 * - login: success path sets user/tokens/authenticated
 * - login: error path resets loading and re-throws
 * - register: success path calls POST
 * - register: error path resets loading and re-throws
 * - logout: clears tokens and state
 * - refresh: success updates tokens and user
 * - refresh: failure resets auth state
 * - setUser: updates user profile
 */

import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';

// Mock the apiClient module
jest.mock('@/lib/api-client', () => ({
  apiClient: {
    post: jest.fn(),
    setTokens: jest.fn(),
    clearTokens: jest.fn(),
  },
}));

// Mock @cortexgrid/types to avoid path resolution issues
jest.mock('@cortexgrid/types', () => ({}));

// Mock zustand persist to avoid localStorage issues
jest.mock('zustand/middleware', () => {
  const original = jest.requireActual('zustand/middleware');
  return {
    ...original,
    persist: (fn: any, _opts: any) => fn,
  };
});

const mockedPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const mockedSetTokens = apiClient.setTokens as jest.MockedFunction<typeof apiClient.setTokens>;
const mockedClearTokens = apiClient.clearTokens as jest.MockedFunction<typeof apiClient.clearTokens>;

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: true,
  createdAt: '2024-01-01T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  // Reset the store to initial state
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
  });
});

describe('auth store initial state', () => {
  it('has correct initial state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });
});

describe('auth store login', () => {
  it('success: sets user, tokens, and isAuthenticated', async () => {
    const loginResponse = {
      accessToken: 'access-123',
      refreshToken: 'refresh-456',
      expiresIn: '15m',
      user: mockUser,
    };

    mockedPost.mockResolvedValueOnce(loginResponse);

    await useAuthStore.getState().login('test@example.com', 'password123');

    expect(mockedPost).toHaveBeenCalledWith('/api/auth/login', {
      email: 'test@example.com',
      password: 'password123',
    });
    expect(mockedSetTokens).toHaveBeenCalledWith('access-123', 'refresh-456');

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe('access-123');
    expect(state.refreshToken).toBe('refresh-456');
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it('sets isLoading during request', async () => {
    let resolvePromise: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockedPost.mockReturnValueOnce(pendingPromise as any);

    const loginPromise = useAuthStore.getState().login('test@example.com', 'password');

    // While request is in-flight, isLoading should be true
    expect(useAuthStore.getState().isLoading).toBe(true);

    resolvePromise!({
      accessToken: 'a',
      refreshToken: 'r',
      expiresIn: '15m',
      user: mockUser,
    });

    await loginPromise;

    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('error: resets isLoading and re-throws', async () => {
    const error = new Error('Invalid credentials');
    mockedPost.mockRejectedValueOnce(error);

    await expect(
      useAuthStore.getState().login('test@example.com', 'wrong')
    ).rejects.toThrow('Invalid credentials');

    const state = useAuthStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });
});

describe('auth store register', () => {
  it('success: calls POST with correct data', async () => {
    mockedPost.mockResolvedValueOnce(undefined);

    await useAuthStore.getState().register(
      'Test User',
      'test@example.com',
      'password123',
      'password123',
      'My Org'
    );

    expect(mockedPost).toHaveBeenCalledWith('/api/auth/register', {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      organizationName: 'My Org',
    });

    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('sets isLoading during request', async () => {
    let resolvePromise: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockedPost.mockReturnValueOnce(pendingPromise as any);

    const registerPromise = useAuthStore.getState().register(
      'name', 'email', 'pass', 'pass'
    );

    expect(useAuthStore.getState().isLoading).toBe(true);

    resolvePromise!(undefined);
    await registerPromise;

    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('error: resets isLoading and re-throws', async () => {
    const error = new Error('Email already exists');
    mockedPost.mockRejectedValueOnce(error);

    await expect(
      useAuthStore.getState().register('name', 'email', 'pass', 'pass')
    ).rejects.toThrow('Email already exists');

    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});

describe('auth store logout', () => {
  it('clears tokens and resets state', () => {
    // Set up an authenticated state first
    useAuthStore.setState({
      user: mockUser,
      accessToken: 'access',
      refreshToken: 'refresh',
      isAuthenticated: true,
    });

    useAuthStore.getState().logout();

    expect(mockedClearTokens).toHaveBeenCalled();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});

describe('auth store refresh', () => {
  it('success: updates tokens and user', async () => {
    const refreshResponse = {
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      user: mockUser,
    };

    mockedPost.mockResolvedValueOnce(refreshResponse);

    await useAuthStore.getState().refresh();

    expect(mockedPost).toHaveBeenCalledWith('/api/auth/refresh');
    expect(mockedSetTokens).toHaveBeenCalledWith('new-access', 'new-refresh');

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe('new-access');
    expect(state.refreshToken).toBe('new-refresh');
    expect(state.isAuthenticated).toBe(true);
  });

  it('failure: resets auth state to unauthenticated', async () => {
    useAuthStore.setState({
      user: mockUser,
      accessToken: 'old',
      refreshToken: 'old',
      isAuthenticated: true,
    });

    mockedPost.mockRejectedValueOnce(new Error('Refresh expired'));

    await useAuthStore.getState().refresh();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});

describe('auth store setUser', () => {
  it('updates the user profile', () => {
    const updatedUser = {
      ...mockUser,
      name: 'Updated Name',
    };

    useAuthStore.setState({ user: mockUser });
    useAuthStore.getState().setUser(updatedUser);

    expect(useAuthStore.getState().user).toEqual(updatedUser);
  });
});
