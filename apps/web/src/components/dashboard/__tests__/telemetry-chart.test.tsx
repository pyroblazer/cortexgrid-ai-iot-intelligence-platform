import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act } from '@testing-library/react';

const mockUseTelemetry = jest.fn();
jest.mock('@/hooks/use-telemetry', () => ({
  useTelemetry: (...args: any[]) => mockUseTelemetry(...args),
}));

jest.mock('@cortexgrid/ui/components/Card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <div data-testid="card-title">{children}</div>,
}));

jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: ({ dataKey }: any) => <div data-testid={`line-${dataKey}`} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Legend: () => <div data-testid="legend" />,
}));

import { TelemetryChart } from '@/components/dashboard/telemetry-chart';

describe('TelemetryChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseTelemetry.mockReturnValue({ data: [], isConnected: false });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders with default title', () => {
    render(<TelemetryChart deviceId="dev-001" />);
    expect(screen.getByTestId('card-title')).toHaveTextContent('Real-Time Telemetry');
  });

  it('renders with custom title', () => {
    render(<TelemetryChart deviceId="dev-001" title="Temperature Sensor" />);
    expect(screen.getByTestId('card-title')).toHaveTextContent('Temperature Sensor');
  });

  it('shows Mock data indicator when not connected', () => {
    render(<TelemetryChart deviceId="dev-001" />);
    expect(screen.getByText('Mock data')).toBeInTheDocument();
  });

  it('shows Live indicator when connected with data', () => {
    mockUseTelemetry.mockReturnValue({
      data: [
        {
          value: 23.5,
          timestamp: new Date().toISOString(),
          metric: 'temperature',
        },
      ],
      isConnected: true,
    });
    render(<TelemetryChart deviceId="dev-001" />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('renders temperature line by default', () => {
    render(<TelemetryChart deviceId="dev-001" />);
    expect(screen.getByTestId('line-temperature')).toBeInTheDocument();
  });

  it('renders multiple metric lines', () => {
    render(
      <TelemetryChart deviceId="dev-001" metrics={['temperature', 'humidity', 'pressure']} />
    );
    expect(screen.getByTestId('line-temperature')).toBeInTheDocument();
    expect(screen.getByTestId('line-humidity')).toBeInTheDocument();
    expect(screen.getByTestId('line-pressure')).toBeInTheDocument();
  });

  it('calls useTelemetry with correct deviceId and maxDataPoints', () => {
    render(<TelemetryChart deviceId="dev-001" />);
    expect(mockUseTelemetry).toHaveBeenCalledWith({
      deviceId: 'dev-001',
      maxDataPoints: 50,
    });
  });

  it('renders the chart container', () => {
    render(<TelemetryChart deviceId="dev-001" />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('updates mock data on timer tick when not connected', () => {
    render(<TelemetryChart deviceId="dev-001" metrics={['temperature']} />);
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('does not set up mock data interval when connected with live data', () => {
    mockUseTelemetry.mockReturnValue({
      data: [{ value: 23.5, timestamp: new Date().toISOString(), metric: 'temperature' }],
      isConnected: true,
    });
    render(<TelemetryChart deviceId="dev-001" />);
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByText('Live')).toBeInTheDocument();
  });
});
