"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  getSocket,
  connectSocket,
  disconnectSocket,
} from "@/lib/socket";
import type { Socket } from "socket.io-client";

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  connect: () => {},
  disconnect: () => {},
});

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = useCallback(() => {
    setIsConnected(true);
  }, []);

  const handleDisconnect = useCallback(() => {
    setIsConnected(false);
  }, []);

  useEffect(() => {
    const socket = getSocket();

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    const token = typeof window !== "undefined"
      ? localStorage.getItem("cortexgrid_access_token")
      : null;

    if (token) {
      connectSocket();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      disconnectSocket();
    };
  }, [handleConnect, handleDisconnect]);

  const value: SocketContextValue = {
    socket: getSocket(),
    isConnected,
    connect: connectSocket,
    disconnect: disconnectSocket,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}
