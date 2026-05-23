/**
 * WebSocket Client (lib/socket.ts)
 *
 * WHAT: Manages the real-time WebSocket connection to the CortexGrid backend.
 *       Uses Socket.IO (a library that adds reliability features on top of raw WebSockets)
 *       to stream live telemetry data from IoT devices to the frontend.
 *
 * WHY IT EXISTS: IoT devices send data continuously (temperature readings every few seconds,
 *               motion events, etc.). Instead of repeatedly asking the server "any new data?"
 *               (polling), WebSockets let the server push new data to the frontend the instant
 *               it arrives. This is how the telemetry chart updates in real-time.
 *
 * WebSocket connection lifecycle:
 *
 *   1. getSocket() creates the Socket.IO connection (but doesn't connect yet)
 *      - Configures reconnection: if the connection drops, it tries up to 10 times
 *        with increasing delay (1s, 2s, 4s... up to 10s between attempts)
 *      - Sets up authentication by sending the JWT token when connecting
 *      - Falls back to HTTP polling if WebSocket is blocked by a firewall
 *
 *   2. connectSocket() actually opens the connection
 *      - Called when the user enters a page that needs real-time data
 *
 *   3. subscribeToTelemetry(deviceId, callback) listens for device data
 *      - Registers a callback for the "telemetry:{deviceId}" event
 *      - Returns an unsubscribe function to stop listening
 *
 *   4. disconnectSocket() closes the connection
 *      - Called when the user logs out or leaves the app
 *
 * Singleton pattern:
 *   The `socket` variable at the top is module-scoped, so there's only ever
 *   ONE WebSocket connection shared across the entire app. This prevents
 *   opening duplicate connections if multiple components call connectSocket().
 *
 * Transport fallback:
 *   Socket.IO tries WebSocket first (fastest). If that fails (e.g., corporate firewall),
 *   it falls back to HTTP long-polling (slower but works everywhere).
 */

import { io, Socket } from "socket.io-client";

// The WebSocket server URL. Falls back through several options:
// 1. NEXT_PUBLIC_SOCKET_URL (explicit WebSocket URL)
// 2. NEXT_PUBLIC_API_URL (same server as the REST API)
// 3. "http://localhost:3001" (development default)
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Module-scoped singleton: only one socket instance exists for the entire app.
// This prevents duplicate connections and ensures all subscribers share the same socket.
let socket: Socket | null = null;

/**
 * Reads the JWT access token from localStorage for socket authentication.
 * The "typeof window" check prevents crashes during server-side rendering.
 */
function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cortexgrid_access_token");
}

/**
 * getSocket - Returns the singleton Socket.IO instance, creating it if necessary.
 *
 * This function uses lazy initialization: the socket is only created the first time
 * someone calls getSocket(). After that, it returns the same instance every time.
 *
 * The socket is created with autoConnect: false, meaning it won't actually connect
 * until connectSocket() is explicitly called. This prevents connecting on pages
 * that don't need real-time data (like the login page).
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      timeout: 45000,
      transports: ["websocket", "polling"],
      // auth function is called every time the socket connects (including reconnections).
      // This ensures the latest token is always used, even if it was refreshed.
      auth: () => {
        const token = getAccessToken();
        return token ? { token } : {};
      },
    });

    // Log connection events for debugging
    socket.on("connect", () => {
      // Connected successfully
    });

    socket.on("disconnect", (reason) => {
      // Disconnected: reason
      void reason;
    });

    socket.on("connect_error", (error) => {
      console.error("[Socket] Connection error:", error.message);
    });
  }

  return socket;
}

/**
 * connectSocket - Opens the WebSocket connection if it's not already connected.
 *
 * Safe to call multiple times -- it checks if already connected before connecting.
 * Typically called from the SocketProvider component when the app loads.
 */
export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
}

/**
 * disconnectSocket - Closes the WebSocket connection and destroys the singleton.
 *
 * Called when the user logs out to clean up resources.
 * Setting socket to null means the next call to getSocket() will create a fresh instance.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * subscribeToRoom - Joins a Socket.IO "room" and listens for messages in that room.
 *
 * Rooms are server-side groups. For example, all devices in an organization
 * might be in the same room so updates are broadcast to everyone in that org.
 *
 * @param room - The room name to join (e.g., "org-001")
 * @param callback - Function to call when a message arrives in this room
 * @returns An unsubscribe function -- call it to leave the room and stop listening
 */
export function subscribeToRoom(room: string, callback: (data: unknown) => void): () => void {
  const s = getSocket();
  s.emit("join", room);                           // Tell the server we want to join this room
  const handler = (data: unknown) => callback(data);
  s.on(`room:${room}`, handler);                  // Listen for messages in this room

  // Return a cleanup function that undoes the subscription.
  // This is important for React's useEffect cleanup to prevent memory leaks.
  return () => {
    s.off(`room:${room}`, handler);                // Stop listening
    s.emit("leave", room);                         // Tell the server we're leaving
  };
}

/**
 * subscribeToTelemetry - Listens for real-time telemetry data from a specific device.
 *
 * Joins the device-specific room and listens for the 'telemetry:update' event
 * that the gateway emits to that room.
 *
 * @param deviceId - The ID of the device to listen to
 * @param callback - Function to call with the telemetry data when it arrives
 * @returns An unsubscribe function -- call it to stop listening
 */
export function subscribeToTelemetry(
  deviceId: string,
  callback: (data: unknown) => void
): () => void {
  const s = getSocket();
  // Join the device-specific room on the server so we receive per-device events
  s.emit('subscribe:device', deviceId);
  // The gateway emits 'telemetry:update' to the device room
  s.on('telemetry:update', callback);

  return () => {
    s.off('telemetry:update', callback);
    s.emit('unsubscribe:device', deviceId);
  };
}
