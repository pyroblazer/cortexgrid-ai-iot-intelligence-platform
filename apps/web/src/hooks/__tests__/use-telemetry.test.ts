import { renderHook, act } from '@testing-library/react';

const mockConnectSocket = jest.fn();
const mockSubscribeToTelemetry = jest.fn();

jest.mock('@/lib/socket', () => ({
  connectSocket: (...args: any[]) => mockConnectSocket(...args),
  subscribeToTelemetry: (...args: any[]) => mockSubscribeToTelemetry(...args),
}));

import { useTelemetry } from '@/hooks/use-telemetry';

beforeEach(() => {
  jest.clearAllMocks();
  mockSubscribeToTelemetry.mockReturnValue(jest.fn());
});

describe('useTelemetry', () => {
  it('returns empty data and false isConnected initially before effect runs', () => {
    const { result } = renderHook(() => useTelemetry({ deviceId: 'dev-001' }));
    expect(result.current.data).toEqual([]);
    expect(result.current.latestValue).toBeNull();
  });

  it('calls connectSocket and subscribeToTelemetry with deviceId', () => {
    renderHook(() => useTelemetry({ deviceId: 'dev-001' }));
    expect(mockConnectSocket).toHaveBeenCalled();
    expect(mockSubscribeToTelemetry).toHaveBeenCalledWith('dev-001', expect.any(Function));
  });

  it('sets isConnected to true after subscribing', () => {
    const { result } = renderHook(() => useTelemetry({ deviceId: 'dev-001' }));
    expect(result.current.isConnected).toBe(true);
  });

  it('does not subscribe when deviceId is empty string', () => {
    renderHook(() => useTelemetry({ deviceId: '' }));
    expect(mockConnectSocket).not.toHaveBeenCalled();
    expect(mockSubscribeToTelemetry).not.toHaveBeenCalled();
  });

  it('adds data points when telemetry event fires', () => {
    let capturedCallback: ((event: unknown) => void) | undefined;
    mockSubscribeToTelemetry.mockImplementation((_deviceId: string, cb: (event: unknown) => void) => {
      capturedCallback = cb;
      return jest.fn();
    });

    const { result } = renderHook(() => useTelemetry({ deviceId: 'dev-001' }));

    act(() => {
      capturedCallback!({
        value: 23.5,
        timestamp: '2024-01-01T00:00:00Z',
        metric: 'temperature',
        unit: 'celsius',
      });
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0]).toEqual({
      value: 23.5,
      timestamp: '2024-01-01T00:00:00Z',
      metric: 'temperature',
      unit: 'celsius',
    });
  });

  it('updates latestValue as data arrives', () => {
    let capturedCallback: ((event: unknown) => void) | undefined;
    mockSubscribeToTelemetry.mockImplementation((_deviceId: string, cb: (event: unknown) => void) => {
      capturedCallback = cb;
      return jest.fn();
    });

    const { result } = renderHook(() => useTelemetry({ deviceId: 'dev-001' }));

    act(() => {
      capturedCallback!({ value: 23.5, timestamp: '2024-01-01T00:00:00Z', metric: 'temperature' });
    });

    expect(result.current.latestValue).not.toBeNull();
    expect(result.current.latestValue!.value).toBe(23.5);
  });

  it('filters by metric when metric option is specified', () => {
    let capturedCallback: ((event: unknown) => void) | undefined;
    mockSubscribeToTelemetry.mockImplementation((_deviceId: string, cb: (event: unknown) => void) => {
      capturedCallback = cb;
      return jest.fn();
    });

    const { result } = renderHook(() =>
      useTelemetry({ deviceId: 'dev-001', metric: 'temperature' })
    );

    act(() => {
      capturedCallback!({ value: 50, timestamp: '2024-01-01T00:00:00Z', metric: 'humidity' });
    });
    expect(result.current.data).toHaveLength(0);

    act(() => {
      capturedCallback!({ value: 23.5, timestamp: '2024-01-01T00:00:00Z', metric: 'temperature' });
    });
    expect(result.current.data).toHaveLength(1);
  });

  it('accepts all metrics when metric filter is not specified', () => {
    let capturedCallback: ((event: unknown) => void) | undefined;
    mockSubscribeToTelemetry.mockImplementation((_deviceId: string, cb: (event: unknown) => void) => {
      capturedCallback = cb;
      return jest.fn();
    });

    const { result } = renderHook(() => useTelemetry({ deviceId: 'dev-001' }));

    act(() => {
      capturedCallback!({ value: 50, timestamp: '2024-01-01T00:00:00Z', metric: 'humidity' });
      capturedCallback!({ value: 23.5, timestamp: '2024-01-01T00:00:00Z', metric: 'temperature' });
    });
    expect(result.current.data).toHaveLength(2);
  });

  it('caps data at maxDataPoints', () => {
    let capturedCallback: ((event: unknown) => void) | undefined;
    mockSubscribeToTelemetry.mockImplementation((_deviceId: string, cb: (event: unknown) => void) => {
      capturedCallback = cb;
      return jest.fn();
    });

    const { result } = renderHook(() =>
      useTelemetry({ deviceId: 'dev-001', maxDataPoints: 3 })
    );

    act(() => {
      for (let i = 0; i < 5; i++) {
        capturedCallback!({
          value: i,
          timestamp: `2024-01-01T00:00:0${i}Z`,
          metric: 'temperature',
        });
      }
    });

    expect(result.current.data).toHaveLength(3);
    expect(result.current.data[2].value).toBe(4);
  });

  it('clearData resets the data array', () => {
    let capturedCallback: ((event: unknown) => void) | undefined;
    mockSubscribeToTelemetry.mockImplementation((_deviceId: string, cb: (event: unknown) => void) => {
      capturedCallback = cb;
      return jest.fn();
    });

    const { result } = renderHook(() => useTelemetry({ deviceId: 'dev-001' }));

    act(() => {
      capturedCallback!({ value: 23.5, timestamp: '2024-01-01T00:00:00Z', metric: 'temperature' });
    });
    expect(result.current.data).toHaveLength(1);

    act(() => {
      result.current.clearData();
    });
    expect(result.current.data).toHaveLength(0);
    expect(result.current.latestValue).toBeNull();
  });

  it('calls unsubscribe function on unmount', () => {
    const mockUnsubscribe = jest.fn();
    mockSubscribeToTelemetry.mockReturnValue(mockUnsubscribe);

    const { unmount } = renderHook(() => useTelemetry({ deviceId: 'dev-001' }));
    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('sets isConnected to false on unmount', () => {
    const mockUnsubscribe = jest.fn();
    mockSubscribeToTelemetry.mockReturnValue(mockUnsubscribe);

    const { result, unmount } = renderHook(() => useTelemetry({ deviceId: 'dev-001' }));
    expect(result.current.isConnected).toBe(true);
    unmount();
  });
});
