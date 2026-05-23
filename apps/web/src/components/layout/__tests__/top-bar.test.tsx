import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockPush = jest.fn();
const mockPathname = jest.fn(() => '/dashboard');

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname(),
}));

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

jest.mock('@/stores/auth-store', () => ({
  useAuthStore: jest.fn(),
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
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

const mockUser = {
  id: 'user-1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
};

const mockNotifications = {
  count: 3,
  data: [
    {
      id: 'notif-1',
      title: 'High Temperature Alert',
      message: 'Device sensor-1 exceeded threshold',
      type: 'ALERT',
      createdAt: '2024-01-15T10:30:00Z',
      isRead: false,
    },
    {
      id: 'notif-2',
      title: 'Device Offline',
      message: 'Device sensor-2 went offline',
      type: 'ALERT',
      createdAt: '2024-01-15T10:25:00Z',
      isRead: false,
    },
    {
      id: 'notif-3',
      title: 'Firmware Update',
      message: 'New firmware available',
      type: 'SYSTEM',
      createdAt: '2024-01-15T10:20:00Z',
      isRead: false,
    },
  ],
};

const mockGet = apiClient.get as jest.Mock;
const mockUseAuthStore = useAuthStore as jest.Mock;

describe('TopBar', () => {
  const defaultProps = { onToggleSidebar: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname.mockReturnValue('/dashboard');
    // Default: return user + notifications
    mockUseAuthStore.mockImplementation((selector: any) => {
      const state = {
        user: mockUser,
        logout: jest.fn(),
      };
      return selector(state);
    });
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/notifications/unread-count')) {
        return Promise.resolve({ count: 3 });
      }
      if (url.includes('/notifications')) {
        return Promise.resolve({ data: mockNotifications.data });
      }
      return Promise.resolve(null);
    });
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

  it('opens notifications panel when bell is clicked', async () => {
    render(<TopBar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Notifications'));
    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
  });

  it('shows notification items when panel is open', async () => {
    render(<TopBar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Notifications'));
    await waitFor(() => {
      expect(screen.getByText('High Temperature Alert')).toBeInTheDocument();
      expect(screen.getByText('Device Offline')).toBeInTheDocument();
      expect(screen.getByText('Firmware Update')).toBeInTheDocument();
    });
  });

  it('opens user dropdown when user button is clicked', async () => {
    render(<TopBar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('User menu'));
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  it('navigates to /settings when Profile is clicked', async () => {
    render(<TopBar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('User menu'));
    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Profile'));
    expect(mockPush).toHaveBeenCalledWith('/settings');
  });

  it('navigates to /settings when Settings is clicked', async () => {
    render(<TopBar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('User menu'));
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Settings'));
    expect(mockPush).toHaveBeenCalledWith('/settings');
  });

  it('navigates to /login when Logout is clicked', async () => {
    const mockLogout = jest.fn();
    mockUseAuthStore.mockImplementation((selector: any) => {
      const state = {
        user: mockUser,
        logout: mockLogout,
      };
      return selector(state);
    });
    render(<TopBar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('User menu'));
    await waitFor(() => {
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Logout'));
    expect(mockLogout).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
