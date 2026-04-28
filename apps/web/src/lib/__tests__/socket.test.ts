const mockOn = jest.fn();
const mockOff = jest.fn();
const mockEmit = jest.fn();
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();

const mockSocketInstance = {
  on: mockOn,
  off: mockOff,
  emit: mockEmit,
  connect: mockConnect,
  disconnect: mockDisconnect,
  connected: false,
};

const mockIo = jest.fn(() => mockSocketInstance);

jest.mock('socket.io-client', () => ({
  io: (...args: any[]) => mockIo(...args),
}));

describe('socket module', () => {
  let socketModule: typeof import('@/lib/socket');

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
    mockSocketInstance.connected = false;
    mockIo.mockReturnValue(mockSocketInstance);
    socketModule = await import('@/lib/socket');
    // Reset singleton by disconnecting
    socketModule.disconnectSocket();
    jest.clearAllMocks();
    mockIo.mockReturnValue(mockSocketInstance);
  });

  describe('getSocket', () => {
    it('creates a socket instance with correct config', () => {
      socketModule.getSocket();
      expect(mockIo).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          autoConnect: false,
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelayMax: 10000,
        })
      );
    });

    it('registers connect, disconnect, and connect_error handlers', () => {
      socketModule.getSocket();
      expect(mockOn).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('connect_error', expect.any(Function));
    });

    it('returns the same instance on repeated calls (singleton)', () => {
      const s1 = socketModule.getSocket();
      const s2 = socketModule.getSocket();
      expect(s1).toBe(s2);
      expect(mockIo).toHaveBeenCalledTimes(1);
    });
  });

  describe('connectSocket', () => {
    it('calls connect when socket is not connected', () => {
      mockSocketInstance.connected = false;
      socketModule.connectSocket();
      expect(mockConnect).toHaveBeenCalled();
    });

    it('does not call connect when socket is already connected', () => {
      mockSocketInstance.connected = true;
      socketModule.connectSocket();
      expect(mockConnect).not.toHaveBeenCalled();
      mockSocketInstance.connected = false;
    });
  });

  describe('disconnectSocket', () => {
    it('calls disconnect on the socket', () => {
      socketModule.getSocket();
      jest.clearAllMocks();
      socketModule.disconnectSocket();
      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('allows creating a fresh socket after disconnect', () => {
      socketModule.getSocket();
      socketModule.disconnectSocket();
      jest.clearAllMocks();
      socketModule.getSocket();
      expect(mockIo).toHaveBeenCalled();
    });

    it('is safe to call when no socket exists', () => {
      expect(() => socketModule.disconnectSocket()).not.toThrow();
    });
  });

  describe('subscribeToRoom', () => {
    it('emits join event and registers room listener', () => {
      const callback = jest.fn();
      socketModule.subscribeToRoom('org-001', callback);
      expect(mockEmit).toHaveBeenCalledWith('join', 'org-001');
      expect(mockOn).toHaveBeenCalledWith('room:org-001', expect.any(Function));
    });

    it('calls callback when room message is received', () => {
      const callback = jest.fn();
      let capturedHandler: ((data: unknown) => void) | undefined;
      mockOn.mockImplementation((event: string, handler: (data: unknown) => void) => {
        if (event === 'room:org-001') capturedHandler = handler;
      });

      socketModule.subscribeToRoom('org-001', callback);
      capturedHandler!({ type: 'update' });
      expect(callback).toHaveBeenCalledWith({ type: 'update' });
    });

    it('returns unsubscribe that removes listener and emits leave', () => {
      const callback = jest.fn();
      const unsubscribe = socketModule.subscribeToRoom('org-001', callback);
      unsubscribe();
      expect(mockOff).toHaveBeenCalledWith('room:org-001', expect.any(Function));
      expect(mockEmit).toHaveBeenCalledWith('leave', 'org-001');
    });
  });

  describe('subscribeToTelemetry', () => {
    it('registers listener for the correct telemetry event', () => {
      const callback = jest.fn();
      socketModule.subscribeToTelemetry('dev-001', callback);
      expect(mockOn).toHaveBeenCalledWith('telemetry:dev-001', callback);
    });

    it('returns unsubscribe that removes the listener', () => {
      const callback = jest.fn();
      const unsubscribe = socketModule.subscribeToTelemetry('dev-001', callback);
      unsubscribe();
      expect(mockOff).toHaveBeenCalledWith('telemetry:dev-001', callback);
    });
  });
});
