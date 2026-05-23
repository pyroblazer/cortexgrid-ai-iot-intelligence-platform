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

/** Sync auth token to a cookie so Next.js middleware can read it server-side */
function setAuthCookie(token: string | null) {
  if (typeof document === "undefined") return;
  if (token) {
    document.cookie = `cortexgrid_access_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  } else {
    document.cookie = "cortexgrid_access_token=; path=/; max-age=0";
  }
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  selectedOrganizationId: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    organizationName: string
  ) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  setUser: (user: AuthUser) => void;
  setSelectedOrganization: (id: string, name: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      selectedOrganizationId: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const result = await apiClient.post<{
            accessToken: string;
            refreshToken: string;
            expiresIn: string;
            user: AuthUser;
          }>("/auth/login", { email, password });

          apiClient.setTokens(result.accessToken, result.refreshToken);
          setAuthCookie(result.accessToken);
          set({
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            selectedOrganizationId: (result.user as any).organizationId ?? null,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (
        firstName: string,
        lastName: string,
        email: string,
        password: string,
        organizationName: string
      ) => {
        set({ isLoading: true });
        try {
          await apiClient.post("/auth/register", {
            firstName,
            lastName,
            email,
            password,
            organizationName,
          });
          set({ isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        apiClient.clearTokens();
        setAuthCookie(null);
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          selectedOrganizationId: null,
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
          setAuthCookie(result.accessToken);
          set({
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            isAuthenticated: true,
          });
        } catch {
          setAuthCookie(null);
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            selectedOrganizationId: null,
          });
        }
      },

      setUser: (user: AuthUser) => {
        set({ user });
      },

      setSelectedOrganization: (id: string, _name: string) => {
        set({ selectedOrganizationId: id });
      },
    }),
    {
      name: "cortexgrid-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        selectedOrganizationId: state.selectedOrganizationId,
      }),
    }
  )
);
