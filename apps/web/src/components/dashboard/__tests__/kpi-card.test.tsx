/**
 * Unit tests for KpiCard component (src/components/dashboard/kpi-card.tsx)
 *
 * Tests:
 * - Renders title and formatted value
 * - Formats large numbers (>=1M as X.XM, >=1K as X.XK)
 * - Shows positive trend with green arrow up
 * - Shows negative trend with red arrow down
 * - Shows changeLabel when provided
 * - Applies correct color class for each color prop
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { KpiCard } from '@/components/dashboard/kpi-card';

// Mock @cortexgrid/ui cn utility
jest.mock('@cortexgrid/ui', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

// Mock @cortexgrid/ui/components/Card
jest.mock('@cortexgrid/ui/components/Card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children, ...props }: any) => (
    <div data-testid="card-content" {...props}>
      {children}
    </div>
  ),
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}));

// Mock lucide-react
jest.mock('lucide-react', () => ({
  ArrowUp: (props: any) => <svg data-testid="arrow-up" {...props} />,
  ArrowDown: (props: any) => <svg data-testid="arrow-down" {...props} />,
}));

describe('KpiCard component', () => {
  const defaultProps = {
    title: 'Total Devices',
    value: 52,
    icon: <svg data-testid="test-icon" />,
  };

  it('renders title', () => {
    render(<KpiCard {...defaultProps} />);
    expect(screen.getByText('Total Devices')).toBeInTheDocument();
  });

  it('renders small numbers as-is', () => {
    render(<KpiCard {...defaultProps} value={52} />);
    expect(screen.getByText('52')).toBeInTheDocument();
  });

  it('formats numbers >= 1K with K suffix', () => {
    render(<KpiCard {...defaultProps} value={12847} />);
    expect(screen.getByText('12.8K')).toBeInTheDocument();
  });

  it('formats numbers >= 1K exactly at 1000', () => {
    render(<KpiCard {...defaultProps} value={1000} />);
    expect(screen.getByText('1.0K')).toBeInTheDocument();
  });

  it('formats numbers >= 1M with M suffix', () => {
    render(<KpiCard {...defaultProps} value={1500000} />);
    expect(screen.getByText('1.5M')).toBeInTheDocument();
  });

  it('formats numbers >= 1M exactly at 1000000', () => {
    render(<KpiCard {...defaultProps} value={1000000} />);
    expect(screen.getByText('1.0M')).toBeInTheDocument();
  });

  it('shows positive trend with arrow up', () => {
    render(<KpiCard {...defaultProps} change={12.5} />);
    expect(screen.getByTestId('arrow-up')).toBeInTheDocument();
    expect(screen.getByText('12.5%')).toBeInTheDocument();
  });

  it('shows zero change as positive with arrow up', () => {
    render(<KpiCard {...defaultProps} change={0} />);
    expect(screen.getByTestId('arrow-up')).toBeInTheDocument();
    expect(screen.getByText('0.0%')).toBeInTheDocument();
  });

  it('shows negative trend with arrow down', () => {
    render(<KpiCard {...defaultProps} change={-15.3} />);
    expect(screen.getByTestId('arrow-down')).toBeInTheDocument();
    expect(screen.getByText('15.3%')).toBeInTheDocument();
  });

  it('applies success color class for positive change', () => {
    const { container } = render(<KpiCard {...defaultProps} change={5} />);
    const trendEl = container.querySelector('[class*="text-success-600"]');
    expect(trendEl).toBeInTheDocument();
  });

  it('applies danger color class for negative change', () => {
    const { container } = render(<KpiCard {...defaultProps} change={-5} />);
    const trendEl = container.querySelector('[class*="text-danger-600"]');
    expect(trendEl).toBeInTheDocument();
  });

  it('shows changeLabel when provided', () => {
    render(<KpiCard {...defaultProps} change={12.5} changeLabel="vs last month" />);
    expect(screen.getByText('vs last month')).toBeInTheDocument();
  });

  it('does not show change section when change is undefined', () => {
    render(<KpiCard {...defaultProps} />);
    expect(screen.queryByText(/\d+\.\d+%/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('arrow-up')).not.toBeInTheDocument();
    expect(screen.queryByTestId('arrow-down')).not.toBeInTheDocument();
  });

  it('does not show changeLabel when change is undefined', () => {
    render(<KpiCard {...defaultProps} changeLabel="vs last month" />);
    expect(screen.queryByText('vs last month')).not.toBeInTheDocument();
  });

  it('renders icon', () => {
    render(<KpiCard {...defaultProps} />);
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('applies primary color by default', () => {
    const { container } = render(<KpiCard {...defaultProps} />);
    const iconBox = container.querySelector('[class*="bg-primary-50"]');
    expect(iconBox).toBeInTheDocument();
  });

  it('applies success color when color="success"', () => {
    const { container } = render(<KpiCard {...defaultProps} color="success" />);
    const iconBox = container.querySelector('[class*="bg-success-50"]');
    expect(iconBox).toBeInTheDocument();
  });

  it('applies danger color when color="danger"', () => {
    const { container } = render(<KpiCard {...defaultProps} color="danger" />);
    const iconBox = container.querySelector('[class*="bg-danger-50"]');
    expect(iconBox).toBeInTheDocument();
  });

  it('applies warning color when color="warning"', () => {
    const { container } = render(<KpiCard {...defaultProps} color="warning" />);
    const iconBox = container.querySelector('[class*="bg-warning-50"]');
    expect(iconBox).toBeInTheDocument();
  });

  it('applies accent color when color="accent"', () => {
    const { container } = render(<KpiCard {...defaultProps} color="accent" />);
    const iconBox = container.querySelector('[class*="bg-accent-50"]');
    expect(iconBox).toBeInTheDocument();
  });
});
