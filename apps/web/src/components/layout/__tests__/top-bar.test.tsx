import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

const mockPush = jest.fn();
const mockPathname = jest.fn(() => '/dashboard');

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname(),
}));

jest.mock('lucide-react', () => ({
  Menu: (props: any) => <svg data-testid="icon-menu" {...props} />,
  Search: (props: any) => <svg data-testid="icon-search" {...props} />,
  Bell: (props: any) => <svg data-testid="icon-bell" {...props} />,
  ChevronRight: (props: any) => <svg data-testid="icon-chevron" {...props} />,
  Settings: (props: any) => <svg data-testid="icon-settings" {...props} />,
  LogOut: (props: any) => <svg data-testid="icon-logout" {...props} />,
  X: (props: any) => <svg data-testid="icon-x" {...props} />,
  User: (props: any) => <svg data-testid="icon-user" {...props} />,
}));

import { TopBar } from '@/components/layout/top-bar';

describe('TopBar', () => {
  const defaultProps = { onToggleSidebar: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname.mockReturnValue('/dashboard');
  });

  it('renders the toggle sidebar button', () => {
    render(<TopBar {...defaultProps} />);
    expect(screen.getByLabelText('Toggle sidebar')).toBeInTheDocument();
  });

  it('calls onToggleSidebar when menu button is clicked', () => {
    const onToggle = jest.fn();
    render(<TopBar onToggleSidebar={onToggle} />);
    fireEvent.click(screen.getByLabelText('Toggle sidebar'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows Dashboard breadcrumb on /dashboard', () => {
    mockPathname.mockReturnValue('/dashboard');
    render(<TopBar {...defaultProps} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('shows Devices breadcrumb on /devices', () => {
    mockPathname.mockReturnValue('/devices');
    render(<TopBar {...defaultProps} />);
    expect(screen.getByText('Devices')).toBeInTheDocument();
  });

  it('shows Alerts breadcrumb on /alerts', () => {
    mockPathname.mockReturnValue('/alerts');
    render(<TopBar {...defaultProps} />);
    expect(screen.getByText('Alerts')).toBeInTheDocument();
  });

  it('shows AI Assistant breadcrumb on /ai', () => {
    mockPathname.mockReturnValue('/ai');
    render(<TopBar {...defaultProps} />);
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('shows Billing breadcrumb on /billing', () => {
    mockPathname.mockReturnValue('/billing');
    render(<TopBar {...defaultProps} />);
    expect(screen.getByText('Billing')).toBeInTheDocument();
  });

  it('shows Settings breadcrumb on /settings', () => {
    mockPathname.mockReturnValue('/settings');
    render(<TopBar {...defaultProps} />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('shows nested breadcrumb for /devices/new', () => {
    mockPathname.mockReturnValue('/devices/new');
    render(<TopBar {...defaultProps} />);
    expect(screen.getByText('Devices')).toBeInTheDocument();
    expect(screen.getByText('New Device')).toBeInTheDocument();
  });

  it('shows nested breadcrumb for /alerts/rules', () => {
    mockPathname.mockReturnValue('/alerts/rules');
    render(<TopBar {...defaultProps} />);
    expect(screen.getByText('Alerts')).toBeInTheDocument();
    expect(screen.getByText('Rules')).toBeInTheDocument();
  });

  it('shows Device Details breadcrumb for /devices/:id', () => {
    mockPathname.mockReturnValue('/devices/dev-001');
    render(<TopBar {...defaultProps} />);
    expect(screen.getByText('Device Details')).toBeInTheDocument();
  });

  it('falls back to Dashboard breadcrumb for unknown route', () => {
    mockPathname.mockReturnValue('/unknown-route');
    render(<TopBar {...defaultProps} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('expands search input when search button is clicked', () => {
    render(<TopBar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Search'));
    expect(screen.getByPlaceholderText('Search devices...')).toBeInTheDocument();
  });

  it('collapses search when X button is clicked', () => {
    render(<TopBar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Search'));
    const xButtons = screen.getAllByRole('button').filter(
      (btn) => btn.querySelector('[data-testid="icon-x"]')
    );
    fireEvent.click(xButtons[0]);
    expect(screen.queryByPlaceholderText('Search devices...')).not.toBeInTheDocument();
  });

  it('updates search query as user types', () => {
    render(<TopBar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Search'));
    const input = screen.getByPlaceholderText('Search devices...');
    fireEvent.change(input, { target: { value: 'sensor' } });
    expect(input).toHaveValue('sensor');
  });

  it('navigates to search results on form submit', () => {
    render(<TopBar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Search'));
    const input = screen.getByPlaceholderText('Search devices...');
    fireEvent.change(input, { target: { value: 'sensor' } });
    fireEvent.submit(input.closest('form')!);
    expect(mockPush).toHaveBeenCalledWith('/devices?search=sensor');
  });

  it('does not navigate on empty search submit', () => {
    render(<TopBar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Search'));
    const input = screen.getByPlaceholderText('Search devices...');
    fireEvent.submit(input.closest('form')!);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('opens notifications panel when bell is clicked', () => {
    render(<TopBar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Notifications'));
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('shows notification items when panel is open', () => {
    render(<TopBar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Notifications'));
    expect(screen.getByText('High Temperature Alert')).toBeInTheDocument();
    expect(screen.getByText('Device Offline')).toBeInTheDocument();
    expect(screen.getByText('Firmware Update')).toBeInTheDocument();
  });

  it('opens user dropdown when user button is clicked', () => {
    render(<TopBar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('User menu'));
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('navigates to /settings when Profile is clicked', () => {
    render(<TopBar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('User menu'));
    fireEvent.click(screen.getByText('Profile'));
    expect(mockPush).toHaveBeenCalledWith('/settings');
  });

  it('navigates to /settings when Settings is clicked', () => {
    render(<TopBar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('User menu'));
    fireEvent.click(screen.getByText('Settings'));
    expect(mockPush).toHaveBeenCalledWith('/settings');
  });

  it('navigates to /login when Logout is clicked', () => {
    render(<TopBar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('User menu'));
    fireEvent.click(screen.getByText('Logout'));
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
