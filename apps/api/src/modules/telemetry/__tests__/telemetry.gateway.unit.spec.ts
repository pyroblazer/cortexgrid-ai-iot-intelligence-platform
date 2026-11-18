import { JwtService } from '@nestjs/jwt';
import { TelemetryGateway } from '../telemetry.gateway';

describe('TelemetryGateway authentication', () => {
  const secret = 'test-secret';
  const jwt = new JwtService({});
  const config = { get: jest.fn().mockReturnValue(secret) } as any;
  const redis = { subscribe: jest.fn() } as any;
  const prisma = {
    membership: { findFirst: jest.fn() },
    device: { findFirst: jest.fn() },
  } as any;

  const makeClient = (token?: string) =>
    ({
      id: 'c1',
      data: {},
      handshake: { auth: token ? { token } : {}, headers: {} },
      join: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    }) as any;

  let gateway: TelemetryGateway;
  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new TelemetryGateway(redis, config, prisma);
  });

  it('disconnects sockets without a token', async () => {
    const client = makeClient();
    await gateway.handleConnection(client);
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
  });

  it('ignores the organizationId query param and uses the token org', async () => {
    prisma.membership.findFirst.mockResolvedValue({ id: 'm1' });
    const token = await jwt.signAsync({ sub: 'u1', organizationId: 'org-1' }, { secret });
    const client = makeClient(token);
    client.handshake.query = { organizationId: 'org-evil' };
    await gateway.handleConnection(client);
    expect(client.join).toHaveBeenCalledWith('org:org-1');
    expect(client.join).not.toHaveBeenCalledWith('org:org-evil');
  });

  it('rejects users without an active membership', async () => {
    prisma.membership.findFirst.mockResolvedValue(null);
    const token = await jwt.signAsync({ sub: 'u1', organizationId: 'org-1' }, { secret });
    const client = makeClient(token);
    await gateway.handleConnection(client);
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('refuses device subscriptions outside the caller organization', async () => {
    prisma.device.findFirst.mockResolvedValue(null);
    const client = makeClient();
    client.data.organizationId = 'org-1';
    await gateway.handleSubscribeDevice(client, 'device-of-other-org');
    expect(prisma.device.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'device-of-other-org', organizationId: 'org-1' } }),
    );
    expect(client.join).not.toHaveBeenCalled();
  });
});
