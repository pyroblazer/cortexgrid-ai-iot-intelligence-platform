/**
 * useTelemetry Hook (hooks/use-telemetry.ts)
 *
 * WHAT: A React hook that subscribes to real-time telemetry data for a specific IoT device.
 *       Components call this hook to get a live-updating array of sensor readings.
 *
 * WHY IT EXISTS: The telemetry chart and other real-time components need to receive new
 *               data points as they arrive from devices. This hook encapsulates all the
 *               WebSocket subscription logic so components don't have to deal with
 *               socket connections, event handling, or cleanup.
 *
 * How it works (step by step):
 *
 *   1. A component calls useTelemetry({ deviceId: "dev-001", metric: "temperature" })
 *
 *   2. The hook connects to the WebSocket (if not already connected)
 *
 *   3. It subscribes to the "telemetry:dev-001" event on the socket
 *
 *   4. Every time the device sends new data, the handleMessage callback fires:
 *      a. It checks if the data matches the requested metric (e.g., only "temperature")
 *      b. If it matches, it adds the new point to the data array
 *      c. It keeps only the last N points (maxDataPoints) to prevent memory growth
 *
 *   5. When the component unmounts (or deviceId changes), the hook unsubscribes
 *      from the socket event to prevent memory leaks
 *
 * Data flow:
 *   IoT Device -> Backend -> WebSocket -> subscribeToTelemetry() -> handleMessage() -> data state -> Component
 *
 * Memory management:
 *   The data array is capped at maxDataPoints (default 100) using Array.slice(-N).
 *   This means old data points are automatically discarded as new ones arrive,
 *   like a rolling window. This prevents the array from growing indefinitely.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { subscribeToTelemetry, connectSocket } from "@/lib/socket";
import type { TelemetryStreamEvent } from "@cortexgrid/types";

/** Configuration options for the useTelemetry hook */
interface UseTelemetryOptions {
  deviceId: string;       // Which device to listen to (e.g., "dev-001")
  metric?: string;        // Optional: only receive data for this specific metric (e.g., "temperature")
  maxDataPoints?: number; // Maximum number of data points to keep in memory (default: 100)
}

/** A single telemetry reading from a device */
interface TelemetryPoint {
  value: number;       // The sensor value (e.g., 23.5)
  timestamp: string;   // When this reading was taken (ISO string)
  metric: string;      // What was measured (e.g., "temperature", "humidity")
  unit?: string;       // The unit of measurement (e.g., "celsius", "percent")
}

/**
 * useTelemetry - Subscribes to real-time telemetry data for a device.
 *
 * @param options.deviceId - The device to monitor
 * @param options.metric - Optional filter: only receive data for this metric type
 * @param options.maxDataPoints - Max points to keep (prevents unbounded memory growth)
 *
 * @returns An object with:
 *   - data: array of telemetry points (newest last)
 *   - isConnected: whether the WebSocket is connected
 *   - clearData: function to reset the data array
 *   - latestValue: the most recent data point, or null if no data yet
 */
export function useTelemetry({
  deviceId,
  metric,
  maxDataPoints = 100,
}: UseTelemetryOptions) {
  // The growing array of telemetry data points.
  // Each new reading from the WebSocket is appended here.
  const [data, setData] = useState<TelemetryPoint[]>([]);
  // Tracks whether the WebSocket is currently connected
  const [isConnected, setIsConnected] = useState(false);
  // Ref to hold maxDataPoints so the handleMessage callback always has the latest value
  // without needing to be recreated when maxDataPoints changes.
  const maxPointsRef = useRef(maxDataPoints);

  // Keep the ref in sync with the prop value
  useEffect(() => {
    maxPointsRef.current = maxDataPoints;
  }, [maxDataPoints]);

  /**
   * handleMessage - Called every time a new telemetry event arrives from the WebSocket.
   *
   * Steps:
   * 1. Cast the raw event to a typed TelemetryStreamEvent
   * 2. If a specific metric was requested, ignore data for other metrics
   * 3. Create a TelemetryPoint from the event data
   * 4. Append it to the data array, keeping only the last N points
   *
   * Uses useCallback with [metric] as dependency so it's recreated
   * when the metric filter changes, but not on every render.
   */
  const handleMessage = useCallback(
    (event: unknown) => {
      // Cast the generic socket event to our expected type
      const telemetry = event as TelemetryStreamEvent;

      // If we're filtering by metric, skip data that doesn't match.
      // This lets one device send multiple metric types (temp, humidity, etc.)
      // while the hook consumer only cares about one.
      if (metric && telemetry.metric !== metric) return;

      const point: TelemetryPoint = {
        value: telemetry.value,
        timestamp: telemetry.timestamp,
        metric: telemetry.metric,
        unit: telemetry.unit,
      };

      // Append the new point and trim to maxDataPoints.
      // slice(-N) keeps only the last N elements, like a sliding window.
      // Using the ref (maxPointsRef) instead of the state variable to avoid
      // stale closure issues -- the callback always reads the latest value.
      setData((prev) => {
        const next = [...prev, point];
        return next.slice(-maxPointsRef.current);
      });
    },
    [metric]
  );

  /**
   * Main subscription effect: connects to the socket and subscribes to device telemetry.
   *
   * This effect runs when deviceId or handleMessage changes.
   * The cleanup function (return value) unsubscribes when the component unmounts
   * or when the dependencies change, preventing memory leaks.
   */
  useEffect(() => {
    // Guard: don't subscribe if no deviceId is provided
    if (!deviceId) return;

    // Ensure the WebSocket is connected
    connectSocket();
    // Subscribe to telemetry events for this specific device.
    // The returned function is the cleanup/unsubscribe handler.
    const unsubscribe = subscribeToTelemetry(deviceId, handleMessage);
    setIsConnected(true);

    // Cleanup: unsubscribe and mark as disconnected when the effect re-runs or unmounts.
    // This is critical for preventing memory leaks -- without it, old subscriptions
    // would keep firing callbacks even after the component is gone.
    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [deviceId, handleMessage]);

  // Utility function to clear all accumulated data points.
  // Useful for "reset" buttons or when switching devices.
  const clearData = useCallback(() => {
    setData([]);
  }, []);

  return {
    data,                                                  // All accumulated data points
    isConnected,                                           // WebSocket connection status
    clearData,                                             // Function to reset data
    latestValue: data.length > 0 ? data[data.length - 1] : null,  // Most recent reading
  };
}
