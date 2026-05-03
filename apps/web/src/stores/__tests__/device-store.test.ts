/**
 * Unit tests for device Zustand store (src/stores/device-store.ts)
 *
 * Tests:
 * - Initial state
 * - fetchDevices: success and error
 * - fetchDevice: success and error
 * - fetchStats: success and error
 * - createDevice: success and error
 * - updateDevice: success and error
 * - deleteDevice: success and error
 * - clearSelection
 */

import { useDeviceStore } from '@/stores/device-store';
import { apiClient } from '@/lib/api-client';

// Mock the apiClient module
jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockedPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const mockedPut = apiClient.put as jest.MockedFunction<typeof apiClient.put>;
const mockedDelete = apiClient.delete as jest.MockedFunction<typeof apiClient.delete>;

const mockDevice = {
  id: 'dev-1',
  name: 'Temperature Sensor',
  description: 'A temperature sensor',
  type: 'SENSOR' as const,
  status: 'ONLINE' as const,
  organizationId: 'org-1',
  serialNumber: 'SN-001',
  location: 'Building A',
  metadata: {},
  firmwareVersion: '1.0.0',
  tags: [],
  lastSeenAt: '2024-01-01T12:00:00Z',
  isConnected: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockDevice2 = {
  ...mockDevice,
  id: 'dev-2',
  name: 'Motion Detector',
  type: 'ACTUATOR' as const,
  status: 'OFFLINE' as const,
};

beforeEach(() => {
  jest.clearAllMocks();
  useDeviceStore.setState({
    devices: [],
    selectedDevice: null,
    stats: null,
    isLoading: false,
    error: null,
  });
});

describe('device store initial state', () => {
  it('has correct initial state', () => {
    const state = useDeviceStore.getState();
    expect(state.devices).toEqual([]);
    expect(state.selectedDevice).toBeNull();
    expect(state.stats).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });
});

describe('device store fetchDevices', () => {
  it('success: sets devices list', async () => {
    const devices = [mockDevice, mockDevice2];
    mockedGet.mockResolvedValueOnce(devices);

    await useDeviceStore.getState().fetchDevices();

    expect(mockedGet).toHaveBeenCalledWith('/devices');
    const state = useDeviceStore.getState();
    expect(state.devices).toEqual(devices);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('success: appends query params when provided', async () => {
    mockedGet.mockResolvedValueOnce([]);

    await useDeviceStore.getState().fetchDevices({ status: 'ONLINE', type: 'SENSOR' });

    expect(mockedGet).toHaveBeenCalledWith(
      expect.stringContaining('/devices?')
    );
    const calledUrl = mockedGet.mock.calls[0][0] as string;
    expect(calledUrl).toContain('status=ONLINE');
    expect(calledUrl).toContain('type=SENSOR');
  });

  it('sets isLoading during request', async () => {
    let resolvePromise: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockedGet.mockReturnValueOnce(pendingPromise as any);

    const fetchPromise = useDeviceStore.getState().fetchDevices();
    expect(useDeviceStore.getState().isLoading).toBe(true);

    resolvePromise!([]);
    await fetchPromise;
  });

  it('error: sets error message', async () => {
    mockedGet.mockRejectedValueOnce(new Error('Network error'));

    await useDeviceStore.getState().fetchDevices();

    const state = useDeviceStore.getState();
    expect(state.error).toBe('Network error');
    expect(state.isLoading).toBe(false);
    expect(state.devices).toEqual([]);
  });

  it('error: handles non-Error throws', async () => {
    mockedGet.mockRejectedValueOnce('string error');

    await useDeviceStore.getState().fetchDevices();

    expect(useDeviceStore.getState().error).toBe('Failed to fetch devices');
  });
});

describe('device store fetchDevice', () => {
  it('success: sets selectedDevice', async () => {
    mockedGet.mockResolvedValueOnce(mockDevice);

    await useDeviceStore.getState().fetchDevice('dev-1');

    expect(mockedGet).toHaveBeenCalledWith('/devices/dev-1');
    const state = useDeviceStore.getState();
    expect(state.selectedDevice).toEqual(mockDevice);
    expect(state.isLoading).toBe(false);
  });

  it('error: sets error message', async () => {
    mockedGet.mockRejectedValueOnce(new Error('Not found'));

    await useDeviceStore.getState().fetchDevice('nonexistent');

    const state = useDeviceStore.getState();
    expect(state.error).toBe('Not found');
    expect(state.isLoading).toBe(false);
  });

  it('error: handles non-Error throws', async () => {
    mockedGet.mockRejectedValueOnce(undefined);

    await useDeviceStore.getState().fetchDevice('x');

    expect(useDeviceStore.getState().error).toBe('Failed to fetch device');
  });
});

describe('device store fetchStats', () => {
  const mockStats = {
    total: 10,
    online: 7,
    offline: 2,
    maintenance: 1,
    byType: { SENSOR: 6, ACTUATOR: 3, GATEWAY: 1 },
  };

  it('success: sets stats', async () => {
    mockedGet.mockResolvedValueOnce(mockStats);

    await useDeviceStore.getState().fetchStats();

    expect(mockedGet).toHaveBeenCalledWith('/devices/stats');
    expect(useDeviceStore.getState().stats).toEqual(mockStats);
  });

  it('error: sets error message', async () => {
    mockedGet.mockRejectedValueOnce(new Error('Server error'));

    await useDeviceStore.getState().fetchStats();

    expect(useDeviceStore.getState().error).toBe('Server error');
  });

  it('error: handles non-Error throws', async () => {
    mockedGet.mockRejectedValueOnce({});

    await useDeviceStore.getState().fetchStats();

    expect(useDeviceStore.getState().error).toBe('Failed to fetch stats');
  });
});

describe('device store createDevice', () => {
  it('success: adds device to list and returns it', async () => {
    const newDeviceData = { name: 'New Sensor', type: 'SENSOR' };
    mockedPost.mockResolvedValueOnce(mockDevice);

    const result = await useDeviceStore.getState().createDevice(newDeviceData);

    expect(mockedPost).toHaveBeenCalledWith('/devices', newDeviceData);
    expect(result).toEqual(mockDevice);
    expect(useDeviceStore.getState().devices).toEqual([mockDevice]);
    expect(useDeviceStore.getState().isLoading).toBe(false);
  });

  it('error: sets error and re-throws', async () => {
    const error = new Error('Validation failed');
    mockedPost.mockRejectedValueOnce(error);

    await expect(
      useDeviceStore.getState().createDevice({ name: '' })
    ).rejects.toThrow('Validation failed');

    expect(useDeviceStore.getState().error).toBe('Validation failed');
    expect(useDeviceStore.getState().isLoading).toBe(false);
  });
});

describe('device store updateDevice', () => {
  it('success: updates device in list and selectedDevice if matching', async () => {
    useDeviceStore.setState({
      devices: [mockDevice, mockDevice2],
      selectedDevice: mockDevice,
    });

    const updated = { ...mockDevice, name: 'Updated Sensor' };
    mockedPut.mockResolvedValueOnce(updated);

    await useDeviceStore.getState().updateDevice('dev-1', { name: 'Updated Sensor' });

    expect(mockedPut).toHaveBeenCalledWith('/devices/dev-1', { name: 'Updated Sensor' });
    const state = useDeviceStore.getState();
    expect(state.devices[0]).toEqual(updated);
    expect(state.selectedDevice).toEqual(updated);
    expect(state.isLoading).toBe(false);
  });

  it('does not update selectedDevice if id does not match', async () => {
    useDeviceStore.setState({
      devices: [mockDevice],
      selectedDevice: mockDevice2,
    });

    const updated = { ...mockDevice, name: 'Updated Sensor' };
    mockedPut.mockResolvedValueOnce(updated);

    await useDeviceStore.getState().updateDevice('dev-1', { name: 'Updated Sensor' });

    expect(useDeviceStore.getState().selectedDevice).toEqual(mockDevice2);
  });

  it('error: sets error and re-throws', async () => {
    mockedPut.mockRejectedValueOnce(new Error('Conflict'));

    await expect(
      useDeviceStore.getState().updateDevice('dev-1', {})
    ).rejects.toThrow('Conflict');

    expect(useDeviceStore.getState().error).toBe('Conflict');
    expect(useDeviceStore.getState().isLoading).toBe(false);
  });
});

describe('device store deleteDevice', () => {
  it('success: removes device from list', async () => {
    useDeviceStore.setState({ devices: [mockDevice, mockDevice2] });
    mockedDelete.mockResolvedValueOnce(undefined);

    await useDeviceStore.getState().deleteDevice('dev-1');

    expect(mockedDelete).toHaveBeenCalledWith('/devices/dev-1');
    expect(useDeviceStore.getState().devices).toEqual([mockDevice2]);
    expect(useDeviceStore.getState().isLoading).toBe(false);
  });

  it('clears selectedDevice if it was the deleted one', async () => {
    useDeviceStore.setState({
      devices: [mockDevice],
      selectedDevice: mockDevice,
    });
    mockedDelete.mockResolvedValueOnce(undefined);

    await useDeviceStore.getState().deleteDevice('dev-1');

    expect(useDeviceStore.getState().selectedDevice).toBeNull();
  });

  it('keeps selectedDevice if it was a different device', async () => {
    useDeviceStore.setState({
      devices: [mockDevice, mockDevice2],
      selectedDevice: mockDevice2,
    });
    mockedDelete.mockResolvedValueOnce(undefined);

    await useDeviceStore.getState().deleteDevice('dev-1');

    expect(useDeviceStore.getState().selectedDevice).toEqual(mockDevice2);
  });

  it('error: sets error and re-throws', async () => {
    mockedDelete.mockRejectedValueOnce(new Error('Forbidden'));

    await expect(
      useDeviceStore.getState().deleteDevice('dev-1')
    ).rejects.toThrow('Forbidden');

    expect(useDeviceStore.getState().error).toBe('Forbidden');
    expect(useDeviceStore.getState().isLoading).toBe(false);
  });
});

describe('device store clearSelection', () => {
  it('clears the selected device', () => {
    useDeviceStore.setState({ selectedDevice: mockDevice });
    useDeviceStore.getState().clearSelection();
    expect(useDeviceStore.getState().selectedDevice).toBeNull();
  });
});
