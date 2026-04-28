import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

const mockPathname = jest.fn(() => '/dashboard');
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock('@cortexgrid/ui', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

jest.mock('lucide-react', () => ({
  LayoutDashboard: (props: any) => <svg data-testid="icon-dashboard" {...props} />,
  Cpu: (props: any) => <svg data-testid="icon-cpu" {...props} />,
  AlertTriangle: (props: any) => <svg data-testid="icon-alert" {...props} />,
  Sparkles: (props: any) => <svg data-testid="icon-sparkles" {...props} />,
  CreditCard: (props: any) => <svg data-testid="icon-credit" {...props} />,
  Settings: (props: any) => <svg data-testid="icon-settings" {...props} />,
  ChevronLeft: (props: any) => <svg data-testid="icon-chevron-left" {...props} />,
  ChevronRight: (props: any) => <svg data-testid="icon-chevron-right" {...props} />,
  LogOut: (props: any) => <svg data-testid="icon-logout" {...props} />,
}));

import { Sidebar } from '@/components/layout/sidebar';

describe('Sidebar', () => {
  const defaultProps = {
    collapsed: false,
    onToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname.mockReturnValue('/dashboard');
  });

  it('renders all nav items when expanded', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Devices')).toBeInTheDocument();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('Billing')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('calls onToggle when collapse button is clicked', () => {
    const onToggle = jest.fn();
    render(<Sidebar {...defaultProps} onToggle={onToggle} />);
    fireEvent.click(screen.getByLabelText('Collapse sidebar'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows CortexGrid brand text when not collapsed', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('CortexGrid')).toBeInTheDocument();
  });

  it('hides CortexGrid brand text when collapsed', () => {
    render(<Sidebar {...defaultProps} collapsed={true} />);
    expect(screen.queryByText('CortexGrid')).not.toBeInTheDocument();
  });

  it('hides nav item labels when collapsed', () => {
    render(<Sidebar {...defaultProps} collapsed={true} />);
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Devices')).not.toBeInTheDocument();
  });

  it('shows Expand sidebar aria-label when collapsed', () => {
    render(<Sidebar {...defaultProps} collapsed={true} />);
    expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
  });

  it('shows Collapse sidebar aria-label when expanded', () => {
    render(<Sidebar {...defaultProps} collapsed={false} />);
    expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument();
  });

  it('shows organization info when expanded', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('My Organization')).toBeInTheDocument();
    expect(screen.getByText('Free Plan')).toBeInTheDocument();
  });

  it('hides organization info when collapsed', () => {
    render(<Sidebar {...defaultProps} collapsed={true} />);
    expect(screen.queryByText('My Organization')).not.toBeInTheDocument();
    expect(screen.queryByText('Free Plan')).not.toBeInTheDocument();
  });

  it('marks the dashboard link as active when on /dashboard', () => {
    mockPathname.mockReturnValue('/dashboard');
    render(<Sidebar {...defaultProps} />);
    const activeLinks = screen.getAllByRole('link').filter(
      (link) => link.getAttribute('aria-current') === 'page'
    );
    expect(activeLinks.length).toBe(1);
    expect(activeLinks[0]).toHaveAttribute('href', '/dashboard');
  });

  it('marks the devices link as active when on /devices', () => {
    mockPathname.mockReturnValue('/devices');
    render(<Sidebar {...defaultProps} />);
    const activeLinks = screen.getAllByRole('link').filter(
      (link) => link.getAttribute('aria-current') === 'page'
    );
    expect(activeLinks.length).toBe(1);
    expect(activeLinks[0]).toHaveAttribute('href', '/devices');
  });

  it('marks sub-routes of /devices as active', () => {
    mockPathname.mockReturnValue('/devices/dev-001');
    render(<Sidebar {...defaultProps} />);
    const activeLinks = screen.getAllByRole('link').filter(
      (link) => link.getAttribute('aria-current') === 'page'
    );
    expect(activeLinks.length).toBe(1);
    expect(activeLinks[0]).toHaveAttribute('href', '/devices');
  });

  it('shows logout button', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('renders the navigation role', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  });
});
