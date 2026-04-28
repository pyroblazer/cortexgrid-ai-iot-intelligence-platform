/**
 * Unit tests for useAuth hook (src/hooks/use-auth.ts)
 *
 * Tests:
 * - handleLogin: calls store.login then router.push('/dashboard')
 * - handleLogout: calls storeLogout then router.push('/login')
 * - requireAuth: redirects to /login if not authenticated (returns false)
 * - requireAuth: returns true if authenticated
 * - Exposes user, isAuthenticated, isLoading, refresh from store
 */

import { renderHook, act } from '@testing-library/react';

// Mock next/navigation
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/dashboard',
  useParams: () => ({}),
}));

// Mock the auth store
const mockLogin = jest.fn();
const mockStoreLogout = jest.fn();
const mockRefresh = jest.fn();

let mockStoreState = {
  user: null as any,
  isAuthenticated: false,
  isLoading: false,
  login: mockLogin,
  logout: mockStoreLogout,
  refresh: mockRefresh,
};

jest.mock('@/stores/auth-store', () => ({
  useAuthStore: () => mockStoreState,
}));

import { useAuth } from '@/hooks/use-auth';

beforeEach(() => {
  jest.clearAllMocks();
  mockStoreState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: mockLogin,
    logout: mockStoreLogout,
    refresh: mockRefresh,
  };
});

describe('useAuth hook', () => {
  it('exposes user, isAuthenticated, isLoading, refresh from store', () => {
    mockStoreState.user = { id: '1', name: 'Test' };
    mockStoreState.isAuthenticated = true;
    mockStoreState.isLoading = true;

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toEqual({ id: '1', name: 'Test' });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.refresh).toBe(mockRefresh);
  });

  describe('handleLogin', () => {
    it('calls store.login then navigates to /dashboard', async () => {
      mockLogin.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('handleLogout', () => {
    it('calls storeLogout then navigates to /login', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.logout();
      });

      expect(mockStoreLogout).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  describe('requireAuth', () => {
    it('returns false and redirects to /login when not authenticated', () => {
      mockStoreState.isAuthenticated = false;

      const { result } = renderHook(() => useAuth());

      let authResult: boolean | undefined;
      act(() => {
        authResult = result.current.requireAuth();
      });

      expect(authResult).toBe(false);
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('returns true when authenticated', () => {
      mockStoreState.isAuthenticated = true;

      const { result } = renderHook(() => useAuth());

      let authResult: boolean | undefined;
      act(() => {
        authResult = result.current.requireAuth();
      });

      expect(authResult).toBe(true);
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
