import '@testing-library/jest-dom';
/**
 * Unit tests for AlertList component (src/components/dashboard/alert-list.tsx)
 *
 * Tests:
 * - Renders alerts with correct severity styling
 * - Limits displayed alerts to `limit` prop
 * - Shows "No recent alerts" when empty
 * - Shows "View All" button when showViewAll=true
 * - Filters by deviceId (query param)
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AlertList } from '@/components/dashboard/alert-list';

// Mock @cortexgrid/types
jest.mock('@cortexgrid/types', () => ({}));

// Mock the apiClient module
const mockGet = jest.fn();
jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
  },
}));

// Mock @cortexgrid/ui/components/*
jest.mock('@cortexgrid/ui/components/Badge', () => ({
  Badge: ({ children, variant }: any) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
  badgeVariants: {},
}));

jest.mock('@cortexgrid/ui/components/Button', () => ({
  Button: ({ children, ...props }: any) => (
    <button data-testid="button" {...props}>
      {children}
    </button>
  ),
  buttonVariants: {},
}));

jest.mock('@cortexgrid/ui/components/Card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <div data-testid="card-title">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
}));

jest.mock('lucide-react', () => ({
  AlertTriangle: (props: any) => <svg data-testid="alert-triangle-icon" {...props} />,
  ShieldAlert: (props: any) => <svg data-testid="shield-alert-icon" {...props} />,
  Bell: (props: any) => <svg data-testid="bell-icon" {...props} />,
  ArrowRight: (props: any) => <svg data-testid="arrow-right-icon" {...props} />,
}));

jest.mock('date-fns', () => ({
  formatDistanceToNow: () => '5 minutes ago',
}));

jest.mock('next/link', () => {
  return function MockLink({ children }: any) {
    return <div data-testid="link">{children}</div>;
  };
});

const MOCK_ALERTS = [
  {
    id: 'alert-1',
    title: 'High Temperature Detected',
    message: 'Temperature exceeded threshold of 30C (current: 35.2C)',
    severity: 'CRITICAL',
    device: { name: 'Temperature Sensor A1' },
    createdAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'alert-2',
    title: 'Device Offline',
    message: 'Device has been offline for 30 minutes',
    severity: 'WARNING',
    device: { name: 'Humidity Sensor B2' },
    createdAt: '2024-01-15T10:25:00Z',
  },
  {
    id: 'alert-3',
    title: 'Low Battery Warning',
    message: 'Battery level is below 15%',
    severity: 'WARNING',
    device: { name: 'Temperature Sensor A1' },
    createdAt: '2024-01-15T10:20:00Z',
  },
  {
    id: 'alert-4',
    title: 'Humidity Spike',
    message: 'Humidity level spike detected',
    severity: 'INFO',
    device: { name: 'Humidity Sensor B2' },
    createdAt: '2024-01-15T10:15:00Z',
  },
  {
    id: 'alert-5',
    title: 'Firmware Update Available',
    message: 'New firmware version 2.1.0 is available',
    severity: 'INFO',
    device: { name: 'Pressure Sensor C3' },
    createdAt: '2024-01-15T10:10:00Z',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  // Default mock: return all alerts
  mockGet.mockResolvedValue({ data: MOCK_ALERTS });
});

describe('AlertList component', () => {
  it('renders "Recent Alerts" title', async () => {
    render(<AlertList />);
    expect(screen.getByText('Recent Alerts')).toBeInTheDocument();
  });

  it('renders alert titles from API data', async () => {
    render(<AlertList />);
    await waitFor(() => {
      expect(screen.getByText('High Temperature Detected')).toBeInTheDocument();
      expect(screen.getByText('Device Offline')).toBeInTheDocument();
      expect(screen.getByText('Low Battery Warning')).toBeInTheDocument();
    });
  });

  it('renders severity badges', async () => {
    render(<AlertList />);
    await waitFor(() => {
      const badges = screen.getAllByTestId('badge');
      expect(badges.length).toBeGreaterThan(0);
      expect(badges[0]).toHaveTextContent('CRITICAL');
    });
  });

  it('renders alert messages', async () => {
    render(<AlertList />);
    await waitFor(() => {
      expect(
        screen.getByText('Temperature exceeded threshold of 30C (current: 35.2C)')
      ).toBeInTheDocument();
    });
  });

  it('renders device names', async () => {
    render(<AlertList />);
    await waitFor(() => {
      expect(screen.getAllByText('Temperature Sensor A1').length).toBeGreaterThan(0);
    });
  });

  it('limits displayed alerts to limit prop', async () => {
    // Return only 2 items when limit=2
    mockGet.mockResolvedValue({ data: MOCK_ALERTS.slice(0, 2) });
    render(<AlertList limit={2} />);
    await waitFor(() => {
      const badges = screen.getAllByTestId('badge');
      expect(badges).toHaveLength(2);
    });
  });

  it('defaults limit to 5', async () => {
    render(<AlertList />);
    await waitFor(() => {
      const badges = screen.getAllByTestId('badge');
      expect(badges).toHaveLength(5);
    });
  });

  it('shows "No recent alerts" when no alerts match filter', async () => {
    mockGet.mockResolvedValue({ data: [] });
    render(<AlertList deviceId="nonexistent-device-xyz" />);
    await waitFor(() => {
      expect(screen.getByText('No recent alerts')).toBeInTheDocument();
    });
  });

  it('shows "View All" button when showViewAll=true', async () => {
    render(<AlertList showViewAll={true} />);
    await waitFor(() => {
      expect(screen.getByText('View All')).toBeInTheDocument();
    });
  });

  it('does not show "View All" button by default', async () => {
    render(<AlertList />);
    await waitFor(() => {
      expect(screen.getByText('High Temperature Detected')).toBeInTheDocument();
    });
    expect(screen.queryByText('View All')).not.toBeInTheDocument();
  });

  it('passes deviceId to API call as query param', async () => {
    mockGet.mockResolvedValue({ data: [] });
    render(<AlertList deviceId="device-xyz" />);
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('deviceId=device-xyz')
      );
    });
  });

  it('applies correct border class for CRITICAL severity', async () => {
    mockGet.mockResolvedValue({ data: [MOCK_ALERTS[0]] });
    const { container } = render(<AlertList limit={1} />);
    await waitFor(() => {
      const alertItem = container.querySelector('[class*="border-l-"]');
      expect(alertItem).toBeInTheDocument();
      expect(alertItem?.className).toContain('border-l-danger-500');
    });
  });

  it('renders shield alert icon for CRITICAL alerts', async () => {
    mockGet.mockResolvedValue({ data: [MOCK_ALERTS[0]] });
    render(<AlertList limit={1} />);
    await waitFor(() => {
      expect(screen.getByTestId('shield-alert-icon')).toBeInTheDocument();
    });
  });

  it('renders formatted relative time', async () => {
    render(<AlertList />);
    await waitFor(() => {
      const times = screen.getAllByText('5 minutes ago');
      expect(times.length).toBeGreaterThan(0);
    });
  });
});
