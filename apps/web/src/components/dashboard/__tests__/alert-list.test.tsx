/**
 * Unit tests for AlertList component (src/components/dashboard/alert-list.tsx)
 *
 * Tests:
 * - Renders alerts with correct severity styling
 * - Limits displayed alerts to `limit` prop
 * - Shows "No recent alerts" when empty
 * - Shows "View All" button when showViewAll=true
 * - Filters by title (deviceId prop)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AlertList } from '@/components/dashboard/alert-list';

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

describe('AlertList component', () => {
  it('renders "Recent Alerts" title', () => {
    render(<AlertList />);
    expect(screen.getByText('Recent Alerts')).toBeInTheDocument();
  });

  it('renders alert titles from mock data', () => {
    render(<AlertList />);
    expect(screen.getByText('High Temperature Detected')).toBeInTheDocument();
    expect(screen.getByText('Device Offline')).toBeInTheDocument();
    expect(screen.getByText('Low Battery Warning')).toBeInTheDocument();
  });

  it('renders severity badges', () => {
    render(<AlertList />);
    const badges = screen.getAllByTestId('badge');
    expect(badges.length).toBeGreaterThan(0);
    expect(badges[0]).toHaveTextContent('CRITICAL');
  });

  it('renders alert messages', () => {
    render(<AlertList />);
    expect(
      screen.getByText('Temperature exceeded threshold of 30C (current: 35.2C)')
    ).toBeInTheDocument();
  });

  it('renders device names', () => {
    render(<AlertList />);
    expect(screen.getByText('Temperature Sensor A1')).toBeInTheDocument();
  });

  it('limits displayed alerts to limit prop', () => {
    render(<AlertList limit={2} />);
    // Mock data has 5 alerts; with limit=2 we should see only 2
    const badges = screen.getAllByTestId('badge');
    expect(badges).toHaveLength(2);
  });

  it('defaults limit to 5', () => {
    render(<AlertList />);
    const badges = screen.getAllByTestId('badge');
    expect(badges).toHaveLength(5);
  });

  it('shows "No recent alerts" when no alerts match filter', () => {
    render(<AlertList deviceId="nonexistent-device-xyz" />);
    expect(screen.getByText('No recent alerts')).toBeInTheDocument();
  });

  it('shows "View All" button when showViewAll=true', () => {
    render(<AlertList showViewAll={true} />);
    expect(screen.getByText('View All')).toBeInTheDocument();
  });

  it('does not show "View All" button by default', () => {
    render(<AlertList />);
    expect(screen.queryByText('View All')).not.toBeInTheDocument();
  });

  it('filters alerts by deviceId (title matching)', () => {
    // The component filters by checking if the alert title includes the deviceId
    // "High Temperature Detected" does NOT contain "humidity", but "Humidity Spike" does
    render(<AlertList deviceId="humidity" />);
    // Should find "Humidity Spike" since its title includes "humidity"
    expect(screen.getByText('Humidity Spike')).toBeInTheDocument();
  });

  it('applies correct border class for CRITICAL severity', () => {
    const { container } = render(<AlertList limit={1} />);
    const alertItem = container.querySelector('[class*="border-l-"]');
    expect(alertItem).toBeInTheDocument();
    expect(alertItem?.className).toContain('border-l-danger-500');
  });

  it('renders shield alert icon for CRITICAL alerts', () => {
    render(<AlertList limit={1} />);
    expect(screen.getByTestId('shield-alert-icon')).toBeInTheDocument();
  });

  it('renders formatted relative time', () => {
    render(<AlertList />);
    const times = screen.getAllByText('5 minutes ago');
    expect(times.length).toBeGreaterThan(0);
  });
});
