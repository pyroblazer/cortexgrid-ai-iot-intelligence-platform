/**
 * Auth Store - Manages user authentication state across the entire app.
 *
 * ELI5: Think of this like a "visitor badge" system at an office building.
 * When you log in, you get a badge (token) that proves who you are.
 * This store remembers your badge so every page knows who you are.
 * When you log out, your badge is taken away and you become a visitor again.
 *
 * WHY persist? Without it, refreshing the page would log you out.
 * With persist, your "badge" survives page refreshes by being saved to localStorage.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiClient } from "@/lib/api-client";
import type { AuthUser } from "@cortexgrid/types";

interface AuthState {
  /** The currently logged-in user's profile info (null if not logged in) */
  user: AuthUser | null;
  /** Short-lived token for API requests (expires in 15 minutes) */
  accessToken: string | null;
  /** Long-lived token used to get a new accessToken without re-login (expires in 7 days) */
  refreshToken: string | null;
  /** Quick check: is someone currently logged in? */
  isAuthenticated: boolean;
  /** Shows a loading spinner while login/register requests are in flight */
  isLoading: boolean;

  /** Send email+password to the server, get tokens back */
  login: (email: string, password: string) => Promise<void>;
  /** Create a brand new account + organization */
  register: (
    name: string,
    email: string,
    password: string,
    confirmPassword: string,
    organizationName?: string
  ) => Promise<void>;
  /** Wipe all auth state — equivalent to "sign out" */
  logout: () => void;
  /** Use the refreshToken to get a fresh accessToken (called automatically on 401) */
  refresh: () => Promise<void>;
  /** Update user profile without re-authenticating */
  setUser: (user: AuthUser) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const result = await apiClient.post<{
            accessToken: string;
            refreshToken: string;
            expiresIn: string;
            user: AuthUser;
          }>("/auth/login", { email, password });

          // Store tokens in the API client so all future requests include them
          apiClient.setTokens(result.accessToken, result.refreshToken);
          set({
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (
        name: string,
        email: string,
        password: string,
        confirmPassword: string,
        organizationName?: string
      ) => {
        set({ isLoading: true });
        try {
          await apiClient.post("/auth/register", {
            name,
            email,
            password,
            confirmPassword,
            organizationName,
          });
          set({ isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        // Clear both the API client headers AND the persisted store
        apiClient.clearTokens();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      refresh: async () => {
        try {
          const result = await apiClient.post<{
            accessToken: string;
            refreshToken: string;
            user: AuthUser;
          }>("/auth/refresh");

          apiClient.setTokens(result.accessToken, result.refreshToken);
          set({
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            isAuthenticated: true,
          });
        } catch {
          // If refresh fails, the session is truly expired — force logout
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
        }
      },

      setUser: (user: AuthUser) => {
        set({ user });
      },
    }),
    {
      // Persist auth state to localStorage so it survives page refreshes
      name: "cortexgrid-auth",
      // Only persist these fields (not isLoading — that should always start false)
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
