import { create } from "zustand";
import { apiClient } from "@/lib/api-client";
import type { DeviceResponse, DeviceStats } from "@cortexgrid/types";

interface DeviceState {
  devices: DeviceResponse[];
  selectedDevice: DeviceResponse | null;
  stats: DeviceStats | null;
  isLoading: boolean;
  error: string | null;

  fetchDevices: (params?: Record<string, string>) => Promise<void>;
  fetchDevice: (id: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  createDevice: (data: Record<string, unknown>) => Promise<DeviceResponse>;
  updateDevice: (id: string, data: Record<string, unknown>) => Promise<void>;
  deleteDevice: (id: string) => Promise<void>;
  clearSelection: () => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  devices: [],
  selectedDevice: null,
  stats: null,
  isLoading: false,
  error: null,

  fetchDevices: async (params?: Record<string, string>) => {
    set({ isLoading: true, error: null });
    try {
      const queryString = params
        ? "?" + new URLSearchParams(params).toString()
        : "";
      const data = await apiClient.get<DeviceResponse[]>(
        `/api/devices${queryString}`
      );
      set({ devices: data, isLoading: false });
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch devices",
        isLoading: false,
      });
    }
  },

  fetchDevice: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiClient.get<DeviceResponse>(`/api/devices/${id}`);
      set({ selectedDevice: data, isLoading: false });
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch device",
        isLoading: false,
      });
    }
  },

  fetchStats: async () => {
    try {
      const data = await apiClient.get<DeviceStats>("/api/devices/stats");
      set({ stats: data });
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch stats",
      });
    }
  },

  createDevice: async (data: Record<string, unknown>) => {
    set({ isLoading: true, error: null });
    try {
      const device = await apiClient.post<DeviceResponse>("/api/devices", data);
      set((state) => ({
        devices: [...state.devices, device],
        isLoading: false,
      }));
      return device;
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : "Failed to create device",
        isLoading: false,
      });
      throw err;
    }
  },

  updateDevice: async (id: string, data: Record<string, unknown>) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await apiClient.put<DeviceResponse>(
        `/api/devices/${id}`,
        data
      );
      set((state) => ({
        devices: state.devices.map((d) => (d.id === id ? updated : d)),
        selectedDevice:
          state.selectedDevice?.id === id ? updated : state.selectedDevice,
        isLoading: false,
      }));
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : "Failed to update device",
        isLoading: false,
      });
      throw err;
    }
  },

  deleteDevice: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.delete(`/api/devices/${id}`);
      set((state) => ({
        devices: state.devices.filter((d) => d.id !== id),
        selectedDevice:
          state.selectedDevice?.id === id ? null : state.selectedDevice,
        isLoading: false,
      }));
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : "Failed to delete device",
        isLoading: false,
      });
      throw err;
    }
  },

  clearSelection: () => {
    set({ selectedDevice: null });
  },
}));
